-- ============================================================================
-- Migration: Configurações Globais da Plataforma
-- Created: 2025-12-10
-- ============================================================================

-- Tabela de Configurações Globais
CREATE TABLE IF NOT EXISTS public.configuracoes_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  tipo TEXT NOT NULL DEFAULT 'text',
  categoria TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT configuracoes_globais_tipo_check CHECK (tipo IN ('text', 'number', 'boolean', 'json', 'url', 'email'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_globais_chave ON configuracoes_globais(chave);
CREATE INDEX IF NOT EXISTS idx_configuracoes_globais_categoria ON configuracoes_globais(categoria);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_configuracoes_globais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_globais_updated_at
  BEFORE UPDATE ON configuracoes_globais
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracoes_globais_updated_at();

-- ============================================================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- ============================================================================

-- 1. Configurações Gerais da Plataforma
INSERT INTO configuracoes_globais (chave, valor, tipo, categoria, descricao, ordem) VALUES
('plataforma_nome', 'BusinessApp', 'text', 'geral', 'Nome da plataforma', 1),
('plataforma_logo_url', '', 'url', 'geral', 'URL da logo da plataforma', 2),
('plataforma_cor_primaria', '#a78bfa', 'text', 'geral', 'Cor primária do tema (hex)', 3),
('plataforma_email_contato', 'suporte@businessapp.com', 'email', 'geral', 'E-mail de contato/suporte', 4),
('plataforma_telefone_suporte', '', 'text', 'geral', 'Telefone de suporte', 5),
('plataforma_termos_uso_url', '', 'url', 'geral', 'URL dos Termos de Uso', 6),
('plataforma_privacidade_url', '', 'url', 'geral', 'URL da Política de Privacidade', 7)
ON CONFLICT (chave) DO NOTHING;

-- 2. Configurações de Novos Cadastros
INSERT INTO configuracoes_globais (chave, valor, tipo, categoria, descricao, ordem) VALUES
('cadastro_plano_padrao_id', '', 'text', 'cadastro', 'ID do plano padrão para novos estabelecimentos', 10),
('cadastro_trial_dias', '14', 'number', 'cadastro', 'Período de trial em dias', 11),
('cadastro_aprovacao_manual', 'false', 'boolean', 'cadastro', 'Requer aprovação manual de novas contas', 12),
('cadastro_email_boas_vindas', 'true', 'boolean', 'cadastro', 'Enviar e-mail de boas-vindas', 13),
('cadastro_limite_estabelecimentos', '0', 'number', 'cadastro', 'Limite máximo de estabelecimentos (0 = ilimitado)', 14)
ON CONFLICT (chave) DO NOTHING;

-- 3. Configurações de Notificações
INSERT INTO configuracoes_globais (chave, valor, tipo, categoria, descricao, ordem) VALUES
('notif_admin_email', '', 'email', 'notificacoes', 'E-mail do super_admin para alertas', 20),
('notif_nova_conta', 'true', 'boolean', 'notificacoes', 'Notificar ao criar nova conta', 21),
('notif_cancelar_assinatura', 'true', 'boolean', 'notificacoes', 'Notificar ao cancelar assinatura', 22),
('notif_limite_quota', 'true', 'boolean', 'notificacoes', 'Notificar ao atingir limite de quota', 23),
('notif_relatorio_frequencia', 'semanal', 'text', 'notificacoes', 'Frequência de relatórios (diario, semanal, mensal, nunca)', 24)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- POLÍTICAS RLS
-- ============================================================================

-- Habilitar RLS
ALTER TABLE configuracoes_globais ENABLE ROW LEVEL SECURITY;

-- Super admin pode fazer tudo
CREATE POLICY "super_admin_full_access_configuracoes_globais"
ON configuracoes_globais
FOR ALL
TO authenticated
USING (
  (SELECT role FROM usuarios WHERE id = auth.uid() LIMIT 1) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM usuarios WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

-- Outros usuários podem apenas ler (para usar configurações da plataforma)
CREATE POLICY "usuarios_podem_ler_configuracoes_globais"
ON configuracoes_globais
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- FUNÇÃO HELPER: Obter valor de configuração
-- ============================================================================

CREATE OR REPLACE FUNCTION get_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT valor INTO config_value
  FROM configuracoes_globais
  WHERE chave = config_key;
  
  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE configuracoes_globais IS 'Configurações globais da plataforma gerenciadas pelo super_admin';
COMMENT ON FUNCTION get_config(TEXT) IS 'Função helper para obter valor de configuração por chave';
