-- Verificar a estrutura da tabela estabelecimentos
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM 
    information_schema.columns 
WHERE 
    table_name = 'estabelecimentos';

-- Verificar os dados existentes na tabela
SELECT * FROM estabelecimentos; 