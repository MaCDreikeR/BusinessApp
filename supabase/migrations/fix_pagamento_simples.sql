-- Script SIMPLES para adicionar suporte a pagamentos na tabela comandas_itens
-- Focado apenas no essencial para Nova Comanda funcionar

-- 1. ADICIONAR TIPO "PAGAMENTO" 
-- Remover constraint existente (se houver)
ALTER TABLE comandas_itens DROP CONSTRAINT IF EXISTS comandas_itens_tipo_check;

-- Adicionar constraint incluindo "pagamento"
ALTER TABLE comandas_itens 
ADD CONSTRAINT comandas_itens_tipo_check 
CHECK (tipo IN ('produto', 'servico', 'pacote', 'pagamento'));

-- 2. TORNAR item_id OPCIONAL (para pagamentos de crediário)
ALTER TABLE comandas_itens 
ALTER COLUMN item_id DROP NOT NULL;

-- 3. VERIFICAR SE FOI APLICADO
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'comandas_itens'::regclass 
AND contype = 'c'
AND conname = 'comandas_itens_tipo_check';

-- PRONTO! Agora "pagamento" é um tipo válido 
-- e item_id pode ser NULL para pagamentos de crediário ✅