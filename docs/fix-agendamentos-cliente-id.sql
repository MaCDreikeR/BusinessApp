-- Script para verificar e corrigir agendamentos sem cliente_id
-- Execute este script no Supabase SQL Editor

-- 1. Verificar agendamentos sem cliente_id mas com nome de cliente
SELECT 
  a.id,
  a.cliente,
  a.cliente_id,
  c.id as cliente_id_encontrado,
  c.telefone as telefone_cliente
FROM agendamentos a
LEFT JOIN clientes c ON LOWER(c.nome) = LOWER(a.cliente) AND c.estabelecimento_id = a.estabelecimento_id
WHERE a.cliente_id IS NULL
  AND a.cliente IS NOT NULL
  AND a.cliente != ''
ORDER BY a.data_hora DESC
LIMIT 20;

-- 2. Atualizar agendamentos com cliente_id quando possível (execute apenas se confirmado acima)
-- ATENÇÃO: Descomente as linhas abaixo apenas se quiser aplicar a correção

-- UPDATE agendamentos a
-- SET cliente_id = c.id
-- FROM clientes c
-- WHERE a.cliente_id IS NULL
--   AND a.cliente IS NOT NULL
--   AND a.cliente != ''
--   AND LOWER(c.nome) = LOWER(a.cliente)
--   AND c.estabelecimento_id = a.estabelecimento_id;

-- 3. Verificar resultado (execute após o UPDATE)
-- SELECT 
--   COUNT(*) FILTER (WHERE cliente_id IS NULL) as sem_cliente_id,
--   COUNT(*) FILTER (WHERE cliente_id IS NOT NULL) as com_cliente_id,
--   COUNT(*) as total
-- FROM agendamentos
-- WHERE estabelecimento_id = 'SEU_ESTABELECIMENTO_ID';
