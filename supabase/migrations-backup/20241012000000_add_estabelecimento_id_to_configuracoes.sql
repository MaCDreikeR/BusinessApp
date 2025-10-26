-- Adicionar coluna estabelecimento_id na tabela configuracoes
ALTER TABLE configuracoes 
ADD COLUMN estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE;

-- Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_configuracoes_estabelecimento_id ON configuracoes(estabelecimento_id);

-- Atualizar políticas de segurança para considerar estabelecimento_id
-- Política para visualização de configurações por estabelecimento
CREATE POLICY "Usuários podem visualizar configurações do seu estabelecimento"
    ON configuracoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
        )
    );

-- Política para inserção de configurações por estabelecimento
CREATE POLICY "Usuários podem inserir configurações do seu estabelecimento"
    ON configuracoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
        )
    );

-- Política para atualização de configurações por estabelecimento
CREATE POLICY "Usuários podem atualizar configurações do seu estabelecimento"
    ON configuracoes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
        )
    );

-- Política para exclusão de configurações por estabelecimento
CREATE POLICY "Usuários podem excluir configurações do seu estabelecimento"
    ON configuracoes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
        )
    );