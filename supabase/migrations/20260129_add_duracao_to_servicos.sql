-- Migration: Adicionar campo duracao à tabela servicos
-- Data: 29/01/2026
-- Descrição: Adiciona coluna duracao (em minutos) para registrar o tempo estimado de cada serviço
-- CAMPO OPCIONAL: Permite valores NULL

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'servicos' 
        AND column_name = 'duracao'
    ) THEN
        -- Adicionar coluna duracao (INTEGER, NULLABLE, sem valor padrão)
        ALTER TABLE servicos 
        ADD COLUMN duracao INTEGER;
        
        RAISE NOTICE 'Coluna duracao adicionada com sucesso à tabela servicos';
    ELSE
        RAISE NOTICE 'Coluna duracao já existe na tabela servicos';
    END IF;
END $$;

-- Adicionar comentário à coluna
COMMENT ON COLUMN servicos.duracao IS 'Duração estimada do serviço em minutos (opcional)';
