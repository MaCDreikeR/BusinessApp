-- Script de Debug para Rastreamento de Atividade

-- 1. Ver usuários e suas atividades recentes
SELECT 
    id,
    nome_completo,
    email,
    dispositivo,
    last_activity_at AT TIME ZONE 'America/Sao_Paulo' as last_activity_brasilia,
    last_activity_at as last_activity_utc,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    NOW() as agora_utc,
    EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60 as minutos_desde_ultima_atividade,
    estabelecimento_id
FROM usuarios
WHERE estabelecimento_id IS NOT NULL
ORDER BY last_activity_at DESC NULLS LAST
LIMIT 20;

-- 2. Ver quantos usuários estão online (últimos 10 minutos)
SELECT 
    COUNT(*) as usuarios_online,
    estabelecimento_id
FROM usuarios
WHERE estabelecimento_id IS NOT NULL
  AND last_activity_at > NOW() - INTERVAL '10 minutes'
GROUP BY estabelecimento_id;

-- 3. Ver dispositivos únicos por estabelecimento
SELECT 
    estabelecimento_id,
    dispositivo,
    MAX(last_activity_at) AT TIME ZONE 'America/Sao_Paulo' as ultimo_acesso_brasilia,
    COUNT(*) as usuarios_com_este_dispositivo
FROM usuarios
WHERE estabelecimento_id IS NOT NULL
  AND dispositivo IS NOT NULL
  AND last_activity_at > NOW() - INTERVAL '30 days'
GROUP BY estabelecimento_id, dispositivo
ORDER BY estabelecimento_id, MAX(last_activity_at) DESC;

-- 4. Forçar atualização de last_activity_at para NOW() (apenas para teste)
-- DESCOMENTE para executar:
-- UPDATE usuarios 
-- SET last_activity_at = NOW() 
-- WHERE email = 'SEU_EMAIL_AQUI';

-- 5. Verificar se as colunas existem
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name IN ('last_activity_at', 'dispositivo');

-- 6. Ver timezone configurado no banco
SHOW timezone;

-- 7. Verificar índices
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'usuarios' 
AND indexname LIKE '%activity%';
