-- Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chave TEXT NOT NULL,
    valor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, chave)
);

-- Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_configuracoes_user_id ON configuracoes(user_id);

-- Habilitar políticas de segurança em nível de linha
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Política para visualização das próprias configurações
CREATE POLICY "Usuários podem visualizar suas próprias configurações"
    ON configuracoes FOR SELECT
    USING (auth.uid() = user_id);

-- Política para inserção de configurações
CREATE POLICY "Usuários podem inserir suas próprias configurações"
    ON configuracoes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para atualização de configurações
CREATE POLICY "Usuários podem atualizar suas próprias configurações"
    ON configuracoes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para exclusão de configurações
CREATE POLICY "Usuários podem excluir suas próprias configurações"
    ON configuracoes FOR DELETE
    USING (auth.uid() = user_id); 