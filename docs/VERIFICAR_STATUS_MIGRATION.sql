-- ============================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================

-- 1. Ver estatísticas de vinculação
SELECT 
  COUNT(*) as total_agendamentos,
  COUNT(cliente_id) as com_cliente_id,
  COUNT(*) - COUNT(cliente_id) as sem_cliente_id,
  ROUND(100.0 * COUNT(cliente_id) / NULLIF(COUNT(*), 0), 2) as percentual_vinculado
FROM agendamentos;

-- 2. Ver últimos agendamentos com telefone
SELECT 
  a.id,
  a.cliente as nome,
  a.cliente_id,
  c.telefone,
  a.data_hora,
  a.status
FROM agendamentos a
LEFT JOIN clientes c ON c.id = a.cliente_id
ORDER BY a.data_hora DESC
LIMIT 10;

-- 3. Verificar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agendamentos'
  AND indexname LIKE '%cliente%';

-- 4. Verificar constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'agendamentos'
  AND constraint_name LIKE '%cliente%';

-- 5. Mostrar agendamentos sem cliente_id (para análise)
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
