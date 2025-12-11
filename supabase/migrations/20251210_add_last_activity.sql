-- Adicionar colunas para rastreamento de atividade do usuário
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dispositivo TEXT;

-- Atualizar last_activity_at dos usuários existentes com base no updated_at
UPDATE usuarios 
SET last_activity_at = updated_at 
WHERE last_activity_at IS NULL;

-- Criar índices para melhorar performance em queries de usuários online
CREATE INDEX IF NOT EXISTS idx_usuarios_last_activity ON usuarios(estabelecimento_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_dispositivo ON usuarios(estabelecimento_id, dispositivo) WHERE dispositivo IS NOT NULL;

-- Comentários explicativos
COMMENT ON COLUMN usuarios.last_activity_at IS 'Última atividade do usuário no app (atualizada via heartbeat a cada 2 minutos)';
COMMENT ON COLUMN usuarios.dispositivo IS 'Informações do dispositivo do usuário (modelo, SO, etc)';
