-- Script de auditoria: Verificar estrutura da tabela agendamentos
-- Execute no Supabase SQL Editor

-- 1. Ver estrutura completa da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'agendamentos'
ORDER BY ordinal_position;

-- 2. Ver constraints e foreign keys
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'agendamentos';

-- 3. Ver índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agendamentos';
