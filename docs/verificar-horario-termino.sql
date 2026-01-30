-- Verificar formato do campo horario_termino
-- Execute este SQL no Supabase SQL Editor

-- 1. Ver agendamento da Thamara
SELECT 
    id,
    cliente,
    data_hora,
    horario_termino,
    EXTRACT(EPOCH FROM (horario_termino::time - data_hora::time)) / 60 as duracao_minutos,
    status
FROM agendamentos
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29'
ORDER BY data_hora DESC;

-- 2. Ver formato exato do horario_termino
SELECT 
    cliente,
    horario_termino,
    horario_termino::text as horario_termino_texto,
    pg_typeof(horario_termino) as tipo_campo
FROM agendamentos
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29';

-- 3. Calcular duração esperada
SELECT 
    cliente,
    TO_CHAR(data_hora, 'HH24:MI') as horario_inicio,
    horario_termino::text as horario_fim,
    CASE 
        WHEN horario_termino IS NOT NULL THEN
            EXTRACT(EPOCH FROM (
                (data_hora::date + horario_termino::time) - data_hora
            )) / 60
        ELSE NULL
    END as duracao_minutos_calculada
FROM agendamentos
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29';

-- 4. Ver todos agendamentos do dia com duração
SELECT 
    cliente,
    TO_CHAR(data_hora, 'HH24:MI') as inicio,
    horario_termino::text as termino,
    CASE 
        WHEN horario_termino IS NOT NULL THEN
            EXTRACT(EPOCH FROM (
                (data_hora::date + horario_termino::time) - data_hora
            )) / 60
        ELSE NULL
    END as duracao_min
FROM agendamentos
WHERE data_hora::date = '2026-01-29'
ORDER BY data_hora;
