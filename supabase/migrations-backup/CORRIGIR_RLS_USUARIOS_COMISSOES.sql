-- ============================================
-- CORRIGIR POLÍTICAS RLS PARA USUÁRIOS
-- Execute no SQL Editor do Supabase Studio
-- ============================================

-- PASSO 1: Desabilitar RLS temporariamente
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
    END LOOP;
END $$;

-- PASSO 3: Criar nova política simplificada e eficiente
-- Esta política permite que todos os usuários autenticados vejam:
-- 1. Todos os usuários do mesmo estabelecimento
-- 2. Seu próprio perfil
-- 3. Super admins podem ver tudo

CREATE POLICY "usuarios_leitura_estabelecimento" 
ON usuarios FOR SELECT 
TO authenticated
USING (
  -- Super admin pode ver todos
  EXISTS (
    SELECT 1 FROM usuarios u2 
    WHERE u2.id = auth.uid() 
    AND u2.role = 'super_admin'
  )
  OR
  -- Pode ver próprio perfil
  id = auth.uid()
  OR
  -- Pode ver usuários do mesmo estabelecimento
  (
    estabelecimento_id IS NOT NULL
    AND estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  )
);

-- Atualização: usuário pode atualizar próprio perfil ou admin pode atualizar todos
CREATE POLICY "usuarios_atualizacao" 
ON usuarios FOR UPDATE 
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios u2 
    WHERE u2.id = auth.uid() 
    AND u2.role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM usuarios u2 
    WHERE u2.id = auth.uid() 
    AND u2.is_principal = true
    AND u2.estabelecimento_id = usuarios.estabelecimento_id
  )
);

-- Inserção: super admin ou usuário principal pode criar
CREATE POLICY "usuarios_insercao" 
ON usuarios FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u2 
    WHERE u2.id = auth.uid() 
    AND (u2.role = 'super_admin' OR u2.is_principal = true)
  )
);

-- Exclusão: apenas super admin
CREATE POLICY "usuarios_exclusao" 
ON usuarios FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u2 
    WHERE u2.id = auth.uid() 
    AND u2.role = 'super_admin'
  )
);

-- PASSO 4: Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- PASSO 6: Testar a query (substitua o ID do estabelecimento)
SELECT 
  id,
  nome_completo,
  email,
  role,
  faz_atendimento,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND role != 'super_admin'
ORDER BY nome_completo;
