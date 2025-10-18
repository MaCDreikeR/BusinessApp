-- Script completo para melhorar a estrutura da tabela comandas_itens

-- ============================================
-- ANÁLISE DA ESTRUTURA ATUAL
-- ============================================

-- Verificar constraints existentes (PostgreSQL moderno)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'comandas_itens'::regclass 
AND contype = 'c';

-- Verificar estrutura das colunas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comandas_itens' 
ORDER BY ordinal_position;

-- ============================================
-- MELHORIAS PROPOSTAS
-- ============================================

-- 1. ADICIONAR TIPO "PAGAMENTO"
-- Remover constraint existente do tipo (se houver)
ALTER TABLE comandas_itens DROP CONSTRAINT IF EXISTS comandas_itens_tipo_check;

-- Adicionar nova constraint incluindo "pagamento"
ALTER TABLE comandas_itens 
ADD CONSTRAINT comandas_itens_tipo_check 
CHECK (tipo IN ('produto', 'servico', 'pacote', 'pagamento'));

-- 2. TORNAR item_id OPCIONAL
-- Para pagamentos, não precisamos referenciar um item específico
ALTER TABLE comandas_itens 
ALTER COLUMN item_id DROP NOT NULL;

-- 3. ADICIONAR ÍNDICES PARA PERFORMANCE
-- Índice por tipo para consultas filtradas
CREATE INDEX IF NOT EXISTS idx_comandas_itens_tipo 
ON comandas_itens(tipo);

-- Índice por comanda_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_comandas_itens_comanda_id 
ON comandas_itens(comanda_id);

-- Índice composto para relatórios
CREATE INDEX IF NOT EXISTS idx_comandas_itens_estabelecimento_tipo 
ON comandas_itens(estabelecimento_id, tipo);

-- 4. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN comandas_itens.tipo IS 'Tipo do item: produto, servico, pacote ou pagamento (para crediário)';
COMMENT ON COLUMN comandas_itens.item_id IS 'ID do item referenciado (NULL para pagamentos de crediário)';
COMMENT ON COLUMN comandas_itens.nome IS 'Nome do item ou descrição do pagamento (ex: "Pagamento crediário")';

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Verificar se as alterações foram aplicadas (PostgreSQL moderno)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'comandas_itens'::regclass 
AND contype = 'c';

-- Testar inserção de um pagamento de crediário (exemplo)
-- INSERT INTO comandas_itens (
--     comanda_id, 
--     tipo, 
--     nome, 
--     quantidade, 
--     preco, 
--     preco_unitario, 
--     preco_total, 
--     estabelecimento_id
-- ) VALUES (
--     'uuid-da-comanda', 
--     'pagamento', 
--     'Pagamento crediário - Parcela 1/3', 
--     1, 
--     150.00, 
--     150.00, 
--     150.00, 
--     'uuid-do-estabelecimento'
-- );