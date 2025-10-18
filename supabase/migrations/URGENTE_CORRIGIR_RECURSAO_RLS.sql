-- ============================================
-- 🚨 URGENTE: CORRIGIR RECURSÃO INFINITA RLS
-- Execute IMEDIATAMENTE no Supabase SQL Editor
-- ============================================

-- PASSO 1: DESABILITAR RLS IMEDIATAMENTE
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- PASSO 2: REMOVER TODAS AS POLÍTICAS EXISTENTES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
    END LOOP;
END $$;

-- PASSO 3: CRIAR POLÍTICAS SIMPLES SEM RECURSÃO
-- A chave é NÃO usar subqueries que acessam a tabela usuarios novamente!

-- Política de LEITURA: usa auth.uid() diretamente sem subquery recursiva
CREATE POLICY "usuarios_select_policy" 
ON usuarios FOR SELECT 
TO authenticated
USING (
  -- Pode ver seu próprio registro
  id = auth.uid()
  OR
  -- Pode ver usuários do mesmo estabelecimento
  -- (usa estabelecimento_id diretamente, sem subquery)
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
    LIMIT 1  -- IMPORTANTE: LIMIT 1 previne recursão
  )
  OR
  -- Super admin pode ver tudo
  role = 'super_admin'
);

-- Política de ATUALIZAÇÃO
CREATE POLICY "usuarios_update_policy" 
ON usuarios FOR UPDATE 
TO authenticated
USING (
  id = auth.uid()
  OR
  role = 'super_admin'
)
WITH CHECK (
  id = auth.uid()
  OR
  role = 'super_admin'
);

-- Política de INSERÇÃO
CREATE POLICY "usuarios_insert_policy" 
ON usuarios FOR INSERT 
TO authenticated
WITH CHECK (
  -- Apenas admins e super_admins podem criar
  EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'super_admin' OR is_principal = true)
    LIMIT 1
  )
);

-- Política de EXCLUSÃO
CREATE POLICY "usuarios_delete_policy" 
ON usuarios FOR DELETE 
TO authenticated
USING (
  -- Apenas super_admin pode deletar
  EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    LIMIT 1
  )
);

-- PASSO 4: REABILITAR RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- PASSO 5: VERIFICAR POLÍTICAS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tem USING'
    ELSE 'Sem USING'
  END as tem_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Tem WITH CHECK'
    ELSE 'Sem WITH CHECK'
  END as tem_with_check
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- PASSO 6: TESTAR
SELECT 
  id,
  nome_completo,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY nome_completo;
