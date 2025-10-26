-- SCRIPT PARA VERIFICAR E CORRIGIR POLICIES RLS EM AGENDAMENTOS
-- Execute no SQL Editor do Supabase Studio

-- 1. Verificar policies existentes na tabela agendamentos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'agendamentos';

-- 2. Verificar policies existentes na tabela usuarios  
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios';

-- 3. Testar consulta direta para debug (execute como usuário logado)
-- SELECT 
--   a.*,
--   u.nome_completo as usuario_nome
-- FROM agendamentos a
-- LEFT JOIN usuarios u ON a.usuario_id = u.id
-- WHERE a.estabelecimento_id = 'SEU_ESTABELECIMENTO_ID_AQUI'
--   AND a.data_hora >= NOW()
-- ORDER BY a.data_hora ASC
-- LIMIT 5;

-- 4. CORREÇÃO NECESSÁRIA: A policy de leitura de usuarios está muito restritiva
-- Ela só permite ver super_admin ou o próprio usuário, impedindo ver outros usuários do estabelecimento

-- Corrigir policy de leitura de usuarios para permitir ver membros do mesmo estabelecimento
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;

CREATE POLICY "Leitura: super_admin ou membros do estabelecimento" ON usuarios
FOR SELECT USING (
  (role = 'super_admin'::text) 
  OR 
  (id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM usuarios u_logado 
    WHERE u_logado.id = auth.uid() 
    AND u_logado.estabelecimento_id = usuarios.estabelecimento_id
    AND u_logado.estabelecimento_id IS NOT NULL
  )
);

-- 5. Opcional: Criar policy para agendamentos se não existir
/*
CREATE POLICY "Usuarios podem ver agendamentos do estabelecimento" ON agendamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.estabelecimento_id = agendamentos.estabelecimento_id
      OR u.role = 'super_admin'
    )
  )
);
*/