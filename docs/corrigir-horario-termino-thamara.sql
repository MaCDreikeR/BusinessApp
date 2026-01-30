-- Corrigir APENAS o horario_termino do agendamento da Thamara
-- O data_hora está correto (18:00 BRT)
-- O horario_termino está errado (19:45 ao invés de 18:45)

-- Verificar ANTES
SELECT 
    id,
    cliente,
    TO_CHAR(data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as hora_inicio_brt,
    horario_termino,
    horario_termino::time - INTERVAL '1 hour' as horario_termino_corrigido
FROM agendamentos
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- CORREÇÃO: Subtrair 1 hora do horario_termino
UPDATE agendamentos
SET 
    horario_termino = (horario_termino::time - INTERVAL '1 hour')::time,
    updated_at = NOW()
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- Verificar DEPOIS
SELECT 
    id,
    cliente,
    TO_CHAR(data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as hora_inicio_brt,
    horario_termino,
    (horario_termino::time::interval - 
     (data_hora AT TIME ZONE 'America/Sao_Paulo')::time::interval) as duracao
FROM agendamentos
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';

-- Resultado esperado:
-- hora_inicio_brt: 18:00:00
-- horario_termino: 18:45:00
-- duracao: 00:45:00
