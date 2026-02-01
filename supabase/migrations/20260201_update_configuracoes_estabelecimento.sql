-- Migration: Atualizar tabela configuracoes para usar estabelecimento_id
-- =========================================================================
-- Essa migration atualiza a estrutura da tabela configuracoes para usar
-- estabelecimento_id ao invés de user_id, permitindo configurações por
-- estabelecimento (como antecedência mínima de agendamentos)

-- 1. Adicionar coluna estabelecimento_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'configuracoes' 
        AND column_name = 'estabelecimento_id'
    ) THEN
        ALTER TABLE configuracoes 
        ADD COLUMN estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Criar índice para buscas por estabelecimento
CREATE INDEX IF NOT EXISTS idx_configuracoes_estabelecimento_id 
ON configuracoes(estabelecimento_id);

-- 3. Criar índice composto para busca por estabelecimento + chave (mais eficiente)
CREATE INDEX IF NOT EXISTS idx_configuracoes_estabelecimento_chave 
ON configuracoes(estabelecimento_id, chave);

-- 4. Adicionar constraint UNIQUE para estabelecimento_id + chave
-- Isso previne configurações duplicadas para o mesmo estabelecimento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'configuracoes_estabelecimento_chave_key'
    ) THEN
        ALTER TABLE configuracoes 
        ADD CONSTRAINT configuracoes_estabelecimento_chave_key 
        UNIQUE(estabelecimento_id, chave);
    END IF;
END $$;

-- 5. Atualizar políticas RLS para suportar estabelecimento_id

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem visualizar suas próprias configurações" ON configuracoes;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias configurações" ON configuracoes;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias configurações" ON configuracoes;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias configurações" ON configuracoes;

-- Política para SELECT (visualização)
CREATE POLICY "usuarios_podem_ver_config_estabelecimento"
ON configuracoes FOR SELECT
USING (
    -- Permite ver se for do estabelecimento do usuário
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
    )
);

-- Política para INSERT (criação)
CREATE POLICY "usuarios_podem_criar_config_estabelecimento"
ON configuracoes FOR INSERT
WITH CHECK (
    -- Permite criar se for do estabelecimento do usuário
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
    )
);

-- Política para UPDATE (atualização)
CREATE POLICY "usuarios_podem_atualizar_config_estabelecimento"
ON configuracoes FOR UPDATE
USING (
    -- Permite atualizar se for do estabelecimento do usuário
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
    )
);

-- Política para DELETE (exclusão)
CREATE POLICY "usuarios_podem_deletar_config_estabelecimento"
ON configuracoes FOR DELETE
USING (
    -- Permite deletar se for do estabelecimento do usuário
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.estabelecimento_id = configuracoes.estabelecimento_id
    )
);

-- 6. Comentários para documentação
COMMENT ON COLUMN configuracoes.estabelecimento_id IS 'ID do estabelecimento ao qual esta configuração pertence';
COMMENT ON INDEX idx_configuracoes_estabelecimento_id IS 'Índice para busca eficiente por estabelecimento';
COMMENT ON INDEX idx_configuracoes_estabelecimento_chave IS 'Índice composto para busca eficiente por estabelecimento + chave';
