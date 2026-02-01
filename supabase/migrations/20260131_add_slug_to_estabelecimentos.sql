-- ============================================
-- Migration: Adicionar coluna slug à tabela estabelecimentos
-- Data: 2026-01-31
-- Descrição: Adiciona slug único para identificação pública
-- ============================================

-- 1️⃣ Adicionar coluna slug (permitindo NULL inicialmente para não quebrar registros existentes)
ALTER TABLE estabelecimentos 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2️⃣ Adicionar comentário explicativo
COMMENT ON COLUMN estabelecimentos.slug IS 'Identificador único público do estabelecimento usado em URLs (ex: /salaoemillyborges)';

-- 3️⃣ Criar índice único parcial (ignora NULLs para permitir preenchimento gradual)
CREATE UNIQUE INDEX IF NOT EXISTS idx_estabelecimentos_slug_unique 
ON estabelecimentos(slug) 
WHERE slug IS NOT NULL;

-- 4️⃣ Criar índice para consultas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_slug_lookup 
ON estabelecimentos(slug);

-- ============================================
-- ⚠️ IMPORTANTE: Após executar esta migration, rodar o script de preenchimento
-- antes de tornar o campo obrigatório (NOT NULL)
-- ============================================
