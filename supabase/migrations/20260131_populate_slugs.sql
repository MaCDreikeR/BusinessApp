-- ============================================
-- Script: Preencher slugs para estabelecimentos existentes
-- Data: 2026-01-31
-- Descrição: Gera slug único para todos os registros que não possuem slug
-- ============================================

-- Habilitar extensão unaccent (se disponível, ignorar erro se não tiver permissão)
DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Extensão unaccent não disponível, usando alternativa';
END $$;

-- Função auxiliar para remover acentos (fallback sem extensão unaccent)
CREATE OR REPLACE FUNCTION remover_acentos_manual(texto TEXT) 
RETURNS TEXT AS $$
DECLARE
  resultado TEXT;
BEGIN
  resultado := texto;
  
  -- Substituir cada grupo de vogais acentuadas
  resultado := REGEXP_REPLACE(resultado, '[àáâãäå]', 'a', 'gi');
  resultado := REGEXP_REPLACE(resultado, '[èéêë]', 'e', 'gi');
  resultado := REGEXP_REPLACE(resultado, '[ìíîï]', 'i', 'gi');
  resultado := REGEXP_REPLACE(resultado, '[òóôõö]', 'o', 'gi');
  resultado := REGEXP_REPLACE(resultado, '[ùúûü]', 'u', 'gi');
  
  -- Consoantes especiais
  resultado := REGEXP_REPLACE(resultado, '[ç]', 'c', 'gi');
  resultado := REGEXP_REPLACE(resultado, '[ñ]', 'n', 'gi');
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função auxiliar para gerar slug base (sem acentos, lowercase, apenas letras/números/hífen)
CREATE OR REPLACE FUNCTION gerar_slug_base(texto TEXT) 
RETURNS TEXT AS $$
DECLARE
  slug_resultado TEXT;
BEGIN
  -- Remover espaços no início e fim
  slug_resultado := TRIM(texto);
  
  -- Converter para lowercase
  slug_resultado := LOWER(slug_resultado);
  
  -- Remover acentos (tentar unaccent, se não funcionar usar alternativa manual)
  BEGIN
    slug_resultado := unaccent(slug_resultado);
  EXCEPTION
    WHEN undefined_function THEN
      slug_resultado := remover_acentos_manual(slug_resultado);
  END;
  
  -- Remover todos os espaços (sem substituir por hífen, apenas remover)
  slug_resultado := REGEXP_REPLACE(slug_resultado, '\s+', '', 'g');
  
  -- Remover caracteres especiais (manter apenas letras e números)
  slug_resultado := REGEXP_REPLACE(slug_resultado, '[^a-z0-9]', '', 'g');
  
  -- Limitar tamanho (máximo 100 caracteres)
  slug_resultado := SUBSTRING(slug_resultado FROM 1 FOR 100);
  
  RETURN slug_resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Função para gerar slug único (resolve conflitos automaticamente)
-- ============================================
CREATE OR REPLACE FUNCTION gerar_slug_unico(nome_estabelecimento TEXT, estabelecimento_id UUID) 
RETURNS TEXT AS $$
DECLARE
  slug_base TEXT;
  slug_candidato TEXT;
  contador INTEGER := 1;
  existe BOOLEAN;
BEGIN
  -- Gerar slug base
  slug_base := gerar_slug_base(nome_estabelecimento);
  
  -- Se o slug ficou vazio após processamento, usar fallback
  IF slug_base = '' OR slug_base IS NULL THEN
    slug_base := 'estabelecimento';
  END IF;
  
  -- Tentar o slug base primeiro
  slug_candidato := slug_base;
  
  -- Verificar se já existe (ignorando o próprio estabelecimento)
  SELECT EXISTS(
    SELECT 1 FROM estabelecimentos 
    WHERE slug = slug_candidato 
    AND id != estabelecimento_id
  ) INTO existe;
  
  -- Se existir, adicionar número incremental
  WHILE existe LOOP
    contador := contador + 1;
    slug_candidato := slug_base || '-' || contador;
    
    SELECT EXISTS(
      SELECT 1 FROM estabelecimentos 
      WHERE slug = slug_candidato 
      AND id != estabelecimento_id
    ) INTO existe;
    
    -- Proteção contra loop infinito (máximo 1000 tentativas)
    IF contador > 1000 THEN
      slug_candidato := slug_base || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN slug_candidato;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Preencher slugs para estabelecimentos existentes
-- ============================================
DO $$
DECLARE
  rec RECORD;
  novo_slug TEXT;
  total_atualizados INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando preenchimento de slugs...';
  
  -- Processar cada estabelecimento sem slug
  FOR rec IN 
    SELECT id, nome 
    FROM estabelecimentos 
    WHERE slug IS NULL 
    ORDER BY created_at ASC
  LOOP
    -- Gerar slug único
    novo_slug := gerar_slug_unico(rec.nome, rec.id);
    
    -- Atualizar estabelecimento
    UPDATE estabelecimentos 
    SET slug = novo_slug 
    WHERE id = rec.id;
    
    total_atualizados := total_atualizados + 1;
    
    -- Log de progresso a cada 10 registros
    IF total_atualizados % 10 = 0 THEN
      RAISE NOTICE 'Processados % estabelecimentos...', total_atualizados;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Concluído! Total de slugs gerados: %', total_atualizados;
END $$;

-- ============================================
-- Verificar se há duplicatas (não deveria haver)
-- ============================================
SELECT slug, COUNT(*) as total
FROM estabelecimentos
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Se a consulta acima retornar algum resultado, há um problema!

-- ============================================
-- Estatísticas finais
-- ============================================
SELECT 
  COUNT(*) as total_estabelecimentos,
  COUNT(slug) as total_com_slug,
  COUNT(*) - COUNT(slug) as total_sem_slug
FROM estabelecimentos;

-- ============================================
-- ⚠️ PRÓXIMO PASSO: Tornar o campo obrigatório
-- Execute o script: 20260131_make_slug_required.sql
-- ============================================
