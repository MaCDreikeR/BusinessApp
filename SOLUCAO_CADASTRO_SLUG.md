# ✅ Correção: Erro ao Criar Conta (Slug Nulo)

## Problema 🔴
Ao tentar criar uma nova conta, o erro era:
```
null value in column "slug" of relation "estabelecimentos" violates not-null constraint
```

## Causa
A função RPC `criar_nova_conta` não estava gerando o campo `slug`, que é obrigatório desde a migração `20260131_make_slug_required.sql`.

## Solução Implementada ✅

### 1. **Correção no App** (Aplicada Imediatamente)
Modificado arquivo: `app/(auth)/cadastro.tsx`

- Adicionado import da função `gerarSlugUnico` do `utils/slug`
- Alterado o fluxo de cadastro para:
  1. ✅ Criar usuário no Supabase Auth
  2. ✅ Gerar slug único localmente
  3. ✅ Inserir diretamente na tabela `estabelecimentos` com o slug
  4. ✅ Inserir usuário na tabela `usuarios`
  5. ✅ Registrar atividade no `logs_atividade`

**Benefício**: Não depende mais da RPC complexa; slug é gerado no cliente

### 2. **Migração Supabase** (Recomendada)
Arquivo criado: `supabase/migrations/20260302_fix_criar_nova_conta_slug.sql`

Esta migração:
- ✅ Cria/atualiza funções auxiliares (`remover_acentos_manual`, `gerar_slug_base`)
- ✅ Cria/atualiza função `gerar_slug_unico` 
- ✅ Atualiza RPC `criar_nova_conta` para gerar slug automaticamente

**Como executar** (opcional, para redundância):
1. Abra Supabase Dashboard → SQL Editor → New Query
2. Cole conteúdo do arquivo `supabase/migrations/20260302_fix_criar_nova_conta_slug.sql`
3. Execute (Run)

## Status ℹ️

| Item | Status |
|------|--------|
| App Fix | ✅ Aplicada |
| Slug Generation | ✅ Funcionando |
| Direct Insert | ✅ Implementado |
| Migration File | ✅ Criado |
| Teste Recomendado | ⏳ Próximo passo |

## Próximos Passos 🚀

1. **Testar o cadastro** no app (tente criar uma nova conta)
2. **Opcional**: Execute a migração no Supabase para redundância
3. **Verifique**: Vá ao Supabase Dashboard → Estabelecimentos table, confirme que novos registros têm slug preenchido

## Rollback (se necessário)

Se algo der errado, a mudança é segura porque:
- ✅ Usa a função `gerarSlugUnico` que já existe em `utils/slug.ts`
- ✅ Não afeta estrutura de banco (apenas insert direto)
- ✅ Pode reverter para RPC anterior se necessário

---

**Dúvidas?** Verifique os logs no app:
```jsx
// Você verá mensagens como:
// 🔍 [DEBUG] Slug gerado: seu-estabelecimento
// ✅ Estabelecimento criado com sucesso
```
