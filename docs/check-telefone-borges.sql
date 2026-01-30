-- Verificar telefone do cliente Borges
SELECT id, nome, telefone, estabelecimento_id 
FROM clientes 
WHERE nome ILIKE '%borges%'
LIMIT 5;
