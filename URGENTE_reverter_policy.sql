-- URGENTE: REVERTER POLICY QUE CAUSOU INFINITE RECURSION
-- Execute IMEDIATAMENTE no SQL Editor do Supabase Studio

-- 1. REMOVER a policy problemática que causou recursão infinita
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 2. RECRIAR a policy original (mais restritiva, mas funcional)
CREATE POLICY "Leitura: super_admin ou membros do estabelecimento" ON usuarios
FOR SELECT USING (
  (role = 'super_admin'::text) 
  OR 
  (id = auth.uid())
);

-- 3. Verificar se voltou ao normal
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios' 
AND policyname = 'Leitura: super_admin ou membros do estabelecimento';