-- Criar schema privado para funções de segurança
CREATE SCHEMA IF NOT EXISTS auth_private;

-- Função para verificar se o usuário tem acesso
CREATE OR REPLACE FUNCTION auth_private.check_user_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = user_id
  );
$$;

-- Remover políticas existentes que podem estar causando recursão
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem editar seus próprios dados" ON usuarios;

-- Criar novas políticas usando a função segura
CREATE POLICY "Usuários podem ver seus próprios dados"
ON usuarios
FOR SELECT
USING (
  auth_private.check_user_access(auth.uid())
  OR
  id = auth.uid()
);

CREATE POLICY "Usuários podem editar seus próprios dados"
ON usuarios
FOR UPDATE
USING (id = auth.uid());

-- Garantir que RLS está ativado
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY; 