-- Migration: Adicionar campo duracao_total à tabela pacotes
-- Data: 2026-01-29
-- Descrição: Adiciona coluna duracao_total (INTEGER, NULLABLE) para armazenar
--            a duração total calculada do pacote em minutos

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pacotes' 
    AND column_name = 'duracao_total'
  ) THEN
    ALTER TABLE pacotes 
    ADD COLUMN duracao_total INTEGER;
    
    COMMENT ON COLUMN pacotes.duracao_total IS 'Duração total do pacote em minutos (soma das durações dos serviços)';
  END IF;
END $$;

-- Nota: A coluna é NULLABLE e não tem valor DEFAULT
-- O cálculo da duração total é feito pela aplicação ao carregar os pacotes
-- Soma: duracao_servico * quantidade para cada serviço do pacote
