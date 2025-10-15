-- Script para verificar a estrutura da tabela comandas_itens

-- Verificar se a tabela existe e sua estrutura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comandas_itens' 
ORDER BY ordinal_position;

-- Verificar algumas linhas de exemplo
SELECT * FROM comandas_itens LIMIT 5;

-- Verificar se há restrições na coluna item_id
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'comandas_itens' 
    AND ccu.column_name = 'item_id';