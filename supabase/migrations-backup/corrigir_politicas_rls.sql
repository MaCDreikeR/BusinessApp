-- CORREÇÃO DAS POLÍTICAS RLS PARA A TABELA USUARIOS
-- Execute no SQL Editor do Supabase Studio

-- 1. Remover a política problemática
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

-- 2. Criar nova política corrigida para leitura
CREATE POLICY "Leitura: usuários do mesmo estabelecimento" 
ON usuarios FOR SELECT 
TO public 
USING (
  -- Super admin pode ver todos
  (role = 'super_admin') 
  OR 
  -- Usuários podem ver outros do mesmo estabelecimento
  (
    estabelecimento_id IN (
      SELECT u.estabelecimento_id 
      FROM usuarios u 
      WHERE u.id = auth.uid()
    )
  )
  OR
  -- Usuários podem sempre ver seu próprio perfil
  (id = auth.uid())
);

-- 3. Verificar se as outras políticas estão corretas
-- Política para UPDATE (já existe, mas verificando se está correta)
DROP POLICY IF EXISTS "Permitir atualização de perfil" ON usuarios;
CREATE POLICY "Permitir atualização de perfil"
ON usuarios FOR UPDATE
TO public
USING (
  -- Super admin pode atualizar todos
  is_super_admin()
  OR
  -- Usuário pode atualizar seu próprio perfil
  (id = auth.uid())
  OR
  -- Usuário principal pode atualizar usuários do mesmo estabelecimento
  (
    auth.uid() IN (
      SELECT u.id FROM usuarios u 
      WHERE u.is_principal = true 
      AND u.estabelecimento_id = usuarios.estabelecimento_id
    )
  )
);

-- 4. Política para INSERT (permitir criação por usuários principais)
DROP POLICY IF EXISTS "Permitir criação do primeiro usuário" ON usuarios;
CREATE POLICY "Permitir criação de usuários"
ON usuarios FOR INSERT
TO public
WITH CHECK (
  -- Super admin pode criar qualquer usuário
  is_super_admin()
  OR
  -- Usuário principal pode criar usuários no mesmo estabelecimento
  (
    estabelecimento_id IN (
      SELECT u.estabelecimento_id 
      FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.is_principal = true
    )
  )
  OR
  -- Permitir auto-criação (primeiro usuário)
  NOT EXISTS (SELECT 1 FROM usuarios WHERE estabelecimento_id = usuarios.estabelecimento_id)
);

-- 5. Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;