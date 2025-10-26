-- ALTERAÇÃO CIRÚRGICA 2: POLÍTICA DE ATUALIZAÇÃO
-- Permitir que is_principal ou admin editem usuários do mesmo estabelecimento
-- Execute APENAS APÓS testar a política de leitura

-- 1. Remover apenas a política de atualização atual
DROP POLICY "Permitir atualização de perfil" ON usuarios;

-- 2. Recriar com a lógica correta
CREATE POLICY "Permitir atualização de perfil"
ON usuarios FOR UPDATE
TO public
USING (
  -- Super admin pode editar qualquer usuário
  (EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
  ))
  OR
  -- Usuário pode editar seu próprio perfil
  (id = auth.uid())
  OR
  -- Usuário is_principal ou admin pode editar usuários do mesmo estabelecimento
  (EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (u.is_principal = true OR u.role = 'admin')
    AND u.estabelecimento_id = usuarios.estabelecimento_id
  ))
);