-- Corrigir agendamento da Thamara
-- O horário está salvo como 21:00 (UTC) mas deveria ser 18:00 (hora local)

-- 1. Verificar situação atual
SELECT 
    id,
    cliente,
    data_hora,
    data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_local,
    horario_termino,
    status
FROM agendamentos
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29';

-- 2. Corrigir o horário (diminuir 3 horas = voltar de UTC para hora local)
UPDATE agendamentos
SET data_hora = data_hora - INTERVAL '3 hours'
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29'
AND EXTRACT(HOUR FROM data_hora) = 21;

-- 3. Verificar após correção
SELECT 
    id,
    cliente,
    TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS') as data_hora_formatada,
    horario_termino,
    EXTRACT(EPOCH FROM (
        (data_hora::date + horario_termino::time) - data_hora
    )) / 60 as duracao_minutos,
    status
FROM agendamentos
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29';
