-- ============================================================================
-- LIMPEZA E RECRIAÇÃO: Políticas de agendamentos para super_admin
-- ============================================================================
-- Este script remove todas as políticas antigas e cria novas sem conflitos
-- ============================================================================

-- PASSO 1: Remover todas as políticas relacionadas a super_admin em agendamentos
DROP POLICY IF EXISTS "super_admin_acessa_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_ver_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_atualizar_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_deletar_todos_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "super_admin_pode_inserir_todos_agendamentos" ON agendamentos;

-- PASSO 2: Criar política única ALL (mais simples e eficiente)
CREATE POLICY "z_super_admin_full_access_agendamentos"
ON agendamentos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- PASSO 3: Verificar políticas criadas
SELECT 
  policyname,
  cmd as comando,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tem USING'
    ELSE 'Sem USING'
  END as tem_condicao
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'agendamentos'
  AND policyname LIKE '%super_admin%'
ORDER BY policyname;

-- PASSO 4: Testar se funciona
SELECT COUNT(*) as total_agendamentos_visivel FROM agendamentos;

-- PASSO 5: Ver detalhes dos agendamentos
SELECT 
  id,
  cliente,
  data_hora,
  status,
  estabelecimento_id
FROM agendamentos
ORDER BY data_hora DESC
LIMIT 5;
