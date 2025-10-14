-- SCRIPT PARA ADICIONAR CAMPO usuario_id À TABELA AGENDAMENTOS
-- Execute no SQL Editor do Supabase Studio

-- 1. Verificar estrutura atual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar coluna usuario_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agendamentos' 
        AND column_name = 'usuario_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE agendamentos 
        ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Coluna usuario_id adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna usuario_id já existe!';
    END IF;
END $$;

-- 3. Verificar estrutura após alteração
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
AND table_schema = 'public'
ORDER BY ordinal_position;