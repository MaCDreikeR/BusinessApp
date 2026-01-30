# 🩹 CORREÇÃO: Tela Branca Após Período Sem Uso

**Data:** 26/01/2026  
**Problema:** App fica preso em tela branca ao tentar reabrir após período sem uso  
**Status:** ✅ RESOLVIDO

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. **Race Condition no AuthContext**
**Arquivo:** `contexts/AuthContext.tsx`

**Problema:**
- `getSession()` iniciava um processo assíncrono
- `onAuthStateChange` listener disparava eventos enquanto `getSession()` ainda estava processando
- Múltiplos `setLoading(true)` eram chamados sem um `setLoading(false)` correspondente
- Resultado: Loading infinito, tela branca

**Linha do problema:**
```tsx
// ANTES (PROBLEMÁTICO):
const { data: authListener } = supabase.auth.onAuthStateChange(
  async (_event, session) => {
    setLoading(true); // ❌ Reativava loading sem controle
    // ...
    setLoading(false);
  }
);
```

---

### 2. **Falta de Timeout com Fallback Garantido**
**Arquivo:** `contexts/AuthContext.tsx`

**Problema:**
- Timeout de 10s existia, mas sem retry logic
- Se primeira tentativa falhasse, app travava
- Cache corrompido não era limpo
- Não havia escape automático

**Linha do problema:**
```tsx
// ANTES (PROBLEMÁTICO):
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout ao conectar')), 10000)
);

// Se timeout, apenas limpava estados mas não forçava navegação
catch (error) {
  setSession(null);
  setUser(null);
  // ❌ Não havia retry nem navegação forçada
}
```

---

### 3. **Supabase Sem Timeout Global**
**Arquivo:** `lib/supabase.ts`

**Problema:**
- Requests HTTP sem timeout configurado
- Poderiam ficar pendentes indefinidamente
- Network requests travados nunca eram cancelados

---

### 4. **Timeout no _layout.tsx Sem Ação**
**Arquivo:** `app/_layout.tsx`

**Problema:**
- Timeout mostrava tela de erro, mas não navegava automaticamente
- Usuário ficava preso na tela de erro
- Botão "Tentar Novamente" voltava ao mesmo loop

**Linha do problema:**
```tsx
// ANTES (PROBLEMÁTICO):
if (loadingTimeout) {
  // ❌ Apenas mostrava erro, não navegava
  return <ErrorScreen />;
}
```

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### 1. **AuthContext com Retry Logic e Fallback Garantido**

**Mudanças:**

```tsx
// ✅ NOVOS ESTADOS DE CONTROLE
const [retryCount, setRetryCount] = useState(0);
const [isInitializing, setIsInitializing] = useState(true);
const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
const MAX_RETRIES = 2;
const SESSION_TIMEOUT = 8000; // 8s por tentativa
```

**Lógica de Retry:**
```tsx
// ✅ Retry automático em caso de erro de rede
if (errorMessage.includes('Timeout') && retryCount < MAX_RETRIES) {
  logger.warn(`🔄 Tentando reconectar (${retryCount + 1}/${MAX_RETRIES})...`);
  setRetryCount(prev => prev + 1);
  await new Promise(resolve => setTimeout(resolve, 2000));
  return fetchInitialSession(); // Retry recursivo
}

// ✅ Fallback definitivo após MAX_RETRIES
logger.error(`❌ Falha definitiva após ${retryCount + 1} tentativas`);
await clearAuthState();
await clearAuthCache(); // Limpa cache corrompido
setSessionCheckComplete(true);
```

**Prevenção de Race Condition:**
```tsx
// ✅ Listener ignora eventos durante inicialização
const { data: authListener } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    // ⚠️ Ignora eventos durante inicialização
    if (isInitializing) {
      logger.debug(`⏸️ Evento ignorado: ${event}`);
      return;
    }
    
    // Só reativa loading para eventos relevantes
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      setLoading(true);
      // ... processamento
      setLoading(false);
    }
  }
);
```

---

### 2. **Supabase com Timeout Global**

**Mudanças:**

```tsx
// ✅ Timeout de 10s para todas as requests
global: {
  fetch: (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  },
}

// ✅ Configurações de auth melhoradas
auth: {
  flowType: 'pkce', // Mais seguro para mobile
  debug: __DEV__, // Logs detalhados
}
```

---

### 3. **_layout.tsx com Fallback Absoluto**

**Mudanças:**

```tsx
// ✅ Timeout absoluto de 20s com fallback garantido
const ABSOLUTE_TIMEOUT = 20000;

useEffect(() => {
  if (authLoading && !hasBootRendered) {
    timeoutRef.current = setTimeout(() => {
      logger.error('❌ Timeout absoluto! Forçando login...');
      setLoadingTimeout(true);
      setShouldForceLogin(true);
      
      // 🔥 FALLBACK DE EMERGÊNCIA após 2s
      setTimeout(() => {
        logger.error('🚑 Executando fallback...');
        setHasBootRendered(true);
        router.replace('/(auth)/login');
      }, 2000);
    }, ABSOLUTE_TIMEOUT);
  }
}, [authLoading, hasBootRendered]);
```

**Navegação Forçada:**
```tsx
// ✅ Força navegação quando timeout é atingido
useEffect(() => {
  if (shouldForceLogin && !authLoading) {
    logger.error('🚑 Forçando navegação...');
    setHasBootRendered(true);
    safeReplace('/(auth)/login');
    setShouldForceLogin(false);
  }
  // ...
}, [shouldForceLogin, authLoading, /* ... */]);
```

---

## 🧪 COMO TESTAR

### **Teste 1: Sessão Expirada (Simulado)**

```bash
# Terminal
npx expo start --clear

# No app:
1. Faça login
2. Abra DevTools do navegador (se web) ou React Native Debugger
3. Execute:
   localStorage.clear(); // ou AsyncStorage.clear()
4. Force-close o app
5. Reabra o app
✅ Esperado: Deve redirecionar para login em até 20s
```

---

### **Teste 2: Sem Internet**

```bash
# No dispositivo:
1. Faça login com internet
2. Force-close o app
3. Desative WiFi e dados móveis
4. Reabra o app
✅ Esperado: 
   - Tentará reconectar 3x (8s cada)
   - Após 24s total, redireciona para login
   - Mensagem de erro de conexão aparece
```

---

### **Teste 3: Token Refresh Falhando**

```bash
# Via código (teste manual):
1. Faça login
2. No Supabase Dashboard, remova o refresh_token da tabela auth.sessions
3. Force-close o app
4. Reabra
✅ Esperado:
   - getSession() falha ao fazer refresh
   - Retry 2x
   - Cache limpo
   - Redireciona para login
```

---

### **Teste 4: Timeout Absoluto (Stress Test)**

```bash
# Via código:
# Em AuthContext.tsx, reduza SESSION_TIMEOUT para 1000 (1s)
const SESSION_TIMEOUT = 1000; // Teste apenas

# Execute:
1. Force-close app
2. Reabra
✅ Esperado:
   - Timeout após 3s (1s x 3 tentativas)
   - Fallback automático
   - Navega para login em 5s total
```

---

## 📊 LOGS ESPERADOS (Console)

**Sucesso:**
```
🔐 Tentando recuperar sessão (tentativa 1/3)...
✅ Sessão recuperada com sucesso
🔄 Inicializando serviço de sincronização...
```

**Retry:**
```
🔐 Tentando recuperar sessão (tentativa 1/3)...
❌ Erro ao carregar sessão: Timeout ao conectar
🔄 Tentando reconectar (1/2)...
🔐 Tentando recuperar sessão (tentativa 2/3)...
✅ Sessão recuperada com sucesso
```

**Falha Total:**
```
🔐 Tentando recuperar sessão (tentativa 1/3)...
❌ Erro: Timeout ao conectar
🔄 Tentando reconectar (1/2)...
🔐 Tentando recuperar sessão (tentativa 2/3)...
❌ Erro: Timeout ao conectar
🔄 Tentando reconectar (2/2)...
🔐 Tentando recuperar sessão (tentativa 3/3)...
❌ Erro: Timeout ao conectar
❌ Falha definitiva após 3 tentativas
🗑️ Cache de autenticação limpo
⏱️ Iniciando timeout de segurança...
❌ Timeout absoluto atingido! Forçando navegação para login...
🚑 Executando fallback de emergência...
```

---

## 🔧 CONFIGURAÇÕES AJUSTÁVEIS

### **Timeouts:**

```tsx
// AuthContext.tsx
const SESSION_TIMEOUT = 8000; // Padrão: 8s (ajustar para conexões lentas)
const MAX_RETRIES = 2; // Padrão: 2 (total 3 tentativas)

// _layout.tsx
const ABSOLUTE_TIMEOUT = 20000; // Padrão: 20s (timeout de emergência)

// supabase.ts
setTimeout(() => controller.abort(), 10000); // Padrão: 10s por request
```

**Recomendações:**
- **WiFi estável:** Manter padrões
- **Dados móveis lentos:** `SESSION_TIMEOUT = 12000` (12s)
- **3G/2G:** `SESSION_TIMEOUT = 15000` (15s), `MAX_RETRIES = 3`

---

## 🛡️ SEGURANÇA

### **O que foi protegido:**

1. **Limpa cache corrompido** após falhas
2. **Previne retry infinito** (MAX_RETRIES)
3. **Timeout absoluto** garante escape
4. **Logs detalhados** para debugging
5. **Fallback de emergência** após 20s

### **O que NÃO foi alterado:**

- Lógica de verificação de conta (status `ativa`)
- Permissões por role (`super_admin`, etc)
- Sincronização offline
- Heartbeat de atividade

---

## 📝 CHECKLIST DE VALIDAÇÃO

- [x] AuthContext com retry logic
- [x] Timeout com fallback garantido
- [x] Race condition resolvida
- [x] Supabase com timeout global
- [x] Cache corrompido limpo automaticamente
- [x] Logs detalhados de debugging
- [x] Timeout absoluto no _layout
- [x] Navegação forçada após timeout
- [x] Testes de stress documentados

---

## 🚀 DEPLOYMENT

**Antes de mergear:**

```bash
# 1. Teste localmente
npm run start -- --clear

# 2. Teste em dispositivo físico
npx expo run:android --variant release
# ou
npx expo run:ios --configuration Release

# 3. Monitore logs por 5 minutos
# Aguarde até ver "✅ Sessão recuperada"

# 4. Force-close e reabra 3x
# Verifique que sempre vai para login ou home

# 5. Teste sem internet
# Deve mostrar erro e ir para login
```

**Após mergear:**

- Monitorar Sentry/logs por 24h
- Buscar por: "Timeout absoluto", "Falha definitiva"
- Se > 5% dos usuários atingirem timeout, aumentar `SESSION_TIMEOUT`

---

## 🐛 TROUBLESHOOTING

### **Problema:** Ainda trava em tela branca

**Possíveis causas:**
1. `ABSOLUTE_TIMEOUT` muito alto (diminuir para 15000)
2. Cache do app não foi limpo (rodar `npx expo start --clear`)
3. Versão do `@supabase/supabase-js` desatualizada (atualizar para latest)

**Solução:**
```bash
# Limpar cache total
rm -rf node_modules
npm cache clean --force
npm install
npx expo start --clear
```

---

### **Problema:** Múltiplos retries mesmo com internet

**Possível causa:**
- Supabase com rate limiting
- URL do Supabase incorreta
- Firewall bloqueando requests

**Solução:**
```tsx
// Verificar logs:
// Se ver "429 Too Many Requests", aumentar delays:
await new Promise(resolve => setTimeout(resolve, 5000)); // 5s
```

---

### **Problema:** App vai pra login mesmo com sessão válida

**Possível causa:**
- Listener `onAuthStateChange` não está recebendo `TOKEN_REFRESHED`

**Solução:**
```tsx
// Adicionar log no listener:
logger.info(`🔔 Auth event: ${event}`, { hasSession: !!session });

// Verificar se evento TOKEN_REFRESHED está sendo ignorado
```

---

## 📚 REFERÊNCIAS

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/async-storage/)
- [React Navigation Auth Flow](https://reactnavigation.org/docs/auth-flow/)

---

**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Revisado:** [Seu Nome]  
**Última Atualização:** 26/01/2026
