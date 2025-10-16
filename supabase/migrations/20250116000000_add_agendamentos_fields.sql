-- Migration: Adicionar campos horario_termino, status e criar_comanda_automatica na tabela agendamentos
-- Data: 2025-01-16

-- Adicionar coluna horario_termino (horário de término do agendamento)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS horario_termino TIME;

-- Adicionar coluna status com valores específicos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'agendado' 
CHECK (status IN ('agendado', 'confirmado', 'cancelado', 'finalizado'));

-- Adicionar coluna criar_comanda_automatica (flag para criar comanda automaticamente no dia)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS criar_comanda_automatica BOOLEAN DEFAULT true;

-- Adicionar coluna telefone do cliente (pode ser útil para o modal)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Adicionar coluna valor_total (calculado dos serviços)
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2);

-- Criar índice para melhorar performance nas consultas por status
CREATE INDEX IF NOT EXISTS idx_agendamentos_status 
ON agendamentos(status);

-- Criar índice para melhorar performance nas consultas por data e status
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
ON agendamentos(data_hora, status);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN agendamentos.horario_termino IS 'Horário de término do agendamento (opcional)';
COMMENT ON COLUMN agendamentos.status IS 'Status do agendamento: agendado, confirmado, cancelado ou finalizado';
COMMENT ON COLUMN agendamentos.criar_comanda_automatica IS 'Se true, cria uma comanda automaticamente no dia do agendamento';
COMMENT ON COLUMN agendamentos.telefone IS 'Telefone do cliente para contato';
COMMENT ON COLUMN agendamentos.valor_total IS 'Valor total dos serviços do agendamento';
