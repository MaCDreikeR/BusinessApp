-- ============================
-- SCRIPT DE DEBUG PARA PERMISSÕES
-- ============================
-- Este arquivo deve ser executado no Supabase Studio
-- Vá em Database > SQL Editor e execute este código

-- 1. Verificar se a tabela existe
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'permissoes_usuario'
ORDER BY ordinal_position;

-- 2. Se a tabela não existir ou estiver incorreta, dropá-la primeiro
DROP TABLE IF EXISTS permissoes_usuario CASCADE;

-- 3. Recriar a tabela com as colunas corretas
CREATE TABLE permissoes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    
    -- Permissões do sistema (completas)
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
    
    -- Novas permissões adicionadas
    pode_ver_orcamentos BOOLEAN DEFAULT false,
    pode_editar_orcamentos BOOLEAN DEFAULT false,
    pode_ver_pacotes BOOLEAN DEFAULT false,
    pode_editar_pacotes BOOLEAN DEFAULT false,
    pode_ver_aniversariantes BOOLEAN DEFAULT false,
    pode_editar_aniversariantes BOOLEAN DEFAULT false,
    pode_ver_metas BOOLEAN DEFAULT false,
    pode_editar_metas BOOLEAN DEFAULT false,
    pode_ver_despesas BOOLEAN DEFAULT false,
    pode_editar_despesas BOOLEAN DEFAULT false,
    pode_ver_agendamentos_online BOOLEAN DEFAULT false,
    pode_editar_agendamentos_online BOOLEAN DEFAULT false,
    pode_ver_automacao BOOLEAN DEFAULT false,
    pode_editar_automacao BOOLEAN DEFAULT false,
    pode_ver_notificacoes BOOLEAN DEFAULT false,
    pode_editar_notificacoes BOOLEAN DEFAULT false,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada usuário tenha apenas um registro por estabelecimento
    UNIQUE(user_id, estabelecimento_id)
);

-- 4. Criar índices para melhor performance
CREATE INDEX idx_permissoes_usuario_user_id ON permissoes_usuario(user_id);
CREATE INDEX idx_permissoes_usuario_estabelecimento_id ON permissoes_usuario(estabelecimento_id);

-- 5. Configurar RLS
ALTER TABLE permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS
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

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_permissoes_usuario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_permissoes_usuario_updated_at
    BEFORE UPDATE ON permissoes_usuario
    FOR EACH ROW
    EXECUTE FUNCTION update_permissoes_usuario_updated_at();

-- 9. Verificar se a tabela foi criada corretamente
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'permissoes_usuario'
ORDER BY ordinal_position;

-- ============================
-- INSTRUÇÃO FINAL
-- ============================
-- Após executar este script:
-- 1. Você deverá ver as colunas listadas duas vezes (antes e depois)
-- 2. A tabela será recriada com as colunas corretas
-- 3. O cache do Supabase será atualizado automaticamente
-- 4. Teste novamente o modal de permissões no app