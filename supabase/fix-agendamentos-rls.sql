-- ============================================================================
-- FIX: Agendamentos para super_admin
-- ============================================================================
-- Execute este script para permitir que super_admin veja TODOS os agendamentos
-- ============================================================================

-- Verificar se a política já existe
DO $$
BEGIN
  -- Tentar deletar política existente (se houver conflito)
  DROP POLICY IF EXISTS "super_admin_acessa_todos_agendamentos" ON agendamentos;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar erro se não existir
    NULL;
END $$;

-- Criar política para SELECT (leitura)
CREATE POLICY "super_admin_pode_ver_todos_agendamentos"
ON agendamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- Criar política para UPDATE (atualização)
CREATE POLICY "super_admin_pode_atualizar_todos_agendamentos"
ON agendamentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- Criar política para DELETE (exclusão)
CREATE POLICY "super_admin_pode_deletar_todos_agendamentos"
ON agendamentos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- Criar política para INSERT (criação)
CREATE POLICY "super_admin_pode_inserir_todos_agendamentos"
ON agendamentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Teste se funcionou:
SELECT COUNT(*) as total_agendamentos FROM agendamentos;

-- Ver todas as políticas de agendamentos:
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'agendamentos' 
ORDER BY policyname;
