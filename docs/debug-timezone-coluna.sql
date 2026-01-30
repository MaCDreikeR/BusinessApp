-- Verificar tipo da coluna data_hora
SELECT 
    column_name,
    data_type,
    datetime_precision,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'agendamentos' 
  AND column_name = 'data_hora';

-- Verificar agendamento da Thamara
SELECT 
    id,
    cliente,
    data_hora,
    data_hora AT TIME ZONE 'UTC' as data_hora_utc,
    data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_brt,
    TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS TZ') as data_hora_formatada,
    horario_termino,
    created_at
FROM agendamentos
WHERE cliente = 'Thamara'
  AND data_hora::date = '2026-01-29'
ORDER BY created_at DESC
LIMIT 1;
