-- ============================================================================
-- SOLUÇÃO DEFINITIVA: Política super_admin para agendamentos
-- ============================================================================
-- Esta é uma abordagem mais direta que deve funcionar garantidamente
-- ============================================================================

-- LIMPAR TUDO primeiro
DROP POLICY IF EXISTS "super_admin_acessa_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_ver_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_atualizar_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_deletar_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_inserir_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "z_super_admin_full_access_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "z_super_admin_bypass_agendamentos" ON agendamentos;

-- Criar política com subquery inline (mais eficiente)
CREATE POLICY "zzz_super_admin_bypass_rls_agendamentos"
ON agendamentos
FOR ALL
TO authenticated
USING (
  (SELECT role FROM usuarios WHERE id = auth.uid() LIMIT 1) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM usuarios WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

-- ============================================================================
-- VERIFICAR SE FUNCIONOU
-- ============================================================================

-- 1. Ver a política criada
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'agendamentos'
  AND policyname = 'zzz_super_admin_bypass_rls_agendamentos';

-- 2. Contar agendamentos (deve funcionar se você estiver autenticado como super_admin no app)
-- No SQL Editor não vai funcionar porque você não está autenticado
-- SELECT COUNT(*) FROM agendamentos;

-- 3. Listar todas as políticas de agendamentos ordenadas por nome
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies
WHERE tablename = 'agendamentos'
ORDER BY policyname;
