-- ============================================================================
-- POLÍTICAS RLS PARA SUPER_ADMIN
-- ============================================================================
-- Este script adiciona políticas para permitir que super_admin acesse
-- TODOS os dados de TODAS as tabelas, independente do estabelecimento
-- ============================================================================

-- ============================================================================
-- CLIENTES
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todos_clientes"
ON clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_atualizar_todos_clientes"
ON clientes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_deletar_todos_clientes"
ON clientes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_inserir_todos_clientes"
ON clientes
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
-- AGENDAMENTOS
-- ============================================================================
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

-- ============================================================================
-- COMANDAS
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todas_comandas"
ON comandas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- PRODUTOS
-- ============================================================================
-- Já existe política "Acesso total para super_admin em produtos" (ALL)
-- Não precisa adicionar

-- ============================================================================
-- SERVIÇOS
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todos_servicos"
ON servicos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_atualizar_todos_servicos"
ON servicos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_deletar_todos_servicos"
ON servicos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_inserir_todos_servicos"
ON servicos
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
-- FORNECEDORES
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todos_fornecedores"
ON fornecedores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- PACOTES
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todos_pacotes"
ON pacotes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- ORÇAMENTOS
-- ============================================================================
CREATE POLICY "super_admin_pode_ver_todos_orcamentos"
ON orcamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- LOGS DE ATIVIDADES
-- ============================================================================
-- Já existe política "Super admin pode ver todos os logs" (SELECT)
-- Vamos adicionar as demais operações

CREATE POLICY "super_admin_pode_inserir_logs"
ON logs_atividades
FOR INSERT
TO authenticated
WITH CHECK (true); -- Qualquer usuário autenticado pode inserir logs

CREATE POLICY "super_admin_pode_atualizar_logs"
ON logs_atividades
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "super_admin_pode_deletar_logs"
ON logs_atividades
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- CREDIÁRIO (habilitar RLS e criar políticas)
-- ============================================================================
ALTER TABLE crediario_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_podem_ver_crediario_estabelecimento"
ON crediario_movimentacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN clientes c ON c.estabelecimento_id = u.estabelecimento_id
    WHERE u.id = auth.uid()
    AND c.id = crediario_movimentacoes.cliente_id
  )
);

CREATE POLICY "super_admin_pode_ver_todo_crediario"
ON crediario_movimentacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

CREATE POLICY "usuarios_podem_inserir_crediario_estabelecimento"
ON crediario_movimentacoes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN clientes c ON c.estabelecimento_id = u.estabelecimento_id
    WHERE u.id = auth.uid()
    AND c.id = crediario_movimentacoes.cliente_id
  )
);

CREATE POLICY "usuarios_podem_atualizar_crediario_estabelecimento"
ON crediario_movimentacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN clientes c ON c.estabelecimento_id = u.estabelecimento_id
    WHERE u.id = auth.uid()
    AND c.id = crediario_movimentacoes.cliente_id
  )
);

-- ============================================================================
-- NOTIFICAÇÕES (criar políticas básicas)
-- ============================================================================
CREATE POLICY "usuarios_podem_ver_proprias_notificacoes"
ON notificacoes
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "usuarios_podem_atualizar_proprias_notificacoes"
ON notificacoes
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "usuarios_podem_deletar_proprias_notificacoes"
ON notificacoes
FOR DELETE
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "sistema_pode_inserir_notificacoes"
ON notificacoes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "super_admin_pode_ver_todas_notificacoes"
ON notificacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  )
);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
-- Este script cria políticas para permitir que super_admin acesse todos os dados
-- Execute no Supabase SQL Editor após fazer deploy das migrações anteriores
