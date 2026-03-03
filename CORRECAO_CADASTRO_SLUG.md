# ⚠️ CORREÇÃO URGENTE: Erro ao Criar Conta

## Problema Identificado
Ao tentar criar uma nova conta, o erro é:
```
null value in column "slug" of relation "estabelecimentos" violates not-null constraint
```

## Causa
A função RPC `criar_nova_conta` não estava gerando o campo `slug`, que agora é obrigatório na tabela `estabelecimentos`.

## Solução

### Passo 1: Execute no Supabase SQL Editor

1. Abra seu Supabase Dashboard
2. Vá para **SQL Editor** → **New Query**
3. Cole o conteúdo do arquivo: `supabase/migrations/20260302_fix_criar_nova_conta_slug.sql`
4. Clique em **Run**

### Passo 2: Teste o Cadastro

Depois de executar a migração, tente criar uma nova conta novamente no app.

## Alternativa: Se tiver acesso ao terminal Supabase CLI

```bash
supabase db push
```

Isso vai executar todas as migrações pendentes (incluindo a nossa correção).

---

## Se Continuar Dando Erro:

Verifique se as funções base existem:

```sql
-- Listar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%slug%';
```

Deve retornar:
- `gerar_slug_base`
- `gerar_slug_unico`
- `criar_nova_conta`
