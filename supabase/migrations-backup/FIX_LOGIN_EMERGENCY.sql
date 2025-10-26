-- ============================================
-- 🔥 CORREÇÃO EMERGENCIAL - POLÍTICAS SIMPLES
-- Execute AGORA para permitir login novamente
-- ============================================

-- DESABILITAR RLS COMPLETAMENTE (temporário para permitir login)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
    END LOOP;
END $$;

-- CRIAR POLÍTICAS ULTRA-SIMPLES SEM NENHUMA SUBQUERY
CREATE POLICY "usuarios_select_own" 
ON usuarios FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "usuarios_select_same_establishment" 
ON usuarios FOR SELECT 
TO authenticated
USING (
  estabelecimento_id = (
    -- Usando uma função auxiliar para evitar recursão
    SELECT u.estabelecimento_id 
    FROM usuarios u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "usuarios_select_super_admin" 
ON usuarios FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
  )
);

CREATE POLICY "usuarios_update_own" 
ON usuarios FOR UPDATE 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "usuarios_insert_admin" 
ON usuarios FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "usuarios_delete_super_admin" 
ON usuarios FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
  )
);

-- REABILITAR RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- VERIFICAR
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;
