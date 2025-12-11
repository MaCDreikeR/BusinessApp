-- Migration: Sistema de Planos e Assinaturas
-- Created: 2025-12-10

-- Tabela de Planos
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10, 2) NOT NULL,
  preco_anual NUMERIC(10, 2),
  max_usuarios INTEGER DEFAULT 1,
  max_clientes INTEGER,
  max_produtos INTEGER,
  max_agendamentos_mes INTEGER,
  recursos JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES planos(id),
  status TEXT NOT NULL DEFAULT 'ativa',
  tipo_pagamento TEXT NOT NULL DEFAULT 'mensal',
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_fim TIMESTAMP WITH TIME ZONE,
  data_proximo_pagamento TIMESTAMP WITH TIME ZONE,
  valor_pago NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT assinaturas_status_check CHECK (status IN ('ativa', 'suspensa', 'cancelada', 'expirada')),
  CONSTRAINT assinaturas_tipo_check CHECK (tipo_pagamento IN ('mensal', 'anual', 'trial'))
);

-- Tabela de Histórico de Pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id UUID NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  metodo_pagamento TEXT,
  referencia_externa TEXT,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pagamentos_status_check CHECK (status IN ('pendente', 'pago', 'cancelado', 'estornado'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assinaturas_estabelecimento ON assinaturas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano ON assinaturas(plano_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura ON pagamentos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_estabelecimento ON pagamentos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_planos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_planos_updated_at
  BEFORE UPDATE ON planos
  FOR EACH ROW
  EXECUTE FUNCTION update_planos_updated_at();

CREATE OR REPLACE FUNCTION update_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assinaturas_updated_at
  BEFORE UPDATE ON assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_assinaturas_updated_at();

-- Inserir planos padrão
INSERT INTO planos (nome, descricao, preco_mensal, preco_anual, max_usuarios, max_clientes, max_produtos, max_agendamentos_mes, recursos, ordem) VALUES
('Gratuito', 'Plano básico para começar', 0.00, 0.00, 1, 50, 20, 30, '{"comandas": true, "agendamentos": true, "relatorios_basicos": true}', 1),
('Básico', 'Ideal para pequenos negócios', 49.90, 499.00, 3, 200, 100, 150, '{"comandas": true, "agendamentos": true, "relatorios_basicos": true, "whatsapp": true}', 2),
('Profissional', 'Para negócios em crescimento', 99.90, 999.00, 10, 1000, 500, 500, '{"comandas": true, "agendamentos": true, "relatorios_avancados": true, "whatsapp": true, "automacao": true, "pacotes": true}', 3),
('Enterprise', 'Solução completa sem limites', 199.90, 1999.00, NULL, NULL, NULL, NULL, '{"comandas": true, "agendamentos": true, "relatorios_avancados": true, "whatsapp": true, "automacao": true, "pacotes": true, "api": true, "suporte_prioritario": true}', 4)
ON CONFLICT DO NOTHING;

-- Comentários
COMMENT ON TABLE planos IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE assinaturas IS 'Assinaturas ativas e histórico por estabelecimento';
COMMENT ON TABLE pagamentos IS 'Histórico de pagamentos das assinaturas';
