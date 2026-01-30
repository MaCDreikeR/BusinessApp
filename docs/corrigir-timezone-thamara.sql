-- Corrigir agendamento da Thamara para 18:00 BRT
-- O agendamento está salvo como 19:00:00+00 (UTC)
-- Precisa ser 18:00:00-03 (BRT)

-- Verificar ANTES da correção
SELECT 
    id,
    cliente,
    data_hora,
    TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS TZ') as data_hora_formatada,
    horario_termino
FROM agendamentos
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- CORREÇÃO: Atualizar para 18:00 no timezone correto
UPDATE agendamentos
SET 
    data_hora = '2026-01-29 18:00:00-03'::timestamptz,
    updated_at = NOW()
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- Verificar DEPOIS da correção
SELECT 
    id,
    cliente,
    data_hora,
    TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS TZ') as data_hora_formatada,
    TO_CHAR(data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as hora_brt,
    horario_termino
FROM agendamentos
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- Resultado esperado:
-- data_hora: 2026-01-29 18:00:00-03
-- hora_brt: 18:00:00
-- horario_termino: 18:45:00
