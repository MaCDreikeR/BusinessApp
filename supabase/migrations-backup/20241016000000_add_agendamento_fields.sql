-- Adicionar campos de horário de término e criação automática de comanda
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS horario_termino TIME,
ADD COLUMN IF NOT EXISTS criar_comanda_automatica BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'agendado';

-- Criar índice para melhorar performance de consultas por status
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- Criar índice composto para consultas de data e horário
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_horario ON agendamentos(data_hora, horario_termino);

-- Comentários para documentação
COMMENT ON COLUMN agendamentos.horario_termino IS 'Horário de término do agendamento';
COMMENT ON COLUMN agendamentos.criar_comanda_automatica IS 'Indica se uma comanda deve ser criada automaticamente no dia do agendamento';
COMMENT ON COLUMN agendamentos.status IS 'Status do agendamento: agendado, confirmado, em_atendimento, concluido, cancelado, falta';

-- Atualizar registros existentes para ter horário de término baseado na duração do serviço (se houver)
-- Por padrão, adiciona 1 hora ao horário de início se não houver horário de término
UPDATE agendamentos 
SET horario_termino = (data_hora + interval '1 hour')::time
WHERE horario_termino IS NULL;
