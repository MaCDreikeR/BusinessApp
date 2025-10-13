-- ============================
-- TESTE RÁPIDO DE PERMISSÕES
-- ============================
-- Execute isso no Supabase Studio para criar um registro de teste

-- 1. Verificar se a tabela existe
SELECT table_name FROM information_schema.tables WHERE table_name = 'permissoes_usuario';

-- 2. Se não existir, criar uma versão simples
CREATE TABLE IF NOT EXISTS permissoes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    estabelecimento_id UUID NOT NULL,
    pode_gerenciar_usuarios BOOLEAN DEFAULT true,
    pode_ver_configuracoes BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, estabelecimento_id)
);

-- 3. Inserir um registro de teste para o seu usuário
-- SUBSTITUA os valores pelos seus IDs reais
INSERT INTO permissoes_usuario (
    user_id, 
    estabelecimento_id, 
    pode_gerenciar_usuarios,
    pode_ver_configuracoes
) VALUES (
    '686b00e6-b993-4251-bf8c-bbdfd8bca6b9'::uuid,  -- SEU USER ID
    '86592b4b-9872-4d52-a6bb-6458d8f53f5e'::uuid,  -- SEU ESTABELECIMENTO ID
    true,  -- pode_gerenciar_usuarios
    true   -- pode_ver_configuracoes
)
ON CONFLICT (user_id, estabelecimento_id) 
DO UPDATE SET 
    pode_gerenciar_usuarios = EXCLUDED.pode_gerenciar_usuarios,
    pode_ver_configuracoes = EXCLUDED.pode_ver_configuracoes;

-- 4. Verificar se foi inserido
SELECT * FROM permissoes_usuario WHERE user_id = '686b00e6-b993-4251-bf8c-bbdfd8bca6b9';