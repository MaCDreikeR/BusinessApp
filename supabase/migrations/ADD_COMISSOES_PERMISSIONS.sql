    -- ============================
    -- ADICIONAR PERMISSÕES DE COMISSÕES
    -- ============================
    -- Execute este arquivo no Supabase Studio
    -- Vá em Database > SQL Editor e execute este código

    -- 1. Adicionar colunas de permissão de comissões
    ALTER TABLE permissoes_usuario
    ADD COLUMN IF NOT EXISTS pode_ver_comissoes BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS pode_editar_comissoes BOOLEAN DEFAULT true;

    -- 2. Atualizar permissões existentes para incluir comissões (opcional - só se quiser liberar para todos)
    UPDATE permissoes_usuario
    SET 
    pode_ver_comissoes = true,
    pode_editar_comissoes = true
    WHERE pode_ver_comissoes IS NULL OR pode_editar_comissoes IS NULL;

    -- 3. Verificar se as colunas foram adicionadas
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'permissoes_usuario'
    AND column_name IN ('pode_ver_comissoes', 'pode_editar_comissoes')
    ORDER BY column_name;
