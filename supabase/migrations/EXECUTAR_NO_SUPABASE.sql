-- ============================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- ============================================

-- Tabela para registros manuais de comissões
CREATE TABLE IF NOT EXISTS comissoes_registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_comissoes_registros_usuario ON comissoes_registros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_registros_estabelecimento ON comissoes_registros(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_registros_data ON comissoes_registros(data);

-- RLS (Row Level Security)
ALTER TABLE comissoes_registros ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem inserir comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem atualizar comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem deletar comissões do seu estabelecimento" ON comissoes_registros;

-- Políticas de acesso
CREATE POLICY "Usuários podem ver comissões do seu estabelecimento"
  ON comissoes_registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem inserir comissões do seu estabelecimento"
  ON comissoes_registros FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem atualizar comissões do seu estabelecimento"
  ON comissoes_registros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem deletar comissões do seu estabelecimento"
  ON comissoes_registros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

-- Comentários na tabela
COMMENT ON TABLE comissoes_registros IS 'Registros manuais de comissões pagas aos usuários';
COMMENT ON COLUMN comissoes_registros.usuario_id IS 'ID do usuário que recebeu a comissão';
COMMENT ON COLUMN comissoes_registros.estabelecimento_id IS 'ID do estabelecimento';
COMMENT ON COLUMN comissoes_registros.valor IS 'Valor da comissão (positivo = a pagar, negativo = pago)';
COMMENT ON COLUMN comissoes_registros.descricao IS 'Descrição opcional do pagamento';
COMMENT ON COLUMN comissoes_registros.data IS 'Data do pagamento da comissão';
COMMENT ON COLUMN comissoes_registros.created_at IS 'Data e hora do registro';
