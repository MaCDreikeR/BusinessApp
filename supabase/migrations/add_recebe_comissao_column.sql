-- Adicionar coluna recebe_comissao na tabela usuarios
-- Para controlar quais usuários podem receber comissões

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'usuarios' 
    AND column_name = 'recebe_comissao'
  ) THEN
    -- Adicionar coluna
    ALTER TABLE usuarios 
    ADD COLUMN recebe_comissao BOOLEAN DEFAULT NULL;

    -- Comentário explicativo
    COMMENT ON COLUMN usuarios.recebe_comissao IS 'Define se o usuário pode receber comissões. NULL = usar padrão baseado na role (funcionario/profissional = true, principal = false)';

    -- Criar índice para otimizar consultas
    CREATE INDEX IF NOT EXISTS idx_usuarios_recebe_comissao 
    ON usuarios(recebe_comissao) 
    WHERE recebe_comissao IS NOT NULL;

    RAISE NOTICE 'Coluna recebe_comissao adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna recebe_comissao já existe.';
  END IF;
END $$;
