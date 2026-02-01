-- ============================================
-- MIGRAÇÃO: SISTEMA DE DESPESAS
-- ============================================
-- Cria todas as tabelas e estruturas necessárias
-- para o módulo de Despesas do BusinessApp
--
-- Tabelas criadas:
-- 1. categorias_despesas - Categorias de despesas
-- 2. despesas - Registro de despesas
--
-- Autor: Sistema
-- Data: 2026-01-30
-- ============================================

-- ============================================
-- 1. TABELA: categorias_despesas
-- ============================================
-- Armazena categorias customizáveis de despesas
-- Cada estabelecimento pode ter suas próprias categorias

CREATE TABLE IF NOT EXISTS categorias_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL, -- Nome do ícone FontAwesome5
  color TEXT NOT NULL, -- Cor em formato hex (#RRGGBB)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categorias_despesas_estabelecimento 
  ON categorias_despesas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_categorias_despesas_active 
  ON categorias_despesas(estabelecimento_id, is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_categorias_despesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_categorias_despesas_updated_at
  BEFORE UPDATE ON categorias_despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_categorias_despesas_updated_at();

-- ============================================
-- 2. TABELA: despesas
-- ============================================
-- Armazena todas as despesas do estabelecimento

CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Valor em centavos (evita problemas com float)
  category_id UUID NOT NULL REFERENCES categorias_despesas(id) ON DELETE RESTRICT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit', 'debit', 'cash', 'bank_transfer')),
  recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_day INTEGER CHECK (recurring_day >= 1 AND recurring_day <= 31),
  attachment_url TEXT, -- Para anexar notas fiscais/comprovantes no futuro
  created_by UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT recurring_requires_frequency CHECK (
    (recurring = false) OR 
    (recurring = true AND recurring_frequency IS NOT NULL)
  )
);

-- Índices para queries otimizadas
CREATE INDEX IF NOT EXISTS idx_despesas_estabelecimento 
  ON despesas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_date 
  ON despesas(estabelecimento_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_category 
  ON despesas(estabelecimento_id, category_id);
CREATE INDEX IF NOT EXISTS idx_despesas_payment 
  ON despesas(estabelecimento_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_despesas_recurring 
  ON despesas(estabelecimento_id, recurring) WHERE recurring = true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_despesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_despesas_updated_at();

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Garante que usuários só acessem dados do próprio estabelecimento

-- Habilitar RLS
ALTER TABLE categorias_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias_despesas
CREATE POLICY "Usuários podem ver categorias do próprio estabelecimento"
  ON categorias_despesas FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins podem inserir categorias"
  ON categorias_despesas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND estabelecimento_id = categorias_despesas.estabelecimento_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins podem atualizar categorias"
  ON categorias_despesas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND estabelecimento_id = categorias_despesas.estabelecimento_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para despesas
CREATE POLICY "Usuários podem ver despesas do próprio estabelecimento"
  ON despesas FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários autorizados podem inserir despesas"
  ON despesas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND estabelecimento_id = despesas.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem atualizar próprias despesas ou admins todas"
  ON despesas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND estabelecimento_id = despesas.estabelecimento_id
      AND (created_by = auth.uid() OR role IN ('admin', 'super_admin'))
    )
  );

CREATE POLICY "Admins podem excluir despesas"
  ON despesas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND estabelecimento_id = despesas.estabelecimento_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 4. FUNÇÃO: Inicializar categorias padrão
-- ============================================
-- Cria categorias padrão quando um novo estabelecimento é criado

CREATE OR REPLACE FUNCTION init_default_expense_categories(p_estabelecimento_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categorias_despesas (estabelecimento_id, name, icon, color, is_active)
  VALUES
    (p_estabelecimento_id, 'Aluguel', 'home', '#FF6B6B', true),
    (p_estabelecimento_id, 'Salários', 'users', '#4ECDC4', true),
    (p_estabelecimento_id, 'Energia', 'bolt', '#FFE66D', true),
    (p_estabelecimento_id, 'Água', 'tint', '#95E1D3', true),
    (p_estabelecimento_id, 'Internet', 'wifi', '#A8E6CF', true),
    (p_estabelecimento_id, 'Telefone', 'phone', '#DCEDC1', true),
    (p_estabelecimento_id, 'Produtos', 'box', '#FFA07A', true),
    (p_estabelecimento_id, 'Marketing', 'bullhorn', '#DDA0DD', true),
    (p_estabelecimento_id, 'Manutenção', 'tools', '#87CEEB', true),
    (p_estabelecimento_id, 'Impostos', 'file-invoice-dollar', '#F08080', true),
    (p_estabelecimento_id, 'Contador', 'calculator', '#B0C4DE', true),
    (p_estabelecimento_id, 'Diversos', 'ellipsis-h', '#D3D3D3', true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNÇÃO: Estatísticas de despesas
-- ============================================
-- Retorna resumo consolidado para relatórios

CREATE OR REPLACE FUNCTION get_expense_stats(
  p_estabelecimento_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_amount BIGINT,
  count_expenses INTEGER,
  top_category_id UUID,
  top_category_name TEXT,
  top_category_amount BIGINT,
  payment_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH expense_data AS (
    SELECT 
      d.amount,
      d.category_id,
      c.name AS category_name,
      d.payment_method
    FROM despesas d
    JOIN categorias_despesas c ON c.id = d.category_id
    WHERE d.estabelecimento_id = p_estabelecimento_id
      AND d.date BETWEEN p_start_date AND p_end_date
  ),
  category_totals AS (
    SELECT 
      category_id,
      category_name,
      SUM(amount) AS total
    FROM expense_data
    GROUP BY category_id, category_name
    ORDER BY total DESC
    LIMIT 1
  ),
  payment_totals AS (
    SELECT 
      jsonb_object_agg(
        payment_method,
        total
      ) AS breakdown
    FROM (
      SELECT 
        payment_method,
        SUM(amount) AS total
      FROM expense_data
      GROUP BY payment_method
    ) pm
  )
  SELECT 
    COALESCE(SUM(ed.amount), 0)::BIGINT,
    COUNT(ed.*)::INTEGER,
    ct.category_id,
    ct.category_name,
    ct.total::BIGINT,
    COALESCE(pt.breakdown, '{}'::jsonb)
  FROM expense_data ed
  CROSS JOIN category_totals ct
  CROSS JOIN payment_totals pt
  GROUP BY ct.category_id, ct.category_name, ct.total, pt.breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. PERMISSÕES
-- ============================================
-- Adicionar coluna de permissão na tabela usuarios (se não existir)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'pode_ver_despesas'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN pode_ver_despesas BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 7. COMENTÁRIOS (Documentação)
-- ============================================

COMMENT ON TABLE categorias_despesas IS 'Categorias customizáveis de despesas por estabelecimento';
COMMENT ON TABLE despesas IS 'Registro de todas as despesas do estabelecimento';

COMMENT ON COLUMN despesas.amount IS 'Valor em centavos para evitar problemas com precisão decimal';
COMMENT ON COLUMN despesas.recurring IS 'Indica se é uma despesa recorrente (mensal, semanal, etc)';
COMMENT ON COLUMN despesas.recurring_frequency IS 'Frequência da recorrência (daily, weekly, monthly, yearly)';
COMMENT ON COLUMN despesas.recurring_day IS 'Dia do mês/semana para gerar a despesa recorrente';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
