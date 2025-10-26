-- ============================================
-- 🚨 SOLUÇÃO IMEDIATA: DESABILITAR RLS
-- Execute isto AGORA para voltar a funcionar
-- ============================================

-- Desabilitar RLS na tabela usuarios
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas problemáticas
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_same_establishment" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_super_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_super_admin" ON usuarios;
DROP POLICY IF EXISTS "Leitura: super_admin ou membros do estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Leitura: usuários do mesmo estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Permitir atualização de perfil" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem editar seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seu perfil" ON usuarios;
DROP POLICY IF EXISTS "Permitir criação do primeiro usuário" ON usuarios;
DROP POLICY IF EXISTS "Permitir criação de usuários" ON usuarios;
DROP POLICY IF EXISTS "Super admin pode deletar usuários" ON usuarios;
DROP POLICY IF EXISTS "select_usuarios_mesmo_estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "update_usuarios_perfil" ON usuarios;
DROP POLICY IF EXISTS "insert_usuarios" ON usuarios;
DROP POLICY IF EXISTS "delete_usuarios" ON usuarios;
DROP POLICY IF EXISTS "usuarios_leitura_estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "usuarios_atualizacao" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insercao" ON usuarios;
DROP POLICY IF EXISTS "usuarios_exclusao" ON usuarios;

-- Confirmar que não há mais políticas
SELECT count(*) as total_policies FROM pg_policies WHERE tablename = 'usuarios';

-- TESTAR LOGIN
SELECT 
  id,
  nome_completo,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE email = 'techcell.tc@gmail.com';
