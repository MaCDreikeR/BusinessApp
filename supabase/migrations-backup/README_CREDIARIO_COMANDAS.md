# Migration: Adicionar campos de crediário nas comandas

## Descrição
Esta migration faz duas alterações importantes na tabela `comandas`:

1. **Atualiza o check constraint** de `forma_pagamento` para incluir 'crediario'
2. **Adiciona três novos campos** para armazenar informações sobre movimentações de crediário:
   - `saldo_aplicado`: Valor de crédito/débito aplicado ao finalizar a comanda
   - `troco_para_credito`: Troco convertido em crédito para o cliente
   - `falta_para_debito`: Falta convertida em débito para o cliente

## Como executar

### Opção 1: Supabase Dashboard (Recomendado)
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie e cole o código abaixo:

```sql
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
```

5. Clique em **Run** (ou F5)

### Opção 2: Supabase CLI
```bash
supabase db push
```

## Verificação
Após executar, verifique se as alterações foram aplicadas:

```sql
-- Verificar colunas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comandas' 
AND column_name IN ('saldo_aplicado', 'troco_para_credito', 'falta_para_debito');

-- Verificar constraint
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'comandas' AND con.conname = 'comandas_forma_pagamento_check';
```

## Rollback (se necessário)
```sql
-- Remover colunas
ALTER TABLE comandas 
DROP COLUMN IF EXISTS saldo_aplicado,
DROP COLUMN IF EXISTS troco_para_credito,
DROP COLUMN IF EXISTS falta_para_debito;

-- Reverter constraint
ALTER TABLE comandas 
DROP CONSTRAINT IF EXISTS comandas_forma_pagamento_check;

ALTER TABLE comandas 
ADD CONSTRAINT comandas_forma_pagamento_check 
CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix'));
```
