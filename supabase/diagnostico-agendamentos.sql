-- ============================================================================
-- DIAGNÓSTICO: Verificar agendamentos
-- ============================================================================

-- 1. Contar TODOS os agendamentos (sem filtro)
SELECT COUNT(*) as total_agendamentos_geral FROM agendamentos;

-- 2. Ver amostra dos agendamentos
SELECT 
  id,
  cliente_id,
  estabelecimento_id,
  data_hora,
  status,
  created_at
FROM agendamentos
ORDER BY created_at DESC
LIMIT 10;

-- 3. Contar agendamentos por estabelecimento
SELECT 
  estabelecimento_id,
  COUNT(*) as total,
  MIN(data_hora) as primeiro_agendamento,
  MAX(data_hora) as ultimo_agendamento
FROM agendamentos
GROUP BY estabelecimento_id
ORDER BY total DESC;

-- 4. Contar agendamentos de HOJE (mesma query que o dashboard)
SELECT COUNT(*) as agendamentos_hoje
FROM agendamentos
WHERE data_hora >= CURRENT_DATE
  AND data_hora < CURRENT_DATE + INTERVAL '1 day';

-- 5. Ver status dos agendamentos
SELECT 
  status,
  COUNT(*) as total
FROM agendamentos
GROUP BY status
ORDER BY total DESC;

-- 6. Verificar se há agendamentos sem estabelecimento_id
SELECT COUNT(*) as agendamentos_sem_estabelecimento
FROM agendamentos
WHERE estabelecimento_id IS NULL;

-- 7. Listar políticas RLS da tabela agendamentos
SELECT 
  policyname,
  cmd as comando,
  qual as condicao_using
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'agendamentos'
ORDER BY policyname;
