-- FUNÇÃO RPC PARA ATUALIZAÇÃO DE USUÁRIOS
-- Execute no SQL Editor do Supabase Studio

-- 1. Criar função para atualizar usuários do mesmo estabelecimento
CREATE OR REPLACE FUNCTION update_usuario_estabelecimento(
  usuario_id uuid,
  p_nome_completo text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_faz_atendimento boolean DEFAULT NULL,
  p_estabelecimento_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_data usuarios%ROWTYPE;
  target_user_data usuarios%ROWTYPE;
BEGIN
  -- Buscar dados do usuário logado
  SELECT * INTO current_user_data 
  FROM usuarios 
  WHERE id = auth.uid();
  
  -- Buscar dados do usuário a ser editado
  SELECT * INTO target_user_data 
  FROM usuarios 
  WHERE id = usuario_id;
  
  -- Verificar se os usuários existem
  IF current_user_data.id IS NULL THEN
    RAISE EXCEPTION 'Usuário logado não encontrado';
  END IF;
  
  IF target_user_data.id IS NULL THEN
    RAISE EXCEPTION 'Usuário a ser editado não encontrado';
  END IF;
  
  -- Verificar permissões
  IF NOT (
    -- Super admin pode editar qualquer usuário
    current_user_data.role = 'super_admin'
    OR
    -- Usuário pode editar seu próprio perfil
    current_user_data.id = usuario_id
    OR
    -- Admin ou is_principal pode editar usuários do mesmo estabelecimento
    (
      (current_user_data.is_principal = true OR current_user_data.role = 'admin')
      AND current_user_data.estabelecimento_id = target_user_data.estabelecimento_id
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado para editar este usuário';
  END IF;
  
  -- Atualizar apenas os campos fornecidos
  UPDATE usuarios SET
    nome_completo = COALESCE(p_nome_completo, nome_completo),
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    role = COALESCE(p_role, role),
    faz_atendimento = COALESCE(p_faz_atendimento, faz_atendimento),
    estabelecimento_id = COALESCE(p_estabelecimento_id, estabelecimento_id),
    updated_at = NOW()
  WHERE id = usuario_id;
  
  RETURN true;
END;
$$;

-- 2. Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION update_usuario_estabelecimento(uuid, text, text, text, text, text, boolean, uuid) TO authenticated;