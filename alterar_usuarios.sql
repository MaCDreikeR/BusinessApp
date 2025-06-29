-- Adiciona a coluna foto_url à tabela usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Atualiza a coluna foto_url para permitir armazenamento de URLs longas
ALTER TABLE usuarios
ALTER COLUMN foto_url TYPE TEXT; 