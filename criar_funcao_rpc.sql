-- SOLUÇÃO DEFINITIVA: CRIAR FUNÇÃO RPC PARA CONTORNAR RLS
-- Execute no SQL Editor do Supabase Studio

-- 1. Criar função para buscar usuários do mesmo estabelecimento
CREATE OR REPLACE FUNCTION get_usuarios_estabelecimento(estabelecimento_uuid uuid)
RETURNS TABLE (
  id uuid,
  nome_completo text,
  email text,
  telefone text,
  is_principal boolean,
  avatar_url text,
  created_at timestamptz,
  role text,
  faz_atendimento boolean,
  estabelecimento_id uuid
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o usuário logado tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.role = 'super_admin' 
      OR u.is_principal = true 
      OR u.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Retornar usuários do estabelecimento
  RETURN QUERY
  SELECT 
    u.id,
    u.nome_completo,
    u.email,
    u.telefone,
    u.is_principal,
    u.avatar_url,
    u.created_at,
    u.role,
    u.faz_atendimento,
    u.estabelecimento_id
  FROM usuarios u
  WHERE u.estabelecimento_id = estabelecimento_uuid
  ORDER BY u.created_at DESC;
END;
$$;

-- 2. Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_usuarios_estabelecimento(uuid) TO authenticated;