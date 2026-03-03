# ⚡ AÇÃO IMEDIATA: Executar Script no Supabase

## 🔴 O Erro Agora
```
row-level security policy for table "estabelecimentos"
```

O insert direto foi bloqueado por RLS. Voltei para usar a RPC que tem permissões elevadas (`SECURITY DEFINER`).

---

## ✅ O Que Você Precisa Fazer

### Passo 1: Parar o App (30 segundos)

```bash
# No terminal comandos Metro
Ctrl+C
```

### Passo 2: Executar Script no Supabase (2 minutos)

1. **Abra seu Supabase Dashboard**:
   - URL: https://supabase.com/
   - Login com sua conta

2. **Vá até seu projeto**:
   - Clique no projeto correto

3. **Abra SQL Editor**:
   - Menu lateral izquerdo → SQL Editor
   - Clique em "New Query" (ou + verde)

4. **Cole o Script**:
   - Arquivo: `EXECUTAR_NO_SUPABASE_AGORA.sql`
   - Abra o arquivo, copie TODO conteúdo
   - Cole na query do Supabase

5. **Execute**:
   - Clique no botão azul "Run" NO CANTO DIREITO
   - Aguarde ~5 segundos
   - Deve aparecer: ✅ "Success" (normalmente verde)

6. **Feche o Supabase**:
   - Você não precisa fazer mais nada

### Passo 3: Reiniciar o App (1 minuto)

```bash
# No terminal
npm start

# Aguarde compilação (~30 segundos)
```

### Passo 4: Testar Cadastro (2 minutos)

1. **Abra o app** no emulador/Expo Go
2. **Vá para**: Tela de Cadastro
3. **Preencha com dados válidos**
4. **Clique**: Cadastrar
5. **Resultado esperado**: ✅ "Cadastro realizado com sucesso!"

---

## 🎯 O Que foi Corrigido

**Antes** (bloqueado por RLS):
```
usuário novo → insert direto em estabelecimentos → ❌ RLS bloqueou
```

**Agora** (usando RPC com permissões):
```
usuário novo → RPC criar_nova_conta (SECURITY DEFINER) → ✅ Funciona
```

---

## ⚠️ Importante

Se você pular o Passo 2 (executar script no Supabase):
- ❌ Cadastro continuará falhando com erro de RLS
- ❌ Mesmo recompilando o app

O script garante que as funções necessárias existem no banco.

---

## 🔧 Se Não Souber Onde Está o Script

O arquivo está em:
```
E:\BusinessApp\EXECUTAR_NO_SUPABASE_AGORA.sql
```

Abra com qualquer editor de texto (VS Code, Notepad++) e copie tudo.

---

## 🧪 Teste Rápido (Verificar se funcionou)

Depois de executar o script, no Supabase:
1. Vá para **Tabelas** → busque `estabelecimentos`
2. Verifique que há um novo registro (seu cadastro)
3. Coluna `slug` deve estar preenchida com um valor tipo `thamaranascimento`

Se tudo isso está correto → ✅ Funcionou!

---

## 📝 Resumo Rápido

| Passo | O Que Fazer | Tempo |
|-------|-----------|-------|
| 1 | Parar app (Ctrl+C) | 30s |
| 2 | Executar script Supabase | 2 min |
| 3 | Reiniciar app (npm start) | 1 min |
| 4 | Testar cadastro | 2 min |
| **Total** | | **~6 min** |

---

**Status Após fazer isso**: Cadastro 100% funcional! ✨

Se ainda der erro após isso, avise com the logs completos do terminal.
