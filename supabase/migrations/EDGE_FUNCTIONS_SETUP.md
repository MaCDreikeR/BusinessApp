# 🚀 Configuração da Edge Function - Guia Completo

Este guia vai te ajudar a configurar a criação automática de comandas usando Edge Functions do Supabase + GitHub Actions.

## 📋 Pré-requisitos

- ✅ Projeto Supabase ativo (já tem)
- ✅ Repositório GitHub (já tem: MaCDreikeR/BusinessApp)
- ✅ Node.js instalado (já tem)

## 🎯 O que vamos fazer

1. Instalar Supabase CLI
2. Fazer deploy da Edge Function
3. Configurar GitHub Secrets
4. Ativar GitHub Actions
5. Testar tudo

---

## 1️⃣ Instalar Supabase CLI

Abra o PowerShell e execute:

```powershell
npm install -g supabase
```

Verifique a instalação:

```powershell
supabase --version
```

---

## 2️⃣ Login no Supabase

```powershell
supabase login
```

Isso vai abrir o navegador. Faça login com a mesma conta do seu projeto.

---

## 3️⃣ Vincular ao projeto

Primeiro, encontre o **Project Reference ID**:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto BusinessApp
3. Vá em **Project Settings** (⚙️ no menu lateral)
4. Clique em **General**
5. Copie o **Reference ID** (algo como `abc123xyz`)

Agora vincule o projeto:

```powershell
cd C:\Users\borge\OneDrive\Documentos\BusinessApp
supabase link --project-ref SEU_REFERENCE_ID
```

Substitua `SEU_REFERENCE_ID` pelo ID que você copiou.

---

## 4️⃣ Deploy da Edge Function

No mesmo terminal:

```powershell
supabase functions deploy verificar-agendamentos
```

✅ Você verá uma mensagem de sucesso com a URL da função.

---

## 5️⃣ Configurar GitHub Secrets

### Pegar as credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto BusinessApp
3. Vá em **Project Settings** > **API**
4. Copie:
   - **Project URL** (ex: `https://abc123xyz.supabase.co`)
   - **anon/public key** (chave pública, longa)

### Adicionar secrets no GitHub

1. Acesse: https://github.com/MaCDreikeR/BusinessApp/settings/secrets/actions
2. Clique em **New repository secret**
3. Adicione:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: Cole a Project URL (ex: `https://abc123xyz.supabase.co`)

**Secret 2:**
- Name: `SUPABASE_ANON_KEY`
- Value: Cole a anon/public key

---

## 6️⃣ Ativar GitHub Actions

1. Acesse: https://github.com/MaCDreikeR/BusinessApp/actions
2. Se aparecer "Workflows disabled", clique em **Enable workflows**
3. Você verá o workflow "Verificar Agendamentos"

---

## 7️⃣ Testar a Edge Function

### Teste 1: Executar manualmente no GitHub

1. Acesse: https://github.com/MaCDreikeR/BusinessApp/actions
2. Clique em **Verificar Agendamentos**
3. Clique em **Run workflow** > **Run workflow**
4. Aguarde ~30 segundos
5. Clique no job que apareceu para ver os logs

✅ **Sucesso:** Status verde, "✅ Edge Function executada com sucesso"  
❌ **Erro:** Status vermelho, verifique os logs

### Teste 2: Criar agendamento de teste

No app, crie um agendamento para **daqui a 2 minutos**:

```
Cliente: Teste Edge Function
Serviço: Qualquer
Data/Hora: HOJE às [hora_atual + 2min]
Status: agendado
```

Aguarde 7 minutos (o GitHub Actions roda a cada 5min) e verifique:

1. Acesse o Supabase Dashboard > Table Editor > `comandas`
2. Deve aparecer uma comanda nova com o cliente "Teste Edge Function"

---

## 8️⃣ Verificar logs

### Logs da Edge Function (Supabase)

```powershell
supabase functions logs verificar-agendamentos
```

Você verá:
- 🔍 Verificações executadas
- 👤 Agendamentos processados
- ✅ Comandas criadas
- ⚠️ Erros (se houver)

### Logs do GitHub Actions

1. Acesse: https://github.com/MaCDreikeR/BusinessApp/actions
2. Clique no workflow "Verificar Agendamentos"
3. Veja o histórico de execuções

---

## 9️⃣ Como funciona agora

### 🔄 Fluxo completo

```
Agendamento criado no app
        ↓
   Horário chega
        ↓
┌─────────────────────┬─────────────────────┐
│   App ABERTO        │   App FECHADO       │
├─────────────────────┼─────────────────────┤
│ ✅ Notificação      │ ❌ Sem notificação  │
│ ✅ Comanda criada   │ ❌ Sem ação         │
└─────────────────────┴─────────────────────┘
                ↓
        GitHub Actions executa
         (a cada 5 minutos)
                ↓
        Edge Function roda
                ↓
    ✅ Comanda criada (sempre!)
```

### 📊 Estatísticas

Você receberá no log:
```json
{
  "agendamentos_encontrados": 3,
  "comandas_criadas": 2,
  "comandas_existentes": 1,  ← Já existia (criada pelo app)
  "erros": 0
}
```

---

## ❓ Troubleshooting

### Erro: "supabase command not found"

```powershell
npm install -g supabase
```

### Erro: "Project not linked"

```powershell
cd C:\Users\borge\OneDrive\Documentos\BusinessApp
supabase link --project-ref SEU_REFERENCE_ID
```

### Erro: "Unauthorized" no GitHub Actions

- Verifique se os secrets estão corretos
- Confirme que copiou a **anon/public key** (não a service_role)

### Comandas não estão sendo criadas

1. Verifique se o agendamento tem status `agendado` ou `confirmado`
2. Confirme que o nome do cliente existe na tabela `clientes`
3. Veja os logs: `supabase functions logs verificar-agendamentos`

### GitHub Actions não está executando

- Vá em Settings > Actions > General
- Confirme que "Allow all actions" está marcado
- Execute manualmente para testar

---

## 🎉 Pronto!

Agora você tem:

- ✅ **Notificações** quando o app está aberto (hook React)
- ✅ **Criação automática** de comandas 24/7 (Edge Function)
- ✅ **Custo zero** (incluso no plano do Supabase)
- ✅ **Logs completos** para monitorar

---

## 📞 Suporte

Se tiver dúvidas, verifique:

1. Logs da Edge Function: `supabase functions logs verificar-agendamentos`
2. Logs do GitHub Actions: https://github.com/MaCDreikeR/BusinessApp/actions
3. README da função: `supabase/functions/verificar-agendamentos/README.md`

---

## 🔧 Comandos úteis

```powershell
# Ver status
supabase status

# Ver logs em tempo real
supabase functions logs verificar-agendamentos --tail

# Re-deploy (após mudanças)
supabase functions deploy verificar-agendamentos

# Listar todas as funções
supabase functions list

# Testar localmente
supabase functions serve verificar-agendamentos
```
