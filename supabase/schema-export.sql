-- Script para exportar schema básico
-- Execute no SQL Editor do seu projeto de PRODUÇÃO para gerar o schema

-- 1. Primeiro, liste todas as tabelas
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Para cada tabela, você pode gerar o CREATE TABLE
-- Exemplo para a tabela 'usuarios':
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', '
    ) || ');'
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
    AND table_schema = 'public'
GROUP BY table_name;

-- 3. Depois execute este comando no projeto de DESENVOLVIMENTO
-- para criar as tabelas com a mesma estrutura