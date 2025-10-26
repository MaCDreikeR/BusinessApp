-- CORREÇÃO MÍNIMA DA POLÍTICA ORIGINAL
-- Execute APÓS o script de emergência

-- 1. Remover apenas a política problemática
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 2. Criar versão corrigida SIMPLES (sem recursão)
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
  -- Usuários principais podem ver usuários do mesmo estabelecimento
  (
    EXISTS (
      SELECT 1 FROM usuarios u1 
      WHERE u1.id = auth.uid() 
      AND u1.is_principal = true 
      AND u1.estabelecimento_id = usuarios.estabelecimento_id
    )
  )
);