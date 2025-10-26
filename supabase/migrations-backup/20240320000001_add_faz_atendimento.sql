-- Adicionar campo faz_atendimento na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN faz_atendimento BOOLEAN DEFAULT false;

-- Atualizar comentário da coluna
COMMENT ON COLUMN usuarios.faz_atendimento IS 'Indica se o usuário está disponível para receber agendamentos';

-- Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_faz_atendimento ON usuarios(faz_atendimento); 