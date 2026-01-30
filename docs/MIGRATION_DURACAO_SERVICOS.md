# Migration: Campo Duração nos Serviços

## 📋 Descrição
Esta migration adiciona o campo `duracao` (em minutos) à tabela `servicos` para registrar o tempo estimado de cada serviço.

## 🎯 Objetivo
Permitir que cada serviço tenha uma duração definida, facilitando:
- Agendamentos mais precisos
- Cálculo automático de horários disponíveis
- Melhor organização da agenda

## 📊 Mudanças no Banco de Dados

### Tabela: `servicos`
- **Nova coluna:** `duracao` (INTEGER)
- **Valor padrão:** NULL (opcional)
- **Permite NULL:** Sim ✅
- **Obrigatório:** Não
- **Índice:** Não necessário

## 🚀 Como Executar

### Opção 1: Via Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie e cole o conteúdo do arquivo: `supabase/migrations/20260129_add_duracao_to_servicos.sql`
5. Clique em **Run**

### Opção 2: Via CLI (se estiver usando Supabase CLI)
```bash
supabase db push
```

### Opção 3: Copiar e colar SQL direto
```sql
-- Copie o conteúdo do arquivo migration e execute no SQL Editor do Supabase
```

## ✅ Verificação

Após executar a migration, verifique se a coluna foi criada:

```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'servicos' 
AND column_name = 'duracao';

-- Verificar serviços atualizados
SELECT id, nome, duracao 
FROM servicos 
LIMIT 10;
```

## 📱 Mudanças no App

### Tela de Serviços (`app/(app)/servicos.tsx`)
- ✅ Novo campo "Duração (minutos)" no formulário (OPCIONAL)
- ✅ Sem valor padrão (campo vazio)
- ✅ Validação numérica
- ✅ Salvamento automático no banco (NULL se vazio)
- ✅ Edição de duração em serviços existentes

### Interface TypeScript (`types/index.ts`)
- ✅ Campo `duracao?: number` já existe na interface `Servico`

## 🔄 Rollback (se necessário)

Se precisar desfazer esta migration:

```sql
-- Remover a coluna duracao
ALTER TABLE servicos DROP COLUMN IF EXISTS duracao;
```

## 📝 Notas
- Campo **OPCIONAL** - não é obrigatório preencher
- Serviços existentes permanecerão com duração NULL
- A duração pode ser editada posteriormente para cada serviço
- O campo permite NULL (valores vazios)
- Valor é armazenado em minutos (INTEGER)
- Se não informado, será salvo como NULL no banco

## ✨ Próximos Passos
1. Executar a migration no banco de dados
2. Testar criação de novos serviços
3. Testar edição de serviços existentes
4. Ajustar durações dos serviços conforme necessário
5. (Futuro) Integrar com sistema de agendamentos para calcular horários automaticamente
