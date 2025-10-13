-- Execute este comando no SQL Editor do Supabase Studio
-- para verificar se o usuário "Borges" realmente existe

-- 1. Desabilitar RLS temporariamente
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Verificar TODOS os usuários (como admin)
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  role,
  is_principal,
  created_at
FROM usuarios 
WHERE email LIKE '%fofo%' OR nome_completo ILIKE '%borges%'
ORDER BY created_at DESC;

-- 3. Ver todos os usuários
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  role,
  is_principal,
  created_at
FROM usuarios 
ORDER BY created_at DESC;

-- 4. Reabilitar RLS (IMPORTANTE - execute após o teste)
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;