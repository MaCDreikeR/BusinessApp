# Migration: Configurações por Estabelecimento

## 📋 Resumo
Esta migration atualiza a tabela `configuracoes` para suportar configurações por estabelecimento, necessário para a funcionalidade de **antecedência mínima de agendamentos online**.

## 🎯 Problema Identificado
O código do app mobile estava salvando a antecedência mínima usando `estabelecimento_id`:
```typescript
await supabase
  .from('configuracoes')
  .upsert({
    estabelecimento_id: estabelecimentoId,
    chave: 'agendamento_online_antecedencia_horas',
    valor: String(novoValor),
  }, {
    onConflict: 'estabelecimento_id,chave'
  });
```

Porém, a tabela `configuracoes` antiga tinha apenas `user_id`, causando erro ao tentar salvar.

## 🔧 O que a Migration Faz

### 1. **Adiciona coluna `estabelecimento_id`**
   - Referência à tabela `estabelecimentos`
   - Com `ON DELETE CASCADE` para limpeza automática

### 2. **Cria Índices**
   - `idx_configuracoes_estabelecimento_id`: Para busca por estabelecimento
   - `idx_configuracoes_estabelecimento_chave`: Índice composto (mais eficiente)

### 3. **Adiciona Constraint UNIQUE**
   - `UNIQUE(estabelecimento_id, chave)`: Previne duplicatas
   - Permite usar `upsert` com `onConflict`

### 4. **Atualiza Políticas RLS**
   - Mantém compatibilidade com configurações antigas (`user_id`)
   - Adiciona suporte para configurações por estabelecimento
   - Usuários do estabelecimento podem ver/criar/atualizar/deletar configurações

## 📝 Como Aplicar

### Opção 1: Via Dashboard do Supabase (Recomendado)
1. Acesse: https://supabase.com/dashboard/project/okfgiwbxgtxzklnwfglv/sql
2. Cole o conteúdo do arquivo [20260201_update_configuracoes_estabelecimento.sql](./20260201_update_configuracoes_estabelecimento.sql)
3. Clique em "Run" para executar

### Opção 2: Via Script Node.js
```bash
cd e:\BusinessApp
node scripts/apply-migration.js supabase/migrations/20260201_update_configuracoes_estabelecimento.sql
```
(Isso apenas mostra o SQL - você ainda precisa executar manualmente no dashboard)

### Opção 3: Via Supabase CLI
```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Executar migration
supabase db push

# Ou executar arquivo específico
supabase db execute --file supabase/migrations/20260201_update_configuracoes_estabelecimento.sql
```

## ✅ Como Verificar

Após aplicar, verifique no SQL Editor do Supabase:

```sql
-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'configuracoes';

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'configuracoes';

-- Verificar constraint
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'configuracoes'::regclass;

-- Verificar políticas RLS
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'configuracoes';
```

## 🔄 Impacto nos Sistemas

### Mobile App (BusinessApp)
✅ Já implementado corretamente - aguardando migration
- Salva em `configuracoes` com `estabelecimento_id`
- Arquivo: `app/(app)/agendamento-online.tsx`

### Web App (businessapp-web)
✅ Já implementado corretamente - aguardando migration
- Lê de `configuracoes` com `estabelecimento_id`
- Arquivo: `components/AgendamentoForm.tsx`

### Funcionalidades Afetadas
- ✅ Antecedência mínima de agendamentos online
- ✅ Futuras configurações por estabelecimento

## ⚠️ Observações Importantes

1. **Compatibilidade**: A migration mantém suporte para configurações antigas com `user_id`
2. **Segurança**: As políticas RLS garantem que apenas usuários do estabelecimento acessem suas configurações
3. **Performance**: Os índices garantem consultas rápidas
4. **Integridade**: A constraint UNIQUE previne dados duplicados

## 📚 Arquivos Relacionados

- Migration: `/supabase/migrations/20260201_update_configuracoes_estabelecimento.sql`
- Script de aplicação: `/scripts/apply-migration.js`
- Código mobile: `/app/(app)/agendamento-online.tsx`
- Código web: `/components/AgendamentoForm.tsx` (businessapp-web)
