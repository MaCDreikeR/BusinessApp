-- CORREÇÃO URGENTE: Policy de usuarios impede ver outros membros do estabelecimento
-- Execute no SQL Editor do Supabase Studio

-- PROBLEMA IDENTIFICADO:
-- A policy atual só permite ver super_admin ou próprio usuário
-- Isso impede ver dados de outros usuários do mesmo estabelecimento nos agendamentos

-- SOLUÇÃO: Atualizar policy para permitir ver membros do mesmo estabelecimento
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

CREATE POLICY "Leitura: super_admin ou membros do estabelecimento" ON usuarios
FOR SELECT USING (
  -- Super admin pode ver todos
  (role = 'super_admin'::text) 
  OR 
  -- Pode ver a si mesmo
  (id = auth.uid())
  OR
  -- Pode ver outros usuários do mesmo estabelecimento
  EXISTS (
    SELECT 1 FROM usuarios u_logado 
    WHERE u_logado.id = auth.uid() 
    AND u_logado.estabelecimento_id = usuarios.estabelecimento_id
    AND u_logado.estabelecimento_id IS NOT NULL
  )
);

-- Verificar se a policy foi criada corretamente
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios' 
AND policyname = 'Leitura: super_admin ou membros do estabelecimento';