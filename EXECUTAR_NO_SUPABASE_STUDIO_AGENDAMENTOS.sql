-- EXECUTE NO SUPABASE STUDIO - POLÍTICAS RLS PARA AGENDAMENTOS
-- Copie e cole este SQL no Supabase Studio > SQL Editor

-- Políticas RLS para tabela agendamentos
CREATE POLICY "Usuários podem ver agendamentos do próprio estabelecimento" ON agendamentos
FOR SELECT USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem inserir agendamentos no próprio estabelecimento" ON agendamentos
FOR INSERT WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar agendamentos do próprio estabelecimento" ON agendamentos
FOR UPDATE USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar agendamentos do próprio estabelecimento" ON agendamentos
FOR DELETE USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

-- Políticas RLS para tabela agendamento_servicos
CREATE POLICY "Usuários podem ver agendamento_servicos do próprio estabelecimento" ON agendamento_servicos
FOR SELECT USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem inserir agendamento_servicos no próprio estabelecimento" ON agendamento_servicos
FOR INSERT WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar agendamento_servicos do próprio estabelecimento" ON agendamento_servicos
FOR UPDATE USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar agendamento_servicos do próprio estabelecimento" ON agendamento_servicos
FOR DELETE USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);