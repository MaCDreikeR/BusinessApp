-- ============================================
-- Migration: Corrigir RPC criar_nova_conta para gerar slug
-- Data: 2026-03-02
-- Descrição: Atualizar função para gerar slug automaticamente ao criar novo estabelecimento
-- ============================================

-- Função auxiliar para remover acentos (fallback without unaccent extension)
CREATE OR REPLACE FUNCTION remover_acentos_manual(texto TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(LOWER(texto), '[àáâãäå]', 'a', 'g'), 
                  '[èéêë]', 'e', 'g'),
                '[ìíîï]', 'i', 'g'),
              '[òóôõö]', 'o', 'g'),
            '[ùúûü]', 'u', 'g'),
          '[ç]', 'c', 'g'),
        '[ñ]', 'n', 'g'),
      '[^a-z0-9\s]', '', 'g'),
    '\s+', '-', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para gerar slug base
CREATE OR REPLACE FUNCTION gerar_slug_base(texto TEXT) 
RETURNS TEXT AS $$
DECLARE
  resultado TEXT;
BEGIN
  IF texto IS NULL OR texto = '' THEN
    RETURN '';
  END IF;
  
  resultado := TRIM(LOWER(texto));
  resultado := remover_acentos_manual(resultado);
  resultado := SUBSTRING(resultado FROM 1 FOR 100);
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para gerar slug único (com tratamento de conflitos)
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
  
  SELECT EXISTS(
    SELECT 1 FROM estabelecimentos 
    WHERE slug = slug_candidato 
    AND id != estabelecimento_id
  ) INTO existe;
  
  WHILE existe LOOP
    contador := contador + 1;
    slug_candidato := slug_base || '-' || contador;
    
    SELECT EXISTS(
      SELECT 1 FROM estabelecimentos 
      WHERE slug = slug_candidato 
      AND id != estabelecimento_id
    ) INTO existe;
    
    IF contador > 1000 THEN
      slug_candidato := slug_base || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN slug_candidato;
END;
$$ LANGUAGE plpgsql;

-- Atualizar a função RPC criar_nova_conta
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
  -- Gerar nova ID para o estabelecimento
  novo_estabelecimento_id := gen_random_uuid();
  
  -- Gerar slug único
  novo_slug := gerar_slug_unico(p_nome_estabelecimento, novo_estabelecimento_id);
  
  -- Passo 1: Insere o novo estabelecimento com o slug gerado
  INSERT INTO public.estabelecimentos (id, nome, tipo_documento, numero_documento, segmento, slug, status)
  VALUES (novo_estabelecimento_id, p_nome_estabelecimento, p_tipo_documento, p_numero_documento, p_segmento, novo_slug, 'ativa');

  -- Passo 2: Insere o perfil do usuário (principal/admin do estabelecimento)
  INSERT INTO public.usuarios (id, nome_completo, email, telefone, is_principal, estabelecimento_id, role)
  VALUES (
    p_usuario_id,
    p_nome_usuario,
    p_email,
    p_telefone,
    true, 
    novo_estabelecimento_id,
    'admin'
  );
  
  -- Log da atividade
  INSERT INTO public.logs_atividade (usuario_id, estabelecimento_id, acao, descricao)
  VALUES (p_usuario_id, novo_estabelecimento_id, 'criar_conta', 'Nova conta criada: ' || p_nome_estabelecimento);
  
END;
$$;

-- Re-grant permissions
GRANT ALL ON FUNCTION "public"."criar_nova_conta"(
  "p_nome_estabelecimento" "text", 
  "p_tipo_documento" "text", 
  "p_numero_documento" "text", 
  "p_telefone" "text", 
  "p_segmento" "text", 
  "p_nome_usuario" "text", 
  "p_email" "text", 
  "p_usuario_id" "uuid"
) TO "anon", "authenticated", "service_role";
