-- Criar função RPC para atualizar atividade dos usuários
CREATE OR REPLACE FUNCTION update_user_activity(p_estabelecimento_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE usuarios
  SET last_activity_at = NOW()
  WHERE estabelecimento_id = p_estabelecimento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION update_user_activity(UUID) TO authenticated;

-- Comentário
COMMENT ON FUNCTION update_user_activity IS 'Atualiza last_activity_at de todos os usuários de um estabelecimento';
