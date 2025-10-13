-- ============================
-- SCRIPT DE PERMISSÕES DO USUÁRIO
-- ============================
-- Este arquivo deve ser executado no Supabase Studio
-- Vá em Database > SQL Editor e execute este código

-- 1. Criar a tabela de permissões do usuário
CREATE TABLE IF NOT EXISTS permissoes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    
    -- Permissões do sistema (18 permissões)
    pode_ver_agenda BOOLEAN DEFAULT false,
    pode_editar_agenda BOOLEAN DEFAULT false,
    pode_ver_clientes BOOLEAN DEFAULT false,
    pode_editar_clientes BOOLEAN DEFAULT false,
    pode_ver_servicos BOOLEAN DEFAULT false,
    pode_editar_servicos BOOLEAN DEFAULT false,
    pode_ver_vendas BOOLEAN DEFAULT false,
    pode_editar_vendas BOOLEAN DEFAULT false,
    pode_ver_comandas BOOLEAN DEFAULT false,
    pode_editar_comandas BOOLEAN DEFAULT false,
    pode_ver_estoque BOOLEAN DEFAULT false,
    pode_editar_estoque BOOLEAN DEFAULT false,
    pode_ver_fornecedores BOOLEAN DEFAULT false,
    pode_editar_fornecedores BOOLEAN DEFAULT false,
    pode_ver_relatorios BOOLEAN DEFAULT false,
    pode_ver_configuracoes BOOLEAN DEFAULT false,
    pode_editar_configuracoes BOOLEAN DEFAULT false,
    pode_gerenciar_usuarios BOOLEAN DEFAULT false,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada usuário tenha apenas um registro por estabelecimento
    UNIQUE(user_id, estabelecimento_id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_user_id ON permissoes_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_estabelecimento_id ON permissoes_usuario(estabelecimento_id);

-- 3. Criar políticas RLS (Row Level Security)
ALTER TABLE permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver apenas suas próprias permissões
CREATE POLICY "Usuários podem ver suas próprias permissões" ON permissoes_usuario
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin' 
            AND u.estabelecimento_id = permissoes_usuario.estabelecimento_id
        )
    );

-- Política para INSERT: apenas admins podem criar permissões
CREATE POLICY "Apenas admins podem criar permissões" ON permissoes_usuario
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin' 
            AND u.estabelecimento_id = permissoes_usuario.estabelecimento_id
        )
    );

-- Política para UPDATE: apenas admins podem atualizar permissões
CREATE POLICY "Apenas admins podem atualizar permissões" ON permissoes_usuario
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin' 
            AND u.estabelecimento_id = permissoes_usuario.estabelecimento_id
        )
    );

-- Política para DELETE: apenas admins podem deletar permissões
CREATE POLICY "Apenas admins podem deletar permissões" ON permissoes_usuario
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin' 
            AND u.estabelecimento_id = permissoes_usuario.estabelecimento_id
        )
    );

-- 4. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_permissoes_usuario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_permissoes_usuario_updated_at
    BEFORE UPDATE ON permissoes_usuario
    FOR EACH ROW
    EXECUTE FUNCTION update_permissoes_usuario_updated_at();

-- 6. Criar permissões padrão para usuários existentes (opcional)
-- Descomente as linhas abaixo se quiser criar permissões básicas para todos os usuários existentes

/*
INSERT INTO permissoes_usuario (
    user_id, 
    estabelecimento_id,
    pode_ver_agenda,
    pode_ver_clientes,
    pode_ver_servicos,
    pode_ver_vendas
)
SELECT 
    u.id,
    u.estabelecimento_id,
    true,  -- pode_ver_agenda
    true,  -- pode_ver_clientes  
    true,  -- pode_ver_servicos
    true   -- pode_ver_vendas
FROM usuarios u
WHERE u.role != 'admin'
AND NOT EXISTS (
    SELECT 1 FROM permissoes_usuario p 
    WHERE p.user_id = u.id 
    AND p.estabelecimento_id = u.estabelecimento_id
);
*/

-- ============================
-- SCRIPT CONCLUÍDO
-- ============================
-- Após executar este script:
-- 1. A tabela 'permissoes_usuario' será criada
-- 2. As políticas RLS serão configuradas  
-- 3. Apenas admins poderão gerenciar permissões
-- 4. Usuários só verão suas próprias permissões
-- 5. O sistema estará pronto para uso