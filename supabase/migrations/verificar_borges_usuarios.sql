-- Verificar se o usuário Borges existe na tabela usuarios
-- Execute no SQL Editor do Supabase Studio

-- 1. Desabilitar RLS temporariamente para ver tudo
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Buscar o usuário Borges na tabela usuarios
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  role,
  is_principal,
  faz_atendimento,
  created_at,
  updated_at
FROM usuarios 
WHERE id = '3f09a534-8bd7-4534-9b53-60eb341ca1f3';

-- 3. Se não existir, vamos criar manualmente
-- (Execute só se a query acima não retornar nada)
/*
INSERT INTO usuarios (
  id,
  nome_completo,
  email,
  telefone,
  role,
  estabelecimento_id,
  is_principal,
  faz_atendimento,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  '3f09a534-8bd7-4534-9b53-60eb341ca1f3',
  'borges',
  'fofopereira@gmail.com',
  '12982977421',
  'funcionario',
  '86592b4b-9872-4d52-a6bb-6458d8f53f5e',
  false,
  true,
  null,
  '2025-10-13 16:56:33.588+00',
  '2025-10-13 16:56:38.817491+00'
);
*/

-- 4. Verificar todos os usuários para confirmar
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  role,
  is_principal
FROM usuarios 
ORDER BY created_at DESC;

-- 5. Reabilitar RLS (IMPORTANTE)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;