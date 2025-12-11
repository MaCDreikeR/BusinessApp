-- Verificar políticas de Row Level Security (RLS) nas tabelas principais
-- Execute este script no Supabase SQL Editor para diagnosticar problemas de permissão

-- 1. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'usuarios', 'estabelecimentos', 'agendamentos', 'comandas', 'produtos', 'servicos')
ORDER BY tablename;

-- 2. Listar todas as políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as comando,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'usuarios', 'estabelecimentos', 'agendamentos', 'comandas', 'produtos', 'servicos')
ORDER BY tablename, policyname;

-- 3. Verificar o role atual e suas permissões
SELECT current_user, current_role;

-- 4. Testar acesso direto à tabela clientes (deve mostrar os 4 clientes)
SELECT 
  id,
  nome,
  telefone,
  estabelecimento_id,
  created_at
FROM clientes
ORDER BY created_at DESC;

-- 5. Contar clientes por estabelecimento
SELECT 
  estabelecimento_id,
  COUNT(*) as total_clientes
FROM clientes
GROUP BY estabelecimento_id
ORDER BY total_clientes DESC;

-- 6. Verificar se há clientes sem estabelecimento_id
SELECT COUNT(*) as clientes_sem_estabelecimento
FROM clientes
WHERE estabelecimento_id IS NULL;

-- 7. Testar a mesma query que o dashboard usa
SELECT COUNT(*) as total_clientes_global
FROM clientes;

-- 8. Verificar grants/permissões na tabela
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'clientes';
