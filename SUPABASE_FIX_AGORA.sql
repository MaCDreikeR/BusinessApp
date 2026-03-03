-- ============================================
-- SCRIPT DE CORREÇÃO: FORCE RECREATE FUNCTIONS
-- Executa AGORA no Supabase SQL Editor
-- ============================================

-- DROP das funções antigas (força recriação)
DROP FUNCTION IF EXISTS public.criar_nova_conta(text, text, text, text, text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.auth_user_exists(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.email_ja_cadastrado(text) CASCADE;
DROP FUNCTION IF EXISTS public.gerar_slug_unico(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.gerar_slug_base(text) CASCADE;
DROP FUNCTION IF EXISTS public.remover_acentos_manual(text) CASCADE;

-- ============================================
-- Função 1: Remover acentos (sem espaços, sem hífens)
-- ============================================
CREATE OR REPLACE FUNCTION remover_acentos_manual(texto TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Usar TRANSLATE para substituir acentos
  RETURN REGEXP_REPLACE(
    LOWER(
      TRANSLATE(texto,
        'àáâãäåèéêëìíîïòóôõöùúûüçñ',
        'aaaaaaaeeeeiiiiooooouuuucn')
    ),
    '[^a-z0-9]', 
    '', 
    'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Função 2: Gerar slug base
-- ============================================
CREATE OR REPLACE FUNCTION gerar_slug_base(texto TEXT) 
RETURNS TEXT AS $$
DECLARE
  resultado TEXT;
BEGIN
  IF texto IS NULL OR texto = '' THEN
    RETURN 'estabelecimento';
  END IF;
  
  resultado := TRIM(LOWER(texto));
  resultado := remover_acentos_manual(resultado);
  resultado := SUBSTRING(resultado FROM 1 FOR 100);
  
  IF resultado = '' OR resultado IS NULL THEN
    RETURN 'estabelecimento';
  END IF;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Função 3: Gerar slug único (com tratamento de conflicts)
-- ============================================
CREATE OR REPLACE FUNCTION gerar_slug_unico(nome_estabelecimento TEXT, estabelecimento_id UUID) 
RETURNS TEXT AS $$
DECLARE
  slug_base TEXT;
  slug_candidato TEXT;
  contador INTEGER := 1;
  existe BOOLEAN;
BEGIN
  slug_base := gerar_slug_base(nome_estabelecimento);
  
  IF slug_base = '' OR slug_base IS NULL THEN
    slug_base := 'estabelecimento';
  END IF;
  
  slug_candidato := slug_base;
  
  -- Verificar se slug_base já existe
  SELECT EXISTS(
    SELECT 1 FROM estabelecimentos 
    WHERE slug = slug_candidato 
    AND id != estabelecimento_id
  ) INTO existe;
  
  -- Se existir, adicionar número incremental (SEM HÍFEN)
  WHILE existe LOOP
    contador := contador + 1;
    slug_candidato := slug_base || contador;  -- thamaranascimento2, SEM hífen
    
    SELECT EXISTS(
      SELECT 1 FROM estabelecimentos 
      WHERE slug = slug_candidato 
      AND id != estabelecimento_id
    ) INTO existe;
    
    IF contador > 1000 THEN
      slug_candidato := slug_base || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN slug_candidato;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Função 3.1: verificar se usuário existe em auth.users
-- ============================================
CREATE OR REPLACE FUNCTION public.auth_user_exists(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id);
$$;

-- ============================================
-- Função 3.2: verificar se email já existe (auth + usuarios)
-- ============================================
CREATE OR REPLACE FUNCTION public.email_ja_cadastrado(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM auth.users au
    WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(p_email))
  )
  OR EXISTS(
    SELECT 1
    FROM public.usuarios u
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
  );
$$;

-- ============================================
-- Função 4: RPC criar_nova_conta (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION "public"."criar_nova_conta"(
  "p_nome_estabelecimento" "text",
  "p_tipo_documento" "text",
  "p_numero_documento" "text",
  "p_telefone" "text",
  "p_segmento" "text",
  "p_nome_usuario" "text",
  "p_email" "text",
  "p_usuario_id" "uuid"
) RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  novo_estabelecimento_id uuid;
  novo_slug text;
BEGIN
  novo_estabelecimento_id := gen_random_uuid();
  novo_slug := gerar_slug_unico(p_nome_estabelecimento, novo_estabelecimento_id);
  
  INSERT INTO public.estabelecimentos (id, nome, tipo_documento, numero_documento, segmento, slug, status)
  VALUES (novo_estabelecimento_id, p_nome_estabelecimento, p_tipo_documento, p_numero_documento, p_segmento, novo_slug, 'ativa');

  INSERT INTO public.usuarios (id, nome_completo, email, telefone, is_principal, estabelecimento_id, role)
  VALUES (p_usuario_id, p_nome_usuario, p_email, p_telefone, true, novo_estabelecimento_id, 'admin');

  BEGIN
    INSERT INTO public.logs_atividade (usuario_id, estabelecimento_id, acao, descricao)
    VALUES (p_usuario_id, novo_estabelecimento_id, 'criar_conta', 'Nova conta criada: ' || p_nome_estabelecimento);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION "public"."criar_nova_conta"("text", "text", "text", "text", "text", "text", "text", "uuid") 
  TO "anon", "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION public.auth_user_exists(uuid)
  TO "anon", "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION public.email_ja_cadastrado(text)
  TO "anon", "authenticated", "service_role";

-- ✅ SCRIPT COMPLETO!
