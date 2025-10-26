-- ALTERAÇÃO CIRÚRGICA 1: POLÍTICA DE LEITURA
-- Permitir que usuários do mesmo estabelecimento se vejam
-- Execute no SQL Editor do Supabase Studio

-- 1. Remover apenas a política de leitura atual
DROP POLICY "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 2. Recriar com a lógica correta
CREATE POLICY "Leitura: super_admin ou membros do estabelecimento"
ON usuarios FOR SELECT
TO public
USING (
  -- Super admin pode ver qualquer usuário
  (role = 'super_admin') 
  OR 
  -- Usuário pode ver seu próprio perfil
  (id = auth.uid())
  OR
  -- Usuários do mesmo estabelecimento podem se ver
  (estabelecimento_id IN (
    SELECT u.estabelecimento_id 
    FROM usuarios u 
    WHERE u.id = auth.uid()
  ))
);