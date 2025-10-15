-- Script para adicionar "pagamento" como tipo válido na tabela comandas_itens

-- 1. Verificar a constraint atual do tipo
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'comandas_itens'::regclass 
AND contype = 'c';

-- 2. Alterar a constraint para incluir "pagamento"
-- (assumindo que existe uma CHECK constraint para o campo tipo)

-- Primeiro, remover a constraint existente se houver
-- ALTER TABLE comandas_itens DROP CONSTRAINT IF EXISTS comandas_itens_tipo_check;

-- Adicionar nova constraint incluindo "pagamento"
ALTER TABLE comandas_itens 
ADD CONSTRAINT comandas_itens_tipo_check 
CHECK (tipo IN ('produto', 'servico', 'pacote', 'pagamento'));

-- 3. Verificar se a coluna item_id pode ser opcional para pagamentos
-- (já que pagamentos não referenciam itens específicos do estoque)
ALTER TABLE comandas_itens 
ALTER COLUMN item_id DROP NOT NULL;