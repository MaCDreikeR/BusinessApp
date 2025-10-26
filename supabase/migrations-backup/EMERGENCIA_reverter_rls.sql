-- REVERTER POLÍTICAS RLS - EMERGÊNCIA
-- Execute IMEDIATAMENTE no SQL Editor do Supabase Studio

-- 1. Desabilitar RLS completamente (emergência)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas que criamos
DROP POLICY IF EXISTS "Leitura: usuários do mesmo estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "select_usuarios_mesmo_estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "update_usuarios_perfil" ON usuarios;
DROP POLICY IF EXISTS "insert_usuarios" ON usuarios;
DROP POLICY IF EXISTS "delete_usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir criação de usuários" ON usuarios;

-- 3. Recriar as políticas ORIGINAIS (mais simples)
CREATE POLICY "Leitura: super_admin ou membros do estabelecimento"
ON usuarios FOR SELECT
TO public
USING (
  (role = 'super_admin') 
  OR 
  (id = auth.uid())
);

CREATE POLICY "Permitir atualização de perfil"
ON usuarios FOR UPDATE
TO public
USING (
  (auth.uid() = id) OR (role = 'super_admin')
);

CREATE POLICY "Permitir criação do primeiro usuário"
ON usuarios FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super admin pode deletar usuários"
ON usuarios FOR DELETE
TO public
USING (
  (role = 'super_admin')
);

-- 4. Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;