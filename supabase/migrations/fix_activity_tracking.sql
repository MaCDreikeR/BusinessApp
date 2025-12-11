-- ============================================================================
-- CORREÇÃO: Remover função antiga e limpar dados incorretos
-- Execute este SQL no Supabase SQL Editor
-- ============================================================================

-- 1. Remover a função antiga que atualizava todos os usuários
DROP FUNCTION IF EXISTS update_user_activity(UUID);

-- 2. Criar/Atualizar função correta que atualiza apenas UM usuário
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

GRANT EXECUTE ON FUNCTION update_my_activity(UUID, TEXT) TO authenticated;

-- 3. Limpar last_activity_at antigos (zerar para forçar novo heartbeat)
-- Isso fará com que apenas usuários realmente logados apareçam como online
UPDATE usuarios 
SET last_activity_at = NULL
WHERE last_activity_at < NOW() - INTERVAL '5 minutes';

-- 4. Atualizar view para usar 3 minutos
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

-- 5. Verificar resultado
SELECT 
  '✅ Correção aplicada!' as status,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN last_activity_at >= NOW() - INTERVAL '3 minutes' THEN 1 END) as usuarios_online_agora,
  COUNT(CASE WHEN last_activity_at IS NULL THEN 1 END) as usuarios_sem_atividade
FROM usuarios
WHERE estabelecimento_id IS NOT NULL;

-- 6. Ver apenas usuários realmente online
SELECT 
  email,
  nome_completo,
  last_activity_at AT TIME ZONE 'America/Sao_Paulo' as ultimo_acesso_local,
  dispositivo,
  EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60 as minutos_atras
FROM usuarios
WHERE last_activity_at >= NOW() - INTERVAL '3 minutes'
ORDER BY last_activity_at DESC;
