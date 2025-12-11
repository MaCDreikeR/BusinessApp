-- ============================================================================
-- SETUP COMPLETO DO SISTEMA DE RASTREAMENTO DE ATIVIDADE
-- Execute este SQL inteiro no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar se as colunas já existem (não dará erro se já existirem)
DO $$ 
BEGIN
  -- Adicionar last_activity_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna last_activity_at criada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna last_activity_at já existe';
  END IF;

  -- Adicionar dispositivo se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'dispositivo'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN dispositivo TEXT;
    RAISE NOTICE 'Coluna dispositivo criada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna dispositivo já existe';
  END IF;
END $$;

-- 2. Inicializar last_activity_at para usuários que não têm
UPDATE usuarios 
SET last_activity_at = COALESCE(last_activity_at, updated_at, NOW())
WHERE last_activity_at IS NULL;

-- 3. Criar índices para performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_usuarios_last_activity 
ON usuarios(estabelecimento_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_dispositivo 
ON usuarios(estabelecimento_id, dispositivo);

-- 4. Criar função RPC para atualização individual de atividade
-- IMPORTANTE: Esta função atualiza APENAS o usuário especificado
CREATE OR REPLACE FUNCTION update_my_activity(
  p_user_id UUID,
  p_device_info TEXT DEFAULT NULL
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios 
  SET 
    last_activity_at = NOW(),
    dispositivo = COALESCE(p_device_info, dispositivo)
  WHERE id = p_user_id;
  
  RAISE NOTICE 'Atividade atualizada para usuário %', p_user_id;
END;
$$;

-- Garantir que usuários autenticados possam chamar a função
GRANT EXECUTE ON FUNCTION update_my_activity(UUID, TEXT) TO authenticated;

-- 5. Criar função RPC para obter usuários online
CREATE OR REPLACE FUNCTION get_online_users(
  p_estabelecimento_id UUID,
  p_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  nome_completo TEXT,
  email TEXT,
  last_activity_at TIMESTAMPTZ,
  last_activity_local TIMESTAMP,
  dispositivo TEXT,
  minutos_atras INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.nome_completo,
    u.email,
    u.last_activity_at,
    (u.last_activity_at AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMP as last_activity_local,
    u.dispositivo,
    EXTRACT(EPOCH FROM (NOW() - u.last_activity_at))::INTEGER / 60 as minutos_atras
  FROM usuarios u
  WHERE u.estabelecimento_id = p_estabelecimento_id
    AND u.last_activity_at >= NOW() - (p_minutes || ' minutes')::INTERVAL
  ORDER BY u.last_activity_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_online_users(UUID, INTEGER) TO authenticated;

-- 6. Criar view para facilitar consultas de atividade
CREATE OR REPLACE VIEW v_user_activity AS
SELECT 
  u.id,
  u.estabelecimento_id,
  u.nome_completo,
  u.email,
  u.role,
  u.last_activity_at as last_activity_utc,
  u.last_activity_at AT TIME ZONE 'America/Sao_Paulo' as last_activity_brasilia,
  u.dispositivo,
  EXTRACT(EPOCH FROM (NOW() - u.last_activity_at))/60 as minutos_desde_ultima_atividade,
  CASE 
    WHEN u.last_activity_at >= NOW() - INTERVAL '3 minutes' THEN true
    ELSE false
  END as esta_online
FROM usuarios u
WHERE u.last_activity_at IS NOT NULL;

-- 7. Verificação final - Mostrar status atual
SELECT 
  '✅ Setup concluído!' as status,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN last_activity_at >= NOW() - INTERVAL '3 minutes' THEN 1 END) as usuarios_online,
  COUNT(DISTINCT dispositivo) as total_dispositivos
FROM usuarios
WHERE estabelecimento_id IS NOT NULL;

-- 8. Instruções de uso
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Sistema de rastreamento de atividade instalado!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 FUNCIONALIDADES DISPONÍVEIS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Atualização automática via heartbeat no app';
  RAISE NOTICE '2. Atualização manual: SELECT update_my_activity(''user-uuid-aqui'', ''device-info'');';
  RAISE NOTICE '3. Ver usuários online: SELECT * FROM get_online_users(''estabelecimento-uuid'', 3);';
  RAISE NOTICE '4. View de atividade: SELECT * FROM v_user_activity;';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 TESTES SUGERIDOS:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Ver todos os usuários com atividade (horário local BR)';
  RAISE NOTICE 'SELECT * FROM v_user_activity WHERE esta_online = true;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Forçar atualização de um usuário específico';
  RAISE NOTICE 'SELECT update_my_activity(''seu-user-uuid'', ''Meu Dispositivo'');';
  RAISE NOTICE '';
  RAISE NOTICE '-- Ver usuários online nos últimos 3 minutos';
  RAISE NOTICE 'SELECT * FROM get_online_users(''seu-estabelecimento-uuid'', 3);';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
