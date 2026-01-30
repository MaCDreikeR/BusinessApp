-- RPC para criar agendamento com timezone correto
-- Execute isso no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION criar_agendamento_timezone(
  p_cliente TEXT,
  p_telefone TEXT,
  p_data_hora TIMESTAMPTZ,
  p_horario_termino TIME,
  p_servicos JSONB,
  p_valor_total NUMERIC,
  p_observacoes TEXT,
  p_estabelecimento_id UUID,
  p_status TEXT,
  p_usuario_id UUID,
  p_criar_comanda_automatica BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_agendamento_id UUID;
BEGIN
  INSERT INTO agendamentos (
    cliente,
    telefone,
    data_hora,
    horario_termino,
    servicos,
    valor_total,
    observacoes,
    estabelecimento_id,
    status,
    usuario_id,
    criar_comanda_automatica
  ) VALUES (
    p_cliente,
    p_telefone,
    p_data_hora,
    p_horario_termino,
    p_servicos,
    p_valor_total,
    p_observacoes,
    p_estabelecimento_id,
    p_status,
    p_usuario_id,
    p_criar_comanda_automatica
  )
  RETURNING id INTO v_agendamento_id;
  
  RETURN v_agendamento_id;
END;
$$;
