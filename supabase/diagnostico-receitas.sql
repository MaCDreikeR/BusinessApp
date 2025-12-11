-- ============================================================================
-- DIAGNÓSTICO: Comandas e Receitas
-- ============================================================================

-- 1. Ver todas as comandas e seus status
SELECT 
  id,
  status,
  valor_total,
  data_abertura,
  data_fechamento,
  estabelecimento_id
FROM comandas
ORDER BY data_abertura DESC;

-- 2. Contar comandas por status
SELECT 
  status,
  COUNT(*) as total,
  SUM(valor_total::numeric) as receita_total
FROM comandas
GROUP BY status
ORDER BY total DESC;

-- 3. Comandas fechadas (que contam na receita)
SELECT 
  COUNT(*) as total_fechadas,
  SUM(valor_total::numeric) as receita_total_historica,
  MIN(data_fechamento) as primeira_fechada,
  MAX(data_fechamento) as ultima_fechada
FROM comandas
WHERE status = 'fechada';

-- 4. Comandas fechadas em DEZEMBRO/2025
SELECT 
  COUNT(*) as total_mes_atual,
  SUM(valor_total::numeric) as receita_dezembro_2025
FROM comandas
WHERE status = 'fechada'
  AND data_fechamento >= '2025-12-01'
  AND data_fechamento < '2026-01-01';

-- 5. Comandas abertas (não contam na receita)
SELECT 
  COUNT(*) as total_abertas,
  SUM(valor_total::numeric) as valor_pendente
FROM comandas
WHERE status = 'aberta';

-- 6. Ver detalhes da única comanda que existe
SELECT 
  id,
  numero,
  status,
  valor_total,
  data_abertura,
  data_fechamento,
  estabelecimento_id,
  created_at
FROM comandas
LIMIT 5;
