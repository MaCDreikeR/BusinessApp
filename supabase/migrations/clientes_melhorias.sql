-- ================================================
-- MIGRATION: Melhorias na Gestão de Clientes
-- Data: 2024-12-11
-- Descrição: Adiciona tabelas para pacotes, fotos e melhorias no histórico
-- ================================================

-- 1. Tabela para gerenciar pacotes de clientes
CREATE TABLE IF NOT EXISTS cliente_pacotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  pacote_id UUID NOT NULL REFERENCES pacotes(id) ON DELETE RESTRICT,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  sessoes_total INTEGER NOT NULL DEFAULT 0,
  sessoes_usadas INTEGER NOT NULL DEFAULT 0,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_expiracao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  CONSTRAINT sessoes_usadas_valid CHECK (sessoes_usadas >= 0 AND sessoes_usadas <= sessoes_total)
);

-- Índices para cliente_pacotes
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_cliente_id ON cliente_pacotes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_estabelecimento_id ON cliente_pacotes(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_ativo ON cliente_pacotes(ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cliente_pacotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cliente_pacotes_updated_at
  BEFORE UPDATE ON cliente_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_pacotes_updated_at();

-- 2. Tabela para galeria de fotos dos clientes
CREATE TABLE IF NOT EXISTS cliente_fotos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'geral', -- 'antes', 'depois', 'procedimento', 'geral'
  data_foto DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Índices para cliente_fotos
CREATE INDEX IF NOT EXISTS idx_cliente_fotos_cliente_id ON cliente_fotos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_fotos_estabelecimento_id ON cliente_fotos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_cliente_fotos_tipo ON cliente_fotos(tipo);

-- 3. Adicionar campo estabelecimento_id na tabela comandas_itens (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comandas_itens' 
    AND column_name = 'estabelecimento_id'
  ) THEN
    ALTER TABLE comandas_itens 
    ADD COLUMN estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE;
    
    -- Preencher estabelecimento_id baseado na comanda
    UPDATE comandas_itens ci
    SET estabelecimento_id = c.estabelecimento_id
    FROM comandas c
    WHERE ci.comanda_id = c.id;
    
    -- Criar índice
    CREATE INDEX idx_comandas_itens_estabelecimento_id ON comandas_itens(estabelecimento_id);
  END IF;
END $$;

-- 4. View para estatísticas de clientes
CREATE OR REPLACE VIEW v_cliente_estatisticas AS
SELECT 
  c.id as cliente_id,
  c.estabelecimento_id,
  COUNT(DISTINCT cmd.id) as total_visitas,
  COALESCE(SUM(cmd.valor_total), 0) as total_gasto,
  COALESCE(AVG(cmd.valor_total), 0) as ticket_medio,
  MAX(cmd.created_at) as ultima_visita,
  MIN(cmd.created_at) as primeira_visita,
  -- Conta agendamentos futuros
  COUNT(DISTINCT CASE WHEN ag.data_hora >= NOW() THEN ag.id END) as agendamentos_futuros
FROM clientes c
LEFT JOIN comandas cmd ON cmd.cliente_id = c.id AND cmd.status = 'fechada'
LEFT JOIN agendamentos ag ON ag.cliente = c.nome AND ag.estabelecimento_id = c.estabelecimento_id
GROUP BY c.id, c.estabelecimento_id;

-- 5. View para serviços favoritos por cliente
CREATE OR REPLACE VIEW v_cliente_servicos_favoritos AS
SELECT 
  c.id as cliente_id,
  ci.nome as servico_nome,
  COUNT(*) as quantidade
FROM clientes c
JOIN comandas cmd ON cmd.cliente_id = c.id AND cmd.status = 'fechada'
JOIN comandas_itens ci ON ci.comanda_id = cmd.id AND ci.tipo = 'servico'
GROUP BY c.id, ci.nome
ORDER BY c.id, quantidade DESC;

-- 6. Função para usar sessão de pacote
CREATE OR REPLACE FUNCTION usar_sessao_pacote(
  p_cliente_pacote_id UUID,
  p_usuario_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_sessoes_usadas INTEGER;
  v_sessoes_total INTEGER;
  v_ativo BOOLEAN;
  v_result JSONB;
BEGIN
  -- Busca dados do pacote
  SELECT sessoes_usadas, sessoes_total, ativo
  INTO v_sessoes_usadas, v_sessoes_total, v_ativo
  FROM cliente_pacotes
  WHERE id = p_cliente_pacote_id;

  -- Validações
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pacote não encontrado'
    );
  END IF;

  IF NOT v_ativo THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pacote inativo'
    );
  END IF;

  IF v_sessoes_usadas >= v_sessoes_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todas as sessões já foram utilizadas'
    );
  END IF;

  -- Incrementa sessão usada
  UPDATE cliente_pacotes
  SET sessoes_usadas = sessoes_usadas + 1,
      updated_at = NOW()
  WHERE id = p_cliente_pacote_id;

  -- Desativa se completou todas as sessões
  UPDATE cliente_pacotes
  SET ativo = false
  WHERE id = p_cliente_pacote_id 
    AND sessoes_usadas >= sessoes_total;

  RETURN jsonb_build_object(
    'success', true,
    'sessoes_usadas', v_sessoes_usadas + 1,
    'sessoes_restantes', v_sessoes_total - v_sessoes_usadas - 1
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Políticas RLS (Row Level Security)

-- Para cliente_pacotes
ALTER TABLE cliente_pacotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver pacotes do seu estabelecimento"
  ON cliente_pacotes FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem gerenciar pacotes do seu estabelecimento"
  ON cliente_pacotes FOR ALL
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Para cliente_fotos
ALTER TABLE cliente_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver fotos do seu estabelecimento"
  ON cliente_fotos FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem gerenciar fotos do seu estabelecimento"
  ON cliente_fotos FOR ALL
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- 8. Comentários nas tabelas
COMMENT ON TABLE cliente_pacotes IS 'Gerencia pacotes/planos adquiridos pelos clientes';
COMMENT ON TABLE cliente_fotos IS 'Galeria de fotos dos clientes (antes/depois, procedimentos, etc)';
COMMENT ON COLUMN cliente_pacotes.sessoes_usadas IS 'Quantidade de sessões já utilizadas do pacote';
COMMENT ON COLUMN cliente_pacotes.sessoes_total IS 'Quantidade total de sessões do pacote';
COMMENT ON COLUMN cliente_fotos.tipo IS 'Tipo da foto: antes, depois, procedimento, geral';

-- ================================================
-- FIM DA MIGRATION
-- ================================================
