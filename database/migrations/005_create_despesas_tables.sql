-- ============================================
-- 💰 MIGRAÇÃO: MÓDULO DE DESPESAS
-- ============================================
-- 
-- Este script cria as tabelas e configurações necessárias
-- para o módulo de gerenciamento de despesas
--
-- Tabelas criadas:
-- 1. categorias_despesas - Categorias de despesas
-- 2. despesas - Registro de despesas
--
-- Relacionamentos:
-- - despesas -> categorias_despesas (category_id)
-- - despesas -> estabelecimentos (estabelecimento_id)
-- - despesas -> usuarios (created_by)
--
-- RLS (Row Level Security): Habilitado para isolamento por estabelecimento
-- ============================================

-- ============================================
-- 1. TABELA: CATEGORIAS DE DESPESAS
-- ============================================

CREATE TABLE IF NOT EXISTS categorias_despesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL, -- Nome do ícone FontAwesome5
  color VARCHAR(7) NOT NULL, -- Hex color (#RRGGBB)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- Índices
  CONSTRAINT categorias_despesas_name_estabelecimento_key UNIQUE (estabelecimento_id, name)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categorias_despesas_estabelecimento 
  ON categorias_despesas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_categorias_despesas_is_active 
  ON categorias_despesas(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_despesas_updated_at
  BEFORE UPDATE ON categorias_despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE categorias_despesas ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas categorias do seu estabelecimento
CREATE POLICY categorias_despesas_select_policy ON categorias_despesas
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem criar categorias no seu estabelecimento
CREATE POLICY categorias_despesas_insert_policy ON categorias_despesas
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem atualizar categorias do seu estabelecimento
CREATE POLICY categorias_despesas_update_policy ON categorias_despesas
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar categorias do seu estabelecimento
CREATE POLICY categorias_despesas_delete_policy ON categorias_despesas
  FOR DELETE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- 2. TABELA: DESPESAS
-- ============================================

CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- Valor em centavos
  category_id UUID NOT NULL REFERENCES categorias_despesas(id) ON DELETE RESTRICT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(20) NOT NULL CHECK (
    payment_method IN ('pix', 'credit', 'debit', 'cash', 'bank_transfer')
  ),
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency VARCHAR(20) CHECK (
    recurring_frequency IS NULL OR 
    recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')
  ),
  recurring_day INTEGER CHECK (
    recurring_day IS NULL OR 
    (recurring_day >= 1 AND recurring_day <= 31)
  ),
  attachment_url TEXT,
  created_by UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- Validação: se recorrente, deve ter frequência
  CONSTRAINT check_recurring_frequency CHECK (
    (recurring = false) OR 
    (recurring = true AND recurring_frequency IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_estabelecimento 
  ON despesas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_category 
  ON despesas(category_id);
CREATE INDEX IF NOT EXISTS idx_despesas_date 
  ON despesas(date DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_payment_method 
  ON despesas(payment_method);
CREATE INDEX IF NOT EXISTS idx_despesas_recurring 
  ON despesas(recurring) WHERE recurring = true;
CREATE INDEX IF NOT EXISTS idx_despesas_created_by 
  ON despesas(created_by);

-- Índice composto para queries comuns (estabelecimento + data)
CREATE INDEX IF NOT EXISTS idx_despesas_estabelecimento_date 
  ON despesas(estabelecimento_id, date DESC);

-- Trigger para updated_at
CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas despesas do seu estabelecimento
CREATE POLICY despesas_select_policy ON despesas
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem criar despesas no seu estabelecimento
CREATE POLICY despesas_insert_policy ON despesas
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem atualizar despesas do seu estabelecimento
CREATE POLICY despesas_update_policy ON despesas
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar despesas do seu estabelecimento
CREATE POLICY despesas_delete_policy ON despesas
  FOR DELETE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- 3. FUNÇÃO AUXILIAR: Inicializar categorias padrão
-- ============================================

CREATE OR REPLACE FUNCTION inicializar_categorias_padrao(p_estabelecimento_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se já existem categorias para este estabelecimento
  IF NOT EXISTS (
    SELECT 1 FROM categorias_despesas 
    WHERE estabelecimento_id = p_estabelecimento_id
  ) THEN
    -- Insere categorias padrão
    INSERT INTO categorias_despesas (estabelecimento_id, name, icon, color) VALUES
      (p_estabelecimento_id, 'Aluguel', 'home', '#FF6B6B'),
      (p_estabelecimento_id, 'Salários', 'users', '#4ECDC4'),
      (p_estabelecimento_id, 'Energia', 'bolt', '#FFE66D'),
      (p_estabelecimento_id, 'Água', 'tint', '#95E1D3'),
      (p_estabelecimento_id, 'Internet', 'wifi', '#A8E6CF'),
      (p_estabelecimento_id, 'Telefone', 'phone', '#DCEDC1'),
      (p_estabelecimento_id, 'Produtos', 'box', '#FFA07A'),
      (p_estabelecimento_id, 'Marketing', 'bullhorn', '#DDA0DD'),
      (p_estabelecimento_id, 'Manutenção', 'tools', '#87CEEB'),
      (p_estabelecimento_id, 'Impostos', 'file-invoice-dollar', '#F08080'),
      (p_estabelecimento_id, 'Contador', 'calculator', '#B0C4DE'),
      (p_estabelecimento_id, 'Diversos', 'ellipsis-h', '#D3D3D3');
  END IF;
END;
$$;

-- ============================================
-- 4. PERMISSÕES NA TABELA DE USUÁRIOS
-- ============================================
-- 
-- Adicionar coluna de permissão para despesas na tabela usuarios
-- (caso ainda não exista)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'pode_ver_despesas'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN pode_ver_despesas BOOLEAN NOT NULL DEFAULT true;
  END IF;
END
$$;

-- ============================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE categorias_despesas IS 
  'Categorias de despesas personalizáveis por estabelecimento';

COMMENT ON COLUMN categorias_despesas.icon IS 
  'Nome do ícone FontAwesome5 (ex: home, users, bolt)';

COMMENT ON COLUMN categorias_despesas.color IS 
  'Cor em formato hexadecimal (#RRGGBB) para identificação visual';

COMMENT ON TABLE despesas IS 
  'Registro de despesas do estabelecimento com suporte a recorrência';

COMMENT ON COLUMN despesas.amount IS 
  'Valor em centavos para evitar problemas de precisão com ponto flutuante';

COMMENT ON COLUMN despesas.recurring IS 
  'Indica se a despesa é recorrente (ex: aluguel mensal)';

COMMENT ON COLUMN despesas.recurring_frequency IS 
  'Frequência de recorrência: daily, weekly, monthly, yearly';

COMMENT ON COLUMN despesas.recurring_day IS 
  'Dia do mês/semana para lançamento automático de despesas recorrentes';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- Verificação final
SELECT 
  'Migração concluída com sucesso!' as status,
  (SELECT COUNT(*) FROM categorias_despesas) as total_categorias,
  (SELECT COUNT(*) FROM despesas) as total_despesas;
