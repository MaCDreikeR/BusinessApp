# 🔍 GUIA DE DEBUGGING: Tela Branca

Este guia ajuda a diagnosticar problemas relacionados ao fluxo de autenticação.

---

## 🎯 FLUXOGRAMA DE DECISÃO

```
App abre
    │
    ▼
┌─────────────────────┐
│ AuthContext inicia  │
│ fetchInitialSession │
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ supabase.auth.getSession()          │
│ Timeout: 8s (tentativa 1)           │
└─────────────────────────────────────┘
    │
    ├─────────────┬─────────────────────┐
    │             │                     │
SUCESSO     TIMEOUT/ERRO          SEM SESSÃO
    │             │                     │
    ▼             ▼                     ▼
[HOME]     [RETRY #1]            [LOGIN]
            10s timeout
                │
        ┌───────┴────────┐
        │                │
    SUCESSO          FALHA
        │                │
        ▼                ▼
    [HOME]         [RETRY #2]
                    12s timeout
                        │
                ┌───────┴────────┐
                │                │
            SUCESSO          FALHA
                │                │
                ▼                ▼
            [HOME]         [LIMPEZA]
                              │
                              ▼
                      clearAuthState()
                      clearAuthCache()
                              │
                              ▼
                         [LOGIN]
```

---

## 📊 LOGS ESPERADOS

### **✅ Sucesso (Sessão Válida)**

```
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 1/3)...
[AuthContext] ✅ Sessão recuperada com sucesso
[AuthContext] 👤 Usuário: user-123
[AuthContext] 🏢 Estabelecimento: estab-456
[AuthContext] 🎭 Role: gerente
[AuthContext] 🔄 Inicializando serviço de sincronização...
[MainLayout] [safeReplace] Redirecionando: null → /(app)
```

**Tempo esperado:** 2-4 segundos

---

### **⚠️ Retry (Falha Temporária)**

```
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 1/3)...
[AuthContext] ❌ Erro ao carregar sessão: Timeout ao conectar
[AuthContext] 🔄 Tentando reconectar (1/2)...
[AuthContext] ⏱️ Aguardando 2s antes de retry...
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 2/3)...
[AuthContext] ✅ Sessão recuperada com sucesso
[MainLayout] [safeReplace] Redirecionando: null → /(app)
```

**Tempo esperado:** 10-15 segundos

---

### **❌ Falha Total (Sessão Expirada)**

```
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 1/3)...
[AuthContext] ❌ Erro ao carregar sessão: Timeout ao conectar
[AuthContext] 🔄 Tentando reconectar (1/2)...
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 2/3)...
[AuthContext] ❌ Erro ao carregar sessão: Timeout ao conectar
[AuthContext] 🔄 Tentando reconectar (2/2)...
[AuthContext] 🔐 Tentando recuperar sessão (tentativa 3/3)...
[AuthContext] ❌ Erro ao carregar sessão: Timeout ao conectar
[AuthContext] ❌ Falha definitiva após 3 tentativas
[AuthContext] 🗑️ Cache de autenticação limpo
[MainLayout] ⏱️ Iniciando timeout de segurança...
[MainLayout] ❌ Timeout absoluto atingido! Forçando login...
[MainLayout] 🚑 Executando fallback de emergência...
[MainLayout] [safeReplace] Redirecionando: null → /(auth)/login
```

**Tempo esperado:** 20-24 segundos

---

## 🔬 COMO DEBUGAR

### **Passo 1: Verificar se o problema ainda existe**

```bash
# Limpar cache
npx expo start --clear

# Abrir app e verificar logs
# Buscar por:
grep "Tentando recuperar sessão" logs.txt
grep "Falha definitiva" logs.txt
grep "Timeout absoluto" logs.txt
```

---

### **Passo 2: Identificar o ponto de falha**

**Possíveis pontos de falha:**

```
1. supabase.auth.getSession()
   └─ Log: "❌ Erro ao carregar sessão"
   └─ Causa: Supabase inacessível ou token inválido

2. fetchUserProfileAndRedirect()
   └─ Log: "❌ Erro ao buscar perfil do usuário"
   └─ Causa: Tabela 'usuarios' inacessível ou rede lenta

3. onAuthStateChange listener
   └─ Log: "⏸️ Evento ignorado durante inicialização"
   └─ Causa: Race condition (esperado durante init)

4. Timeout absoluto
   └─ Log: "❌ Timeout absoluto atingido!"
   └─ Causa: Todos os retries falharam
```

---

### **Passo 3: Verificar configurações**

```tsx
// AuthContext.tsx
console.log('SESSION_TIMEOUT:', SESSION_TIMEOUT);
console.log('MAX_RETRIES:', MAX_RETRIES);

// _layout.tsx
console.log('ABSOLUTE_TIMEOUT:', ABSOLUTE_TIMEOUT);

// supabase.ts
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_KEY:', supabaseAnonKey.substring(0, 10) + '...');
```

**Valores esperados:**
```
SESSION_TIMEOUT: 8000
MAX_RETRIES: 2
ABSOLUTE_TIMEOUT: 20000
SUPABASE_URL: https://seu-projeto.supabase.co
SUPABASE_KEY: eyJhbGc...
```

---

### **Passo 4: Testar cenários específicos**

#### **Teste A: Sessão Válida**

```typescript
// Em AuthContext.tsx, adicione:
useEffect(() => {
  const test = async () => {
    const { data, error } = await supabase.auth.getSession();
    console.log('🧪 TESTE: getSession()', { 
      hasSession: !!data.session,
      error: error?.message,
      userId: data.session?.user?.id 
    });
  };
  test();
}, []);
```

**Output esperado:**
```
🧪 TESTE: getSession() { hasSession: true, error: undefined, userId: 'user-123' }
```

#### **Teste B: Retry Logic**

```typescript
// Em AuthContext.tsx, force timeout baixo:
const SESSION_TIMEOUT = 1000; // 1s (apenas para teste!)

// Execute app e veja logs:
// Deve tentar 3x (1s cada) e falhar em 3s total
```

**Output esperado:**
```
🔐 Tentando recuperar sessão (tentativa 1/3)...
❌ Erro: Timeout ao conectar
🔄 Tentando reconectar (1/2)...
🔐 Tentando recuperar sessão (tentativa 2/3)...
❌ Erro: Timeout ao conectar
🔄 Tentando reconectar (2/2)...
🔐 Tentando recuperar sessão (tentativa 3/3)...
❌ Erro: Timeout ao conectar
❌ Falha definitiva
```

#### **Teste C: Fallback Absoluto**

```typescript
// Em _layout.tsx, force timeout baixo:
const ABSOLUTE_TIMEOUT = 5000; // 5s (apenas para teste!)

// Execute app sem internet
// Deve mostrar tela de erro após 5s
```

**Output esperado:**
```
⏱️ Iniciando timeout de segurança...
(aguarda 5s)
❌ Timeout absoluto atingido!
🚑 Executando fallback de emergência...
[safeReplace] Redirecionando: null → /(auth)/login
```

---

## 🛠️ FERRAMENTAS DE DEBUG

### **1. React Native Debugger**

```bash
# Instalar
brew install --cask react-native-debugger

# Abrir
open "rndebugger://set-debugger-loc?host=localhost&port=8081"

# Habilitar no app
Cmd+D (iOS) / Cmd+M (Android) → "Debug"

# Ver logs no console
```

### **2. Flipper**

```bash
# Instalar
brew install --cask flipper

# Conectar ao app
npx expo run:android --no-dev --no-fast-refresh
# Flipper deve detectar automaticamente

# Ver logs em:
Flipper → Logs → React Native
```

### **3. Logs via ADB (Android)**

```bash
# Ver logs em tempo real
adb logcat | grep "ReactNative"

# Filtrar por tag
adb logcat | grep "AuthContext"

# Salvar em arquivo
adb logcat > logs.txt
```

### **4. Logs via Console (iOS)**

```bash
# Terminal 1: Start Metro
npx expo start

# Terminal 2: Ver logs
tail -f /tmp/react-native-*.log

# Ou use Console.app do macOS
# Applications → Utilities → Console
# Device → [Seu iPhone] → All Messages
```

---

## 🐛 PROBLEMAS COMUNS

### **Problema #1: "Failed to fetch" / "Network request failed"**

**Causa:** Firewall bloqueando Supabase ou internet instável

**Debug:**
```bash
# Testar conectividade
curl https://seu-projeto.supabase.co/rest/v1/

# Verificar DNS
nslookup seu-projeto.supabase.co

# Testar com IP direto
ping seu-projeto.supabase.co
```

**Solução:**
1. Verificar firewall do dispositivo
2. Testar com outra rede (WiFi → 4G)
3. Verificar URL do Supabase (.env correto?)

---

### **Problema #2: "Invalid refresh token"**

**Causa:** Token expirado ou inválido no AsyncStorage

**Debug:**
```typescript
// Em AuthContext.tsx:
useEffect(() => {
  const checkToken = async () => {
    const session = await supabase.auth.getSession();
    console.log('🔑 Refresh Token:', session.data.session?.refresh_token?.substring(0, 20));
    console.log('🕐 Expires At:', session.data.session?.expires_at);
  };
  checkToken();
}, []);
```

**Solução:**
```bash
# Limpar AsyncStorage
# Em React Native Debugger:
AsyncStorage.clear().then(() => console.log('✅ Cleared'));

# Ou via código:
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

---

### **Problema #3: "Listener não está recebendo eventos"**

**Causa:** `onAuthStateChange` não configurado corretamente

**Debug:**
```typescript
// Em AuthContext.tsx:
const { data: authListener } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('🔔 AUTH EVENT:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });
    // ... resto do código
  }
);
```

**Solução:**
1. Verificar se `autoRefreshToken: true` no Supabase config
2. Verificar se listener está sendo registrado
3. Verificar logs do Supabase (Dashboard → Logs)

---

### **Problema #4: "Race condition persiste"**

**Causa:** `isInitializing` não está bloqueando listener corretamente

**Debug:**
```typescript
// Em AuthContext.tsx:
const { data: authListener } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('🔔 Event:', event, 'isInitializing:', isInitializing);
    
    if (isInitializing) {
      console.log('⏸️ IGNORADO devido a isInitializing=true');
      return;
    }
    
    console.log('✅ PROCESSANDO evento');
    // ... resto do código
  }
);
```

**Output esperado:**
```
🔔 Event: INITIAL_SESSION isInitializing: true
⏸️ IGNORADO devido a isInitializing=true
🔔 Event: SIGNED_IN isInitializing: false
✅ PROCESSANDO evento
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

Use este checklist para validar que a correção está funcionando:

```
✅ Cenários de Teste

  Login e Uso Normal:
  □ Login funciona normalmente
  □ App mantém sessão após force-close
  □ App abre em < 5s com sessão válida
  
  Sessão Expirada:
  □ Limpar AsyncStorage → App vai para login
  □ Retry acontece automaticamente (ver logs)
  □ Timeout absoluto ativa após 20s
  □ Navega para login sem travar
  
  Sem Internet:
  □ Modo avião → App tenta reconectar
  □ 3 tentativas visíveis nos logs
  □ Após 24s, vai para login
  □ Mensagem de erro aparece
  
  Cache Corrompido:
  □ Cache limpo automaticamente após falhas
  □ Não fica preso em loop infinito
  □ Logs mostram "🗑️ Cache limpo"
  
  Race Condition:
  □ Eventos ignorados durante init
  □ Logs mostram "⏸️ Evento ignorado"
  □ Listener só processa após init completo
  
✅ Logs Esperados

  □ "🔐 Tentando recuperar sessão"
  □ "✅ Sessão recuperada" OU "❌ Falha definitiva"
  □ "🔄 Tentando reconectar" (se houver retry)
  □ "❌ Timeout absoluto" (se tudo falhar)
  □ "[safeReplace] Redirecionando"
  
✅ Performance

  □ Tempo médio < 5s (sessão válida)
  □ Tempo máximo < 25s (timeout absoluto)
  □ CPU usage normal (< 30%)
  □ Memory leaks: nenhum detectado
```

---

## 🎓 REFERÊNCIAS

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Router Auth Flow](https://docs.expo.dev/router/reference/authentication/)
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/async-storage/)

---

**Última Atualização:** 26/01/2026  
**Versão:** 1.0.0  
**Autor:** GitHub Copilot
