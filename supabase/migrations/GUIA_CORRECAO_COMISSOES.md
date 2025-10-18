# 🔧 CORREÇÃO: Tela de Comissões não Mostra Todos os Usuários

## 🐛 Problema Identificado
A tela de comissões está mostrando apenas o usuário logado, não todos os usuários do estabelecimento.

### Causa Raiz
As políticas RLS (Row Level Security) da tabela `usuarios` estão bloqueando a visualização de outros usuários do mesmo estabelecimento.

## ✅ Soluções (Execute na Ordem)

### SOLUÇÃO 1: Corrigir Políticas RLS ⭐ RECOMENDADO

Execute o arquivo `CORRIGIR_RLS_USUARIOS_COMISSOES.sql` no SQL Editor do Supabase:

```bash
# Arquivo: CORRIGIR_RLS_USUARIOS_COMISSOES.sql
```

Este script irá:
1. ✅ Desabilitar RLS temporariamente
2. ✅ Remover todas as políticas antigas que podem estar conflitando
3. ✅ Criar novas políticas otimizadas e funcionais
4. ✅ Reabilitar RLS
5. ✅ Testar automaticamente

**O que as novas políticas fazem:**
- Permitem que usuários vejam outros usuários do mesmo estabelecimento
- Super admins podem ver todos os usuários
- Usuários principais (is_principal=true) têm permissões administrativas
- Cada usuário sempre pode ver seu próprio perfil

---

### SOLUÇÃO 2: Criar Função RPC (Alternativa)

Se a Solução 1 não funcionar, execute o arquivo `CREATE_RPC_GET_USUARIOS.sql`:

```bash
# Arquivo: CREATE_RPC_GET_USUARIOS.sql
```

Esta função RPC:
- ✅ Bypass das políticas RLS usando `SECURITY DEFINER`
- ✅ Valida que o usuário pertence ao estabelecimento antes de retornar dados
- ✅ É automaticamente usada pela tela de comissões (código já atualizado)

---

### SOLUÇÃO 3: Desabilitar RLS Temporariamente (Desenvolvimento)

⚠️ **APENAS PARA TESTES/DESENVOLVIMENTO - NÃO USE EM PRODUÇÃO**

```sql
-- Desabilitar RLS na tabela usuarios
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Quando terminar os testes, REABILITE:
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

---

## 🧪 Como Testar

### 1. Verificar políticas existentes
```sql
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'usuarios';
```

### 2. Testar query manualmente
```sql
-- Substitua pelo seu estabelecimento_id
SELECT 
  id,
  nome_completo,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND role != 'super_admin'
ORDER BY nome_completo;

-- Deve retornar 3 usuários:
-- 1. Girlene (profissional)
-- 2. borges (funcionario)
-- 3. Thâmara (admin)
```

### 3. Testar função RPC (se criou)
```sql
SELECT * FROM get_usuarios_estabelecimento('86592b4b-9872-4d52-a6bb-6458d8f53f5e');
```

---

## 📱 Código Atualizado

O código da tela `comissoes.tsx` foi atualizado para:

### ✅ Método 1 (Preferencial): Usar função RPC
Se a função `get_usuarios_estabelecimento` existir, ela é usada automaticamente.

### ✅ Método 2 (Fallback): Query direta
Se RPC não existir, tenta query normal com `.eq()`.

### ✅ Método 3 (Último recurso): Filtrar manualmente
Se a query falhar por RLS, busca todos os usuários e filtra no código.

---

## 🔍 Logs de Debug

Após executar as correções, você verá no console:

```
🔍 Buscando usuários do estabelecimento: 86592b4b-9872-4d52-a6bb-6458d8f53f5e
🚀 Tentando usar função RPC get_usuarios_estabelecimento...
✅ Usuários encontrados via RPC: 3
📋 Lista de usuários (RPC): [
  { "nome_completo": "borges", ... },
  { "nome_completo": "Girlene", ... },
  { "nome_completo": "Thâmara", ... }
]
```

---

## 📋 Checklist de Execução

- [ ] 1. Execute `CORRIGIR_RLS_USUARIOS_COMISSOES.sql` no Supabase
- [ ] 2. Verifique se as 4 novas políticas foram criadas
- [ ] 3. Execute o teste SQL para confirmar que retorna 3 usuários
- [ ] 4. Se o teste SQL funcionar mas o app não, execute `CREATE_RPC_GET_USUARIOS.sql`
- [ ] 5. Recarregue o app (pressione 'r' no terminal Expo)
- [ ] 6. Verifique os logs no console
- [ ] 7. Confirme que a tela mostra os 3 usuários

---

## 🆘 Troubleshooting

### Ainda aparece só 1 usuário?

**1. Verifique o estabelecimento_id no AuthContext:**
```
LOG  🏢 Estabelecimento ID: 86592b4b-9872-4d52-a6bb-6458d8f53f5e
```
Confirme que este ID está correto.

**2. Teste a query diretamente no Supabase SQL Editor:**
- Se funcionar lá mas não no app → problema com RLS ou token de autenticação
- Se não funcionar nem lá → dados realmente não existem

**3. Verifique se RLS está habilitado:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'usuarios';
```

**4. Verifique o token de autenticação:**
```typescript
// Adicione temporariamente no código:
const { data: { session } } = await supabase.auth.getSession();
console.log('🔑 User ID do token:', session?.user?.id);
```

---

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- Arquivo: `supabase/migrations/politicas_rls_simples.sql` (política antiga)
- Arquivo: `contexts/AuthContext.tsx` (onde estabelecimento_id é definido)
