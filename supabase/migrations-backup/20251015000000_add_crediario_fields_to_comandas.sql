-- Atualizar constraint de forma_pagamento para incluir 'crediario'
ALTER TABLE comandas 
DROP CONSTRAINT IF EXISTS comandas_forma_pagamento_check;

ALTER TABLE comandas 
ADD CONSTRAINT comandas_forma_pagamento_check 
CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'crediario'));

-- Adicionar campos de crediário na tabela comandas
ALTER TABLE comandas 
ADD COLUMN IF NOT EXISTS saldo_aplicado DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS troco_para_credito DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS falta_para_debito DECIMAL(10,2);

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN comandas.saldo_aplicado IS 'Valor de crédito/débito do cliente aplicado ao total da comanda';
COMMENT ON COLUMN comandas.troco_para_credito IS 'Valor do troco que foi convertido em crédito no crediário';
COMMENT ON COLUMN comandas.falta_para_debito IS 'Valor da falta que foi convertido em débito no crediário';
