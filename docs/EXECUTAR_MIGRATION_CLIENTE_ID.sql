-- ============================================
-- MIGRATION: Adicionar cliente_id aos agendamentos
-- Data: 29/01/2026
-- Autor: Sistema
-- Descrição: Adiciona coluna cliente_id para relacionamento direto com clientes
-- ============================================

-- PASSO 1: Adicionar a coluna (permite NULL temporariamente)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS cliente_id UUID;

-- PASSO 2: Popular a coluna com dados existentes
-- Vincula agendamentos aos clientes pelo nome
UPDATE agendamentos a
SET cliente_id = c.id
FROM clientes c
WHERE a.cliente_id IS NULL
  AND a.cliente IS NOT NULL
  AND a.cliente != ''
  AND LOWER(TRIM(c.nome)) = LOWER(TRIM(a.cliente))
  AND c.estabelecimento_id = a.estabelecimento_id;

-- PASSO 3: Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id 
ON agendamentos(cliente_id);

-- PASSO 4: Adicionar foreign key (garante integridade)
ALTER TABLE agendamentos
ADD CONSTRAINT fk_agendamentos_cliente
FOREIGN KEY (cliente_id) 
REFERENCES clientes(id)
ON DELETE SET NULL;

-- ============================================
-- VERIFICAÇÃO DOS RESULTADOS
-- ============================================

-- Mostrar estatísticas
SELECT 
  COUNT(*) as total_agendamentos,
  COUNT(cliente_id) as com_cliente_id,
  COUNT(*) - COUNT(cliente_id) as sem_cliente_id,
  ROUND(100.0 * COUNT(cliente_id) / COUNT(*), 2) as percentual_vinculado
FROM agendamentos;

-- Mostrar agendamentos não vinculados (se houver)
SELECT 
  id,
  cliente,
  data_hora,
  status
FROM agendamentos
WHERE cliente_id IS NULL
  AND cliente IS NOT NULL
  AND cliente != ''
ORDER BY data_hora DESC
LIMIT 10;

-- Testar join com clientes (deve funcionar agora)
SELECT 
  a.id as agendamento_id,
  a.cliente as nome_no_agendamento,
  c.nome as nome_real_cliente,
  c.telefone,
  a.data_hora,
  a.status
FROM agendamentos a
LEFT JOIN clientes c ON c.id = a.cliente_id
ORDER BY a.data_hora DESC
LIMIT 10;
