-- ============================================
-- CRIAR FUNCTION RPC PARA BUSCAR USUÁRIOS
-- Executa com privilégios elevados, ignorando RLS
-- ============================================

-- Primeiro, remover a função antiga se existir
DROP FUNCTION IF EXISTS get_usuarios_estabelecimento(UUID);

-- FUNÇÃO PARA BUSCAR USUÁRIOS DO ESTABELECIMENTO
CREATE OR REPLACE FUNCTION get_usuarios_estabelecimento(p_estabelecimento_id UUID)
RETURNS TABLE (
  id UUID,
  nome_completo TEXT,
  email TEXT,
  avatar_url TEXT,
  faz_atendimento BOOLEAN,
  role TEXT,
  estabelecimento_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do dono da função (bypass RLS)
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário logado pertence ao estabelecimento ou é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u2
    WHERE u2.id = auth.uid() 
    AND (
      u2.estabelecimento_id = p_estabelecimento_id 
      OR u2.role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a este estabelecimento';
  END IF;

  -- Retornar todos os usuários do estabelecimento (exceto super_admin)
  RETURN QUERY
  SELECT 
    u.id,
    u.nome_completo,
    u.email,
    u.avatar_url,
    u.faz_atendimento,
    u.role,
    u.estabelecimento_id
  FROM usuarios u
  WHERE u.estabelecimento_id = p_estabelecimento_id
    AND u.role != 'super_admin'
  ORDER BY u.nome_completo;
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_usuarios_estabelecimento(UUID) TO authenticated;

-- TESTAR A FUNÇÃO
-- Opção 1: Se você estiver logado no SQL Editor (vai validar)
-- SELECT * FROM get_usuarios_estabelecimento('86592b4b-9872-4d52-a6bb-6458d8f53f5e');

-- Opção 2: Teste direto sem validação (apenas para confirmar estrutura)
SELECT 
  id,
  nome_completo,
  email,
  avatar_url,
  faz_atendimento,
  role,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND role != 'super_admin'
ORDER BY nome_completo;
