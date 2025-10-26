-- ============================================
-- VERIFICAR E CORRIGIR PERMISSÕES DE COMISSÕES
-- ============================================

-- 1. Verificar se as colunas existem
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'permissoes_usuario'
AND column_name IN ('pode_ver_comissoes', 'pode_editar_comissoes')
ORDER BY column_name;

-- 2. Se não retornou nada acima, adicionar as colunas
ALTER TABLE permissoes_usuario
ADD COLUMN IF NOT EXISTS pode_ver_comissoes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pode_editar_comissoes BOOLEAN DEFAULT true;

-- 3. Atualizar todas as permissões existentes para incluir comissões
UPDATE permissoes_usuario
SET 
  pode_ver_comissoes = COALESCE(pode_ver_comissoes, true),
  pode_editar_comissoes = COALESCE(pode_editar_comissoes, true);

-- 4. Verificar os dados do usuário admin atual
SELECT 
  u.nome_completo,
  u.email,
  u.role,
  p.pode_ver_comissoes,
  p.pode_editar_comissoes,
  p.pode_gerenciar_usuarios
FROM usuarios u
LEFT JOIN permissoes_usuario p ON p.usuario_id = u.id
WHERE u.email = 'techcell.tc@gmail.com';

-- 5. Se o usuário admin não tem permissões, criar
INSERT INTO permissoes_usuario (
  usuario_id,
  estabelecimento_id,
  pode_ver_comissoes,
  pode_editar_comissoes,
  pode_gerenciar_usuarios,
  pode_ver_agenda,
  pode_editar_agenda,
  pode_ver_clientes,
  pode_editar_clientes
)
SELECT 
  u.id,
  u.estabelecimento_id,
  true,
  true,
  true,
  true,
  true,
  true,
  true
FROM usuarios u
WHERE u.role = 'admin'
  AND u.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND NOT EXISTS (
    SELECT 1 FROM permissoes_usuario p WHERE p.usuario_id = u.id
  );

-- 6. Listar todas as permissões do estabelecimento
SELECT 
  u.nome_completo,
  u.email,
  u.role,
  p.pode_ver_comissoes,
  p.pode_editar_comissoes
FROM usuarios u
LEFT JOIN permissoes_usuario p ON p.usuario_id = u.id
WHERE u.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY u.nome_completo;
