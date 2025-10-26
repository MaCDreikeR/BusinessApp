-- VERSÃO SIMPLIFICADA (usar se a primeira não funcionar)
-- Execute no SQL Editor do Supabase Studio

-- 1. Desabilitar RLS temporariamente
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Leitura: usuários do mesmo estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Permitir atualização de perfil" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem editar seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seu perfil" ON usuarios;
DROP POLICY IF EXISTS "Permitir criação do primeiro usuário" ON usuarios;
DROP POLICY IF EXISTS "Permitir criação de usuários" ON usuarios;
DROP POLICY IF EXISTS "Super admin pode deletar usuários" ON usuarios;

-- 3. Criar políticas simplificadas
-- Leitura: todos os usuários autenticados podem ver usuários do mesmo estabelecimento
CREATE POLICY "select_usuarios_mesmo_estabelecimento" 
ON usuarios FOR SELECT 
TO authenticated
USING (
  estabelecimento_id = (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR id = auth.uid()
  OR (SELECT role FROM usuarios WHERE id = auth.uid()) = 'super_admin'
);

-- Atualização: usuário pode atualizar próprio perfil ou admin pode atualizar todos
CREATE POLICY "update_usuarios_perfil" 
ON usuarios FOR UPDATE 
TO authenticated
USING (
  id = auth.uid()
  OR (SELECT role FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  OR (
    SELECT is_principal FROM usuarios WHERE id = auth.uid()
  ) = true
);

-- Inserção: admin ou usuário principal pode criar
CREATE POLICY "insert_usuarios" 
ON usuarios FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT role FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  OR (SELECT is_principal FROM usuarios WHERE id = auth.uid()) = true
);

-- Exclusão: apenas super admin
CREATE POLICY "delete_usuarios" 
ON usuarios FOR DELETE 
TO authenticated
USING (
  (SELECT role FROM usuarios WHERE id = auth.uid()) = 'super_admin'
);

-- 4. Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;