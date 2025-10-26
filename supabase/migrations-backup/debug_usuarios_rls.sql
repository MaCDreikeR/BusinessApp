-- Script para debug das políticas RLS na tabela usuarios
-- Execute este script no SQL Editor do Supabase Studio

-- 1. Verificar todos os usuários sem aplicar RLS (como super admin)
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  role,
  is_principal,
  faz_atendimento,
  created_at
FROM usuarios 
ORDER BY created_at DESC;

-- 2. Verificar as políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'usuarios';

-- 3. Testar consulta como usuário específico
-- (Execute isso logado como a usuária Thamara no app)
-- SELECT * FROM usuarios WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e';

-- 4. Verificar se há conflito nas políticas
-- Listar todas as políticas que podem afetar a leitura
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'usuarios' 
AND cmd = 'SELECT';