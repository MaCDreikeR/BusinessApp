-- ============================
-- CRIAR TABELA CONFIGURACOES_MENSAGENS
-- ============================
-- Este arquivo deve ser executado no Supabase Studio
-- Vá em Database > SQL Editor e execute este código

-- 1. Criar a tabela de configurações de mensagens
CREATE TABLE IF NOT EXISTS public.configuracoes_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('agendamento', 'aniversariante')),
    modelo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada empresa tenha apenas um modelo de cada tipo
    UNIQUE(empresa_id, tipo)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_mensagens_empresa_id 
ON configuracoes_mensagens(empresa_id);

CREATE INDEX IF NOT EXISTS idx_configuracoes_mensagens_tipo 
ON configuracoes_mensagens(tipo);

-- 3. Adicionar comentários
COMMENT ON TABLE configuracoes_mensagens IS 'Armazena modelos de mensagens personalizadas para WhatsApp';
COMMENT ON COLUMN configuracoes_mensagens.empresa_id IS 'Referência ao estabelecimento';
COMMENT ON COLUMN configuracoes_mensagens.tipo IS 'Tipo de mensagem: agendamento ou aniversariante';
COMMENT ON COLUMN configuracoes_mensagens.modelo IS 'Template da mensagem com placeholders';

-- 4. Criar políticas RLS (Row Level Security)
ALTER TABLE configuracoes_mensagens ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver configurações do próprio estabelecimento
CREATE POLICY "usuarios_podem_ver_configuracoes_mensagens"
ON configuracoes_mensagens FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes_mensagens.empresa_id
    )
);

-- Política INSERT: admin e is_principal podem criar configurações
CREATE POLICY "admin_pode_criar_configuracoes_mensagens"
ON configuracoes_mensagens FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes_mensagens.empresa_id
        AND (usuarios.role IN ('admin', 'super_admin') OR usuarios.is_principal = true)
    )
);

-- Política UPDATE: admin e is_principal podem atualizar configurações
CREATE POLICY "admin_pode_atualizar_configuracoes_mensagens"
ON configuracoes_mensagens FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes_mensagens.empresa_id
        AND (usuarios.role IN ('admin', 'super_admin') OR usuarios.is_principal = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes_mensagens.empresa_id
        AND (usuarios.role IN ('admin', 'super_admin') OR usuarios.is_principal = true)
    )
);

-- Política DELETE: apenas super_admin pode deletar
CREATE POLICY "super_admin_pode_deletar_configuracoes_mensagens"
ON configuracoes_mensagens FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.role = 'super_admin'
    )
);

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_configuracoes_mensagens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_mensagens_updated_at
BEFORE UPDATE ON configuracoes_mensagens
FOR EACH ROW
EXECUTE FUNCTION update_configuracoes_mensagens_updated_at();

-- 6. Conceder permissões
GRANT ALL ON configuracoes_mensagens TO authenticated;

-- 7. Verificar se a tabela foi criada corretamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'configuracoes_mensagens'
ORDER BY ordinal_position;
