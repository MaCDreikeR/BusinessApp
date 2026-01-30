-- Migration: Adicionar coluna cliente_id à tabela agendamentos
-- Data: 2026-01-29
-- Descrição: Adiciona relacionamento direto entre agendamentos e clientes

-- 1. Adicionar a coluna cliente_id (pode ser NULL inicialmente)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS cliente_id UUID;

-- 2. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id 
ON agendamentos(cliente_id);

-- 3. Popular a coluna com base no nome do cliente existente
-- Isso vai vincular agendamentos aos clientes pelo nome
UPDATE agendamentos a
SET cliente_id = c.id
FROM clientes c
WHERE a.cliente_id IS NULL
  AND a.cliente IS NOT NULL
  AND a.cliente != ''
  AND LOWER(TRIM(c.nome)) = LOWER(TRIM(a.cliente))
  AND c.estabelecimento_id = a.estabelecimento_id;

-- 4. Adicionar foreign key constraint (opcional, mas recomendado)
ALTER TABLE agendamentos
ADD CONSTRAINT fk_agendamentos_cliente
FOREIGN KEY (cliente_id) 
REFERENCES clientes(id)
ON DELETE SET NULL;

-- 5. Verificar resultados
SELECT 
  COUNT(*) FILTER (WHERE cliente_id IS NULL) as sem_cliente_id,
  COUNT(*) FILTER (WHERE cliente_id IS NOT NULL) as com_cliente_id,
  COUNT(*) as total
FROM agendamentos;

-- 6. Mostrar agendamentos que não foram vinculados (para análise)
SELECT 
  id,
  cliente,
  data_hora,
  estabelecimento_id
FROM agendamentos
WHERE cliente_id IS NULL
  AND cliente IS NOT NULL
  AND cliente != ''
ORDER BY data_hora DESC
LIMIT 20;
