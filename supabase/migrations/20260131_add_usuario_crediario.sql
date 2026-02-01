-- Migration: Adicionar usuario_id em crediario_movimentacoes
-- Data: 2026-01-31
-- Descrição: Adiciona coluna usuario_id para rastrear quem fez a movimentação

-- Adicionar coluna usuario_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crediario_movimentacoes' 
        AND column_name = 'usuario_id'
    ) THEN
        ALTER TABLE crediario_movimentacoes 
        ADD COLUMN usuario_id uuid REFERENCES usuarios(id);
        
        COMMENT ON COLUMN crediario_movimentacoes.usuario_id IS 'Usuário que registrou a movimentação';
    END IF;
END $$;

-- Criar índice para melhorar performance nas buscas por usuário
CREATE INDEX IF NOT EXISTS idx_crediario_movimentacoes_usuario_id 
ON crediario_movimentacoes(usuario_id);

-- Criar índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_crediario_movimentacoes_data 
ON crediario_movimentacoes(data DESC);

-- Verificação
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'crediario_movimentacoes' 
AND column_name IN ('usuario_id', 'data')
ORDER BY column_name;
