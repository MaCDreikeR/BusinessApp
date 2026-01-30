-- 🔧 Migração: Corrigir agendamentos salvos com timezone incorreto
-- 
-- Problema: Agendamentos foram salvos com string ISO SEM offset timezone
-- Exemplo: '2026-01-30T00:30:00' foi interpretado como UTC pelo PostgreSQL
-- Resultado: Agendamentos aparecem na data/hora errada (1 dia antes, 3 horas antes)
--
-- Solução: Agora createLocalISOString() gera strings COM offset -03:00
-- Agendamentos NOVOS serão salvos corretamente
-- Agendamentos ANTIGOS podem precisar de correção manual
--
-- Para DEBUG: Verificar agendamentos e seus horários
SELECT 
  id,
  cliente,
  data_hora,
  data_hora AT TIME ZONE 'America/Sao_Paulo' as "horário_local_BRT",
  TO_CHAR(data_hora, 'YYYY-MM-DD HH:MM:SS TZ') as "formatado"
FROM agendamentos
ORDER BY data_hora DESC
LIMIT 10;

-- ℹ️ Se encontrar agendamentos com a data errada, execute uma correção como:
-- UPDATE agendamentos 
-- SET data_hora = '2026-01-30T00:30:00-03:00'::timestamptz
-- WHERE id = 'id_do_agendamento';
