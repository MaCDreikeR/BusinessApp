-- ============================================
-- Migration: Tornar coluna slug obrigatória
-- Data: 2026-01-31
-- Descrição: Após preencher todos os slugs, tornar o campo NOT NULL
-- ============================================

-- ⚠️ EXECUTAR ESTE SCRIPT APENAS APÓS:
-- 1. Rodar a migration inicial (20260131_add_slug_to_estabelecimentos.sql)
-- 2. Rodar o script de preenchimento (20260131_populate_slugs.sql)
-- 3. Verificar que TODOS os estabelecimentos têm slug

-- Verificação de segurança antes de prosseguir
DO $$
DECLARE
  total_sem_slug INTEGER;
  rec RECORD;
  novo_slug TEXT;
BEGIN
  SELECT COUNT(*) INTO total_sem_slug
  FROM estabelecimentos
  WHERE slug IS NULL;
  
  IF total_sem_slug > 0 THEN
    RAISE NOTICE 'AVISO: Existem % estabelecimentos sem slug. Preenchendo automaticamente...', total_sem_slug;
    
    -- Preencher slugs faltantes
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
      
      RAISE NOTICE 'Slug gerado para "%": %', rec.nome, novo_slug;
    END LOOP;
    
    RAISE NOTICE 'Todos os slugs foram preenchidos!';
  ELSE
    RAISE NOTICE 'Verificação OK: Todos os estabelecimentos possuem slug';
  END IF;
END $$;

-- 1️⃣ Remover índice parcial antigo
DROP INDEX IF EXISTS idx_estabelecimentos_slug_unique;

-- 2️⃣ Tornar a coluna NOT NULL (verificar se já não está)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'estabelecimentos' 
    AND column_name = 'slug' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE estabelecimentos 
    ALTER COLUMN slug SET NOT NULL;
    RAISE NOTICE 'Coluna slug definida como NOT NULL';
  ELSE
    RAISE NOTICE 'Coluna slug já é NOT NULL';
  END IF;
END $$;

-- 3️⃣ Criar índice único definitivo (sem WHERE)
CREATE UNIQUE INDEX idx_estabelecimentos_slug_unique 
ON estabelecimentos(slug);

-- 4️⃣ Adicionar constraint de validação (garantir formato válido)
-- Remover constraint existente se houver
ALTER TABLE estabelecimentos
DROP CONSTRAINT IF EXISTS check_slug_formato;

ALTER TABLE estabelecimentos
ADD CONSTRAINT check_slug_formato 
CHECK (
  slug ~ '^[a-z0-9]+$' AND    -- apenas letras minúsculas e números (sem hífen)
  LENGTH(slug) >= 3 AND        -- mínimo 3 caracteres
  LENGTH(slug) <= 100          -- máximo 100 caracteres
);

-- 5️⃣ Adicionar trigger para validar slugs futuros
CREATE OR REPLACE FUNCTION validar_slug_antes_insert() 
RETURNS TRIGGER AS $$
BEGIN
  -- Garantir que o slug está em lowercase
  NEW.slug := LOWER(NEW.slug);
  
  -- Garantir que não tem espaços
  IF NEW.slug ~ '\s' THEN
    RAISE EXCEPTION 'Slug não pode conter espaços: %', NEW.slug;
  END IF;
  
  -- Garantir formato válido (apenas letras e números)
  IF NEW.slug !~ '^[a-z0-9]+$' THEN
    RAISE EXCEPTION 'Slug inválido (use apenas letras minúsculas e números): %', NEW.slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_validar_slug ON estabelecimentos;
CREATE TRIGGER trigger_validar_slug
  BEFORE INSERT OR UPDATE OF slug ON estabelecimentos
  FOR EACH ROW
  EXECUTE FUNCTION validar_slug_antes_insert();

-- ============================================
-- Estatísticas finais
-- ============================================
SELECT 
  'Migration concluída!' as status,
  COUNT(*) as total_estabelecimentos,
  COUNT(DISTINCT slug) as slugs_unicos,
  MIN(LENGTH(slug)) as tamanho_minimo,
  MAX(LENGTH(slug)) as tamanho_maximo,
  AVG(LENGTH(slug))::INTEGER as tamanho_medio
FROM estabelecimentos;

-- ============================================
-- ✅ MIGRATION CONCLUÍDA
-- Próximo passo: Implementar lógica no app
-- ============================================
