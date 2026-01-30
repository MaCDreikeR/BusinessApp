-- Verificar o agendamento da Thamara no banco (ANTES da migration)
-- NOTA: A coluna cliente_id ainda não existe, por isso vamos verificar apenas cliente
SELECT 
  id,
  cliente,
  data_hora,
  status,
  estabelecimento_id,
  usuario_id
FROM agendamentos 
WHERE cliente ILIKE '%Thamara%'
ORDER BY data_hora DESC
LIMIT 5;

-- Verificar se existe um cliente Thamara
SELECT 
  id,
  nome,
  telefone,
  estabelecimento_id
FROM clientes 
WHERE nome ILIKE '%Thamara%'
LIMIT 5;

-- ====================================
-- DEPOIS de executar a migration acima, rode este comando:
-- ====================================
-- SELECT 
--   a.id,
--   a.cliente,
--   a.cliente_id,
--   c.nome as cliente_nome_real,
--   c.telefone as cliente_telefone,
--   a.data_hora,
--   a.status
-- FROM agendamentos a
-- LEFT JOIN clientes c ON c.id = a.cliente_id
-- WHERE a.cliente ILIKE '%Thamara%'
-- ORDER BY a.data_hora DESC
-- LIMIT 5;
