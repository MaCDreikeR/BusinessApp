# 🚀 EXECUTAR MIGRAÇÃO - Guia Rápido

## ❌ Problema Corrigido

**ERRO ANTERIOR**: `column "data" does not exist`

**CAUSA**: A tabela `agendamentos` usa `data_hora` (TIMESTAMP), não `data` e `horario` separados.

**SOLUÇÃO**: Migração corrigida para usar `data_hora` corretamente.

---

## ✅ Migração Corrigida

O arquivo `20241016000000_add_agendamento_fields.sql` agora está correto e pronto para executar!

### O que foi corrigido:

**ANTES** (ERRADO):
```sql
CREATE INDEX ... ON agendamentos(data, horario);  -- ❌ Colunas não existem
UPDATE agendamentos SET horario_termino = (horario::time + ...)  -- ❌ Coluna horario não existe
```

**DEPOIS** (CORRETO):
```sql
CREATE INDEX ... ON agendamentos(data_hora, horario_termino);  -- ✅ Correto
UPDATE agendamentos SET horario_termino = (data_hora + interval '1 hour')::time  -- ✅ Correto
```

---

## 📋 Como Executar a Migração

### Opção 1: Supabase Studio (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `20241016000000_add_agendamento_fields.sql`
6. Clique em **RUN** (ou pressione Ctrl+Enter)

### Opção 2: Supabase CLI

```bash
cd BusinessApp
supabase db push
```

### Opção 3: Executar SQL Direto (Copie e Cole)

```sql
-- Adicionar campos de horário de término e criação automática de comanda
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS horario_termino TIME,
ADD COLUMN IF NOT EXISTS criar_comanda_automatica BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'agendado';

-- Criar índice para melhorar performance de consultas por status
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- Criar índice composto para consultas de data e horário
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_horario ON agendamentos(data_hora, horario_termino);

-- Comentários para documentação
COMMENT ON COLUMN agendamentos.horario_termino IS 'Horário de término do agendamento';
COMMENT ON COLUMN agendamentos.criar_comanda_automatica IS 'Indica se uma comanda deve ser criada automaticamente no dia do agendamento';
COMMENT ON COLUMN agendamentos.status IS 'Status do agendamento: agendado, confirmado, em_atendimento, concluido, cancelado, falta';

-- Atualizar registros existentes para ter horário de término baseado na duração do serviço (se houver)
-- Por padrão, adiciona 1 hora ao horário de início se não houver horário de término
UPDATE agendamentos 
SET horario_termino = (data_hora + interval '1 hour')::time
WHERE horario_termino IS NULL;
```

---

## ✅ Verificar se a Migração Funcionou

Após executar, rode esta query para verificar:

```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
AND column_name IN ('horario_termino', 'criar_comanda_automatica', 'status')
ORDER BY column_name;

-- Verificar índices criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'agendamentos'
AND indexname LIKE 'idx_agendamentos_%';

-- Verificar dados atualizados (se houver registros existentes)
SELECT id, data_hora, horario_termino, status, criar_comanda_automatica
FROM agendamentos
LIMIT 5;
```

### Resultado Esperado:

```
column_name                  | data_type | column_default
-----------------------------|-----------|----------------
criar_comanda_automatica     | boolean   | true
horario_termino              | time      | NULL
status                       | varchar   | 'agendado'

indexname                         | indexdef
----------------------------------|------------------------------------------
idx_agendamentos_status           | CREATE INDEX ... ON agendamentos(status)
idx_agendamentos_data_horario     | CREATE INDEX ... ON agendamentos(data_hora, horario_termino)
```

---

## 🎯 Próximos Passos Após a Migração

1. ✅ **Testar o app**: Criar um novo agendamento
2. ✅ **Verificar**: Horário de início e término salvando corretamente
3. ✅ **Conferir**: Status "agendado" sendo aplicado automaticamente
4. ✅ **Validar**: Toggle "criar comanda" funcionando

---

## 🐛 Solução de Problemas

### Erro: "relation 'agendamentos' does not exist"
**Solução**: A tabela agendamentos ainda não foi criada. Verifique as migrações anteriores.

### Erro: "column already exists"
**Solução**: A coluna já foi adicionada anteriormente. Use `ADD COLUMN IF NOT EXISTS` (já está na migração).

### Erro: "permission denied"
**Solução**: Você precisa de permissões de superusuário no Supabase. Use o SQL Editor do Supabase Studio.

---

## 📊 Estrutura Final da Tabela agendamentos

```
agendamentos
├── id (UUID)
├── data_hora (TIMESTAMP) ← Campo principal de data/hora
├── horario_termino (TIME) ← NOVO
├── cliente (VARCHAR)
├── telefone (VARCHAR)
├── servicos (JSONB)
├── valor_total (NUMERIC)
├── observacoes (TEXT)
├── estabelecimento_id (UUID)
├── usuario_id (UUID)
├── status (VARCHAR) ← NOVO
├── criar_comanda_automatica (BOOLEAN) ← NOVO
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

**Migração pronta para executar! 🎉**

Copie o SQL acima e cole no Supabase Studio para aplicar as mudanças.
