-- Script para verificar se a correção de timezone está funcionando
-- Execute este script após criar um agendamento às 19:00

-- 1. Verificar formato atual dos agendamentos
SELECT 
  id,
  cliente,
  data_hora,
  data_hora::text as formato_iso,
  EXTRACT(HOUR FROM data_hora) as hora_local,
  EXTRACT(TIMEZONE_HOUR FROM data_hora) as timezone_offset
FROM agendamentos
WHERE DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
ORDER BY data_hora
LIMIT 10;

-- 2. Verificar se há agendamentos com offset correto (-03:00)
SELECT 
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE data_hora::text LIKE '%-%:%') as com_offset_negativo,
  COUNT(*) FILTER (WHERE data_hora::text LIKE '%-03:%') as com_offset_brt
FROM agendamentos
WHERE created_at > NOW() - INTERVAL '1 day';

-- 3. Comparação: agendamentos antigos (com bug) vs novos (corrigidos)
SELECT 
  'Antigos (antes da correção)' as tipo,
  MIN(EXTRACT(HOUR FROM data_hora)) as menor_hora,
  MAX(EXTRACT(HOUR FROM data_hora)) as maior_hora,
  COUNT(*) as quantidade
FROM agendamentos
WHERE created_at < NOW() - INTERVAL '1 day'

UNION ALL

SELECT 
  'Novos (após correção)' as tipo,
  MIN(EXTRACT(HOUR FROM data_hora)) as menor_hora,
  MAX(EXTRACT(HOUR FROM data_hora)) as maior_hora,
  COUNT(*) as quantidade
FROM agendamentos
WHERE created_at >= NOW() - INTERVAL '1 day';

-- 4. Verificar agendamentos de hoje (deve mostrar horários corretos)
SELECT 
  cliente,
  TO_CHAR(data_hora, 'DD/MM/YYYY HH24:MI') as horario_formatado,
  data_hora::text as iso_completo,
  CASE 
    WHEN data_hora::text LIKE '%-03:%' THEN '✅ BRT Correto'
    WHEN data_hora::text LIKE '%+00:%' THEN '❌ UTC (Bug)'
    ELSE '⚠️  Verificar'
  END as status_timezone
FROM agendamentos
WHERE DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
ORDER BY data_hora;

-- 5. Teste específico: Se você criou às 19:00, deve aparecer 19
SELECT 
  cliente,
  data_hora,
  EXTRACT(HOUR FROM data_hora) as hora,
  CASE 
    WHEN EXTRACT(HOUR FROM data_hora) = 19 THEN '✅ CORRETO (19:00)'
    WHEN EXTRACT(HOUR FROM data_hora) = 22 THEN '❌ BUG UTC (salvou 22:00)'
    WHEN EXTRACT(HOUR FROM data_hora) = 16 THEN '❌ BUG RENDERIZAÇÃO (mostra 16:00)'
    ELSE '⚠️  Hora inesperada: ' || EXTRACT(HOUR FROM data_hora)::text
  END as diagnostico
FROM agendamentos
WHERE DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
  AND cliente ILIKE '%teste%'  -- Ajuste para o nome do cliente de teste
ORDER BY data_hora DESC
LIMIT 5;

-- 6. Estatísticas de distribuição de horários (deve estar natural: 8h-20h)
SELECT 
  EXTRACT(HOUR FROM data_hora) as hora,
  COUNT(*) as quantidade,
  REPEAT('█', (COUNT(*) * 50 / MAX(COUNT(*)) OVER())::int) as grafico
FROM agendamentos
WHERE DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM data_hora)
ORDER BY hora;

-- 7. Verificar se há agendamentos "impossíveis" (madrugada)
SELECT 
  COUNT(*) as agendamentos_madrugada,
  MIN(data_hora) as primeiro,
  MAX(data_hora) as ultimo
FROM agendamentos
WHERE EXTRACT(HOUR FROM data_hora) BETWEEN 0 AND 6
  AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') >= CURRENT_DATE - INTERVAL '30 days';

/* 
INTERPRETAÇÃO DOS RESULTADOS:

✅ SUCESSO (correção funcionando):
- Todos os agendamentos novos têm offset "-03:00"
- Horários entre 8h-20h (horário comercial)
- Hora local = hora que o usuário digitou
- Sem agendamentos na madrugada (0h-6h)

❌ FALHA (bug ainda presente):
- Agendamentos com offset "+00:00" ou sem offset
- Horários deslocados (ex: 16h, 22h quando deveria ser 19h)
- Muitos agendamentos na madrugada
- Diferença de 3h entre esperado e real

⚠️  ATENÇÃO:
- Se houver mix de formatos, alguns agendamentos ainda usam código antigo
- Verificar se o app foi recarregado após as mudanças
*/
