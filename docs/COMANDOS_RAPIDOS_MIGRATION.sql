-- ============================================
-- COMANDOS RÁPIDOS - MIGRATION CLIENTE_ID
-- ============================================

-- 🚀 EXECUTAR TUDO (copie e cole no Supabase SQL Editor)
-- ============================================

-- 1. Adicionar coluna
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS cliente_id UUID;

-- 2. Popular dados
UPDATE agendamentos a SET cliente_id = c.id FROM clientes c WHERE a.cliente_id IS NULL AND a.cliente IS NOT NULL AND LOWER(TRIM(c.nome)) = LOWER(TRIM(a.cliente)) AND c.estabelecimento_id = a.estabelecimento_id;

-- 3. Criar índice
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);

-- 4. Adicionar constraint
ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

-- ============================================
-- ✅ VERIFICAR RESULTADO
-- ============================================

SELECT COUNT(*) as total, COUNT(cliente_id) as vinculados, COUNT(*) - COUNT(cliente_id) as pendentes FROM agendamentos;

-- ============================================
-- 🧪 TESTAR AGENDAMENTO DA THAMARA
-- ============================================

SELECT a.id, a.cliente, a.cliente_id, c.telefone, a.data_hora FROM agendamentos a LEFT JOIN clientes c ON c.id = a.cliente_id WHERE a.cliente ILIKE '%Thamara%' ORDER BY a.data_hora DESC LIMIT 5;

-- ============================================
-- 🔄 REVERTER (SE NECESSÁRIO)
-- ============================================

-- ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS fk_agendamentos_cliente;
-- DROP INDEX IF EXISTS idx_agendamentos_cliente_id;
-- ALTER TABLE agendamentos DROP COLUMN IF EXISTS cliente_id;
