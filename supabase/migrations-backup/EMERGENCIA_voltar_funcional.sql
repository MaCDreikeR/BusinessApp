-- EMERGÊNCIA: VOLTAR ÀS POLÍTICAS FUNCIONAIS IMEDIATAMENTE
-- Execute no SQL Editor do Supabase Studio

-- 1. Desabilitar RLS
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Remover a política problemática
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 3. Recriar a política ORIGINAL que funcionava
CREATE POLICY "Leitura: super_admin ou membros do estabelecimento"
ON usuarios FOR SELECT
TO public
USING (
  (role = 'super_admin') 
  OR 
  (id = auth.uid())
);

-- 4. Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;