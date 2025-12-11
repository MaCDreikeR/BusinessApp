-- Script para verificar dados existentes no banco
-- Execute no Supabase SQL Editor

-- 1. Verificar quantidade de registros em cada tabela
SELECT 
  'estabelecimentos' as tabela, 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativos
FROM estabelecimentos
UNION ALL
SELECT 
  'usuarios' as tabela, 
  COUNT(*) as total,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins
FROM usuarios
UNION ALL
SELECT 
  'clientes' as tabela, 
  COUNT(*) as total,
  COUNT(DISTINCT estabelecimento_id) as estabelecimentos_com_clientes
FROM clientes
UNION ALL
SELECT 
  'produtos' as tabela, 
  COUNT(*) as total,
  COUNT(DISTINCT estabelecimento_id) as estabelecimentos_com_produtos
FROM produtos
UNION ALL
SELECT 
  'servicos' as tabela, 
  COUNT(*) as total,
  COUNT(DISTINCT estabelecimento_id) as estabelecimentos_com_servicos
FROM servicos
UNION ALL
SELECT 
  'agendamentos' as tabela, 
  COUNT(*) as total,
  COUNT(DISTINCT estabelecimento_id) as estabelecimentos_com_agendamentos
FROM agendamentos
UNION ALL
SELECT 
  'comandas' as tabela, 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'fechada' THEN 1 END) as finalizadas
FROM comandas;

-- 2. Detalhes por estabelecimento
SELECT 
  e.id,
  e.nome,
  e.status,
  e.created_at,
  (SELECT COUNT(*) FROM usuarios WHERE estabelecimento_id = e.id) as total_usuarios,
  (SELECT COUNT(*) FROM clientes WHERE estabelecimento_id = e.id) as total_clientes,
  (SELECT COUNT(*) FROM produtos WHERE estabelecimento_id = e.id) as total_produtos,
  (SELECT COUNT(*) FROM servicos WHERE estabelecimento_id = e.id) as total_servicos,
  (SELECT COUNT(*) FROM agendamentos WHERE estabelecimento_id = e.id) as total_agendamentos,
  (SELECT COUNT(*) FROM comandas WHERE estabelecimento_id = e.id) as total_comandas
FROM estabelecimentos e
ORDER BY e.created_at DESC;

-- 3. Verificar se há clientes sem estabelecimento_id (problema de migração)
SELECT COUNT(*) as clientes_sem_estabelecimento
FROM clientes
WHERE estabelecimento_id IS NULL;

-- 4. Verificar estabelecimento_id nos clientes
SELECT 
  COALESCE(c.estabelecimento_id::text, 'NULL') as estabelecimento_id,
  COUNT(*) as total_clientes,
  e.nome as nome_estabelecimento
FROM clientes c
LEFT JOIN estabelecimentos e ON e.id = c.estabelecimento_id
GROUP BY c.estabelecimento_id, e.nome
ORDER BY total_clientes DESC;
