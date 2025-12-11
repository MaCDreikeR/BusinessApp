-- ============================================================================
-- QUICK FIX: Permitir super_admin ver todos os dados
-- ============================================================================
-- Execute este script AGORA no Supabase SQL Editor para resolver imediatamente
-- o problema de 0 clientes no dashboard
-- ============================================================================

-- CLIENTES: Permitir super_admin ver TODOS os clientes
CREATE POLICY "super_admin_acessa_todos_clientes"
ON clientes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- AGENDAMENTOS: Permitir super_admin ver TODOS os agendamentos
CREATE POLICY "super_admin_acessa_todos_agendamentos"
ON agendamentos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- COMANDAS: Permitir super_admin ver TODAS as comandas
CREATE POLICY "super_admin_acessa_todas_comandas"
ON comandas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- SERVIÇOS: Permitir super_admin ver TODOS os serviços
CREATE POLICY "super_admin_acessa_todos_servicos"
ON servicos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- VERIFICAÇÃO: Teste se as políticas funcionaram
-- ============================================================================
-- Descomente e execute as queries abaixo após aplicar as políticas:

-- SELECT COUNT(*) as total_clientes FROM clientes;
-- SELECT COUNT(*) as total_agendamentos FROM agendamentos;
-- SELECT COUNT(*) as total_comandas FROM comandas;
-- SELECT COUNT(*) as total_servicos FROM servicos;

-- ============================================================================
-- NOTA: Após executar este script, recarregue o app e o dashboard
-- deve mostrar os números corretos!
-- ============================================================================
