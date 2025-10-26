-- ============================================
-- ✅ SOLUÇÃO DEFINITIVA E PERMANENTE RLS
-- Políticas que FUNCIONAM sem recursão
-- ============================================

-- 1. Desabilitar RLS
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas antigas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
    END LOOP;
END $$;

-- 3. CRIAR FUNÇÃO AUXILIAR que não causa recursão
CREATE OR REPLACE FUNCTION get_user_estabelecimento_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  estab_id UUID;
BEGIN
  SELECT estabelecimento_id INTO estab_id
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN estab_id;
END;
$$;

-- 4. CRIAR FUNÇÃO para verificar se é super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (role = 'super_admin') INTO is_admin
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- 5. POLÍTICAS DEFINITIVAS usando as funções (SEM RECURSÃO)
CREATE POLICY "usuarios_select_definitivo"
ON usuarios FOR SELECT
TO authenticated
USING (
  -- Pode ver seu próprio perfil
  id = auth.uid()
  OR
  -- Pode ver usuários do mesmo estabelecimento (usa função auxiliar)
  estabelecimento_id = get_user_estabelecimento_id()
  OR
  -- Super admin vê tudo (usa função auxiliar)
  is_super_admin() = true
);

CREATE POLICY "usuarios_update_definitivo"
ON usuarios FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  is_super_admin() = true
)
WITH CHECK (
  id = auth.uid()
  OR
  is_super_admin() = true
);

CREATE POLICY "usuarios_insert_definitivo"
ON usuarios FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND (role = 'admin' OR is_principal = true)
    LIMIT 1
  )
);

CREATE POLICY "usuarios_delete_definitivo"
ON usuarios FOR DELETE
TO authenticated
USING (
  is_super_admin() = true
);

-- 6. Dar permissões nas funções
GRANT EXECUTE ON FUNCTION get_user_estabelecimento_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- 7. Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 8. TESTAR
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- 9. TESTAR QUERY
SELECT 
  id,
  nome_completo,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY nome_completo;
