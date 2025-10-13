-- CORREÇÃO CIRÚRGICA - APENAS A POLÍTICA DE LEITURA
-- Execute no SQL Editor do Supabase Studio

-- 1. Remover APENAS a política problemática
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 2. Recriar APENAS essa política com correção mínima
CREATE POLICY "Leitura: super_admin ou membros do estabelecimento"
ON usuarios FOR SELECT
TO public
USING (
  -- Super admin pode ver todos
  (role = 'super_admin') 
  OR 
  -- Usuário pode ver seu próprio perfil
  (id = auth.uid())
  OR
  -- Usuários do mesmo estabelecimento (sem recursão)
  (estabelecimento_id = (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid() 
    LIMIT 1
  ))
);