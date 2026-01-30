# ✅ CHECKLIST: Ativar Rastreamento de Atividade

## 🔧 Passo 1: Executar Migration no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New query**
4. Copie e cole o conteúdo de: `supabase/migrations/20251210_add_last_activity.sql`
5. Clique em **Run**

### Script SQL a executar:

```sql
-- Adicionar colunas para rastreamento de atividade do usuário
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dispositivo TEXT;

-- Atualizar last_activity_at dos usuários existentes com base no updated_at
UPDATE usuarios 
SET last_activity_at = updated_at 
WHERE last_activity_at IS NULL;

-- Criar índices para melhorar performance em queries de usuários online
CREATE INDEX IF NOT EXISTS idx_usuarios_last_activity ON usuarios(estabelecimento_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_dispositivo ON usuarios(estabelecimento_id, dispositivo) WHERE dispositivo IS NOT NULL;

-- Comentários explicativos
COMMENT ON COLUMN usuarios.last_activity_at IS 'Última atividade do usuário no app (atualizada via heartbeat a cada 2 minutos)';
COMMENT ON COLUMN usuarios.dispositivo IS 'Informações do dispositivo do usuário (modelo, SO, etc)';
```

---

## 📱 Passo 2: Testar no App

Após executar a migration:

1. **Faça logout e login novamente** no app
2. Aguarde 2 minutos (tempo do heartbeat)
3. Vá em **Contas** → Clique em uma conta → Aba **Atividades**
4. Puxe a tela para baixo para atualizar

---

## ✨ O que você verá:

### 🕒 Último Acesso
- Data e hora do último login/atividade

### 🟢 Usuários Online Agora
- Lista de usuários ativos nos últimos 5 minutos
- Nome, email e tempo desde último acesso
- Indicador verde para cada usuário online

### 📱 Dispositivos (últimos 30 dias)
- Lista de dispositivos únicos que acessaram
- Modelo do dispositivo
- Sistema operacional (Android/iOS)
- Data do último acesso de cada dispositivo

---

## 🔍 Verificar se funcionou:

Execute no SQL Editor do Supabase:

```sql
-- Ver dados de atividade dos usuários
SELECT 
    id,
    nome_completo,
    email,
    dispositivo,
    last_activity_at,
    updated_at,
    estabelecimento_id
FROM usuarios
WHERE estabelecimento_id IS NOT NULL
ORDER BY last_activity_at DESC
LIMIT 10;
```

---

## ⚙️ Como funciona o Heartbeat:

O sistema atualiza automaticamente:
- ✅ **Ao fazer login**: Registra imediatamente
- ✅ **A cada 2 minutos**: Enquanto o app estiver aberto
- ✅ **Informações salvas**:
  - Data/hora da atividade (`last_activity_at`)
  - Modelo do dispositivo (`dispositivo`)

---

## 🐛 Problemas?

### Não mostra "Nunca acessou":
- Execute: `UPDATE usuarios SET last_activity_at = updated_at WHERE last_activity_at IS NULL;`

### Dispositivo aparece "null":
- Faça logout e login novamente
- O dispositivo é registrado no próximo heartbeat (2 min)

### Usuários não aparecem online:
- Verifique se a migration foi executada
- Certifique-se de que está logado há menos de 5 minutos
- Puxe a tela para baixo para atualizar
