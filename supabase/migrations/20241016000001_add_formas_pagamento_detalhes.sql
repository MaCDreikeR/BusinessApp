-- Adicionar campo para armazenar detalhes de múltiplas formas de pagamento
ALTER TABLE comandas 
ADD COLUMN IF NOT EXISTS formas_pagamento_detalhes TEXT;

-- Remover a constraint antiga de forma_pagamento
ALTER TABLE comandas 
DROP CONSTRAINT IF EXISTS comandas_forma_pagamento_check;

-- Adicionar nova constraint que inclui 'multiplo'
ALTER TABLE comandas
ADD CONSTRAINT comandas_forma_pagamento_check 
CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'crediario', 'multiplo'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN comandas.formas_pagamento_detalhes IS 'JSON contendo array de objetos com forma_pagamento e valor para pagamentos múltiplos';

-- Atualizar forma_pagamento para aceitar 'multiplo'
COMMENT ON COLUMN comandas.forma_pagamento IS 'Forma de pagamento: dinheiro, cartao_credito, cartao_debito, pix, crediario, ou multiplo (quando há mais de uma forma)';
