-- ============================================================================
-- EXCLUSÃO COMPLETA DE CONTA (ADMIN)
-- ============================================================================
-- Resolve erro de FK ao excluir estabelecimentos com registros dependentes.
--
-- O que faz:
-- 1) Coleta usuários do estabelecimento
-- 2) Remove tabelas que referenciam public.usuarios (FK simples)
-- 3) Remove tabelas que referenciam public.estabelecimentos (FK simples)
-- 4) Remove public.usuarios do estabelecimento
-- 5) Remove public.estabelecimentos
-- 6) Opcional: remove também auth.users desses usuários
--
-- Execute no SQL Editor do Supabase.

DROP FUNCTION IF EXISTS public.excluir_conta_completa(uuid, boolean);

CREATE OR REPLACE FUNCTION public.excluir_conta_completa(
  p_estabelecimento_id UUID,
  p_remover_auth BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_ids UUID[];
  v_ref RECORD;
  v_deleted_estab INTEGER := 0;
  v_deleted_usuarios INTEGER := 0;
  v_deleted_auth INTEGER := 0;
BEGIN
  IF p_estabelecimento_id IS NULL THEN
    RAISE EXCEPTION 'p_estabelecimento_id é obrigatório';
  END IF;

  SELECT COALESCE(array_agg(u.id), ARRAY[]::UUID[])
    INTO v_user_ids
  FROM public.usuarios u
  WHERE u.estabelecimento_id = p_estabelecimento_id;

  -- 1) Remove dependências de public.usuarios (FK simples)
  IF COALESCE(array_length(v_user_ids, 1), 0) > 0 THEN
    FOR v_ref IN
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        a.attname AS column_name
      FROM pg_constraint k
      JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.conkey[1]
      WHERE k.contype = 'f'
        AND k.confrelid = 'public.usuarios'::regclass
        AND array_length(k.conkey, 1) = 1
        AND NOT (n.nspname = 'public' AND c.relname = 'usuarios')
    LOOP
      EXECUTE format(
        'DELETE FROM %I.%I WHERE %I = ANY ($1)',
        v_ref.schema_name,
        v_ref.table_name,
        v_ref.column_name
      )
      USING v_user_ids;
    END LOOP;
  END IF;

  -- 2) Remove dependências de public.estabelecimentos (FK simples)
  FOR v_ref IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint k
    JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.conkey[1]
    WHERE k.contype = 'f'
      AND k.confrelid = 'public.estabelecimentos'::regclass
      AND array_length(k.conkey, 1) = 1
      AND NOT (n.nspname = 'public' AND c.relname = 'estabelecimentos')
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I = $1',
      v_ref.schema_name,
      v_ref.table_name,
      v_ref.column_name
    )
    USING p_estabelecimento_id;
  END LOOP;

  -- 3) Remove usuários do estabelecimento (garantia extra)
  DELETE FROM public.usuarios
  WHERE estabelecimento_id = p_estabelecimento_id;
  GET DIAGNOSTICS v_deleted_usuarios = ROW_COUNT;

  -- 4) Remove estabelecimento
  DELETE FROM public.estabelecimentos
  WHERE id = p_estabelecimento_id;
  GET DIAGNOSTICS v_deleted_estab = ROW_COUNT;

  IF v_deleted_estab = 0 THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado: %', p_estabelecimento_id;
  END IF;

  -- 5) Opcional: remove auth.users órfãos relacionados
  IF p_remover_auth = true AND COALESCE(array_length(v_user_ids, 1), 0) > 0 THEN
    DELETE FROM auth.users
    WHERE id = ANY (v_user_ids);
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'estabelecimento_id', p_estabelecimento_id,
    'usuarios_removidos', v_deleted_usuarios,
    'auth_users_removidos', v_deleted_auth,
    'estabelecimentos_removidos', v_deleted_estab
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_conta_completa(uuid, boolean)
TO authenticated, service_role;
