# 📚 Configuração do Supabase - Guia de Uso

Este diretório contém a configuração do cliente Supabase para o BusinessApp.

---

## 📁 Arquivo Principal

### `supabase.ts` ✅ **USE ESTE ARQUIVO**

**Descrição:** Configuração principal e única do cliente Supabase.

**Funcionalidades:**
- ✅ Detecção automática de ambiente (desenvolvimento/produção)
- ✅ Storage híbrido (SecureStore + AsyncStorage)
- ✅ Suporte para Supabase local e remoto
- ✅ Funções auxiliares de conexão e sessão
- ✅ Validação de variáveis de ambiente
- ✅ Logs apenas em modo de desenvolvimento

**Como usar:**
```typescript
import { supabase } from '../lib/supabase';

// Uso normal
const { data, error } = await supabase
  .from('tabela')
  .select('*');

// Testar conexão
import { testConnection } from '../lib/supabase';
const isConnected = await testConnection();

// Verificar sessão
import { checkSession } from '../lib/supabase';
const session = await checkSession();
```

---

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (use `.env.example` como base):

#### Para Produção:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

#### Para Desenvolvimento Local:
```env
# Produção (padrão)
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Local (opcional - usado quando __DEV__ === true)
EXPO_PUBLIC_SUPABASE_URL_LOCAL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Como Funciona a Detecção de Ambiente

O arquivo `supabase.ts` detecta automaticamente o ambiente:

1. **Desenvolvimento Local:** Se `__DEV__` é true E existem variáveis `*_LOCAL`
2. **Produção:** Caso contrário, usa as variáveis padrão

```typescript
// Lógica interna:
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

const supabaseUrl = isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL  // ← Usa local se disponível
  : process.env.EXPO_PUBLIC_SUPABASE_URL;        // ← Senão usa produção
```

---

## 🗄️ Storage Híbrido

O cliente usa um sistema de storage inteligente:

| Tipo de Dado | Storage Usado | Razão |
|--------------|---------------|-------|
| Tokens pequenos (<2KB) | SecureStore | Mais seguro (criptografado) |
| Tokens grandes (≥2KB) | AsyncStorage | Sem limite de tamanho |

**Benefícios:**
- ✅ Máxima segurança para tokens de autenticação
- ✅ Suporte para tokens grandes
- ✅ Persistência entre sessões
- ✅ Auto-refresh de tokens

---

## 📋 Funções Disponíveis

### `supabase` (cliente principal)
```typescript
import { supabase } from '../lib/supabase';
```

### `testConnection()`
Testa a conexão com o Supabase.
```typescript
import { testConnection } from '../lib/supabase';

const isConnected = await testConnection();
// Retorna: true se conectado, false caso contrário
```

### `checkSession()`
Verifica se há uma sessão ativa.
```typescript
import { checkSession } from '../lib/supabase';

const session = await checkSession();
// Retorna: Session | null
```

### `verificarTabelaUsuarios()` ⚠️ Deprecated
Cria tabela de usuários se não existir. Use migrações em vez disso.

---

## 🚀 Guia Rápido

### 1️⃣ Desenvolvimento Local

```bash
# 1. Inicie o Supabase local
npm run supabase:start

# 2. Configure variáveis locais no .env
EXPO_PUBLIC_SUPABASE_URL_LOCAL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL=eyJhbGc...

# 3. Inicie o app
npm start
```

### 2️⃣ Produção

```bash
# 1. Configure variáveis de produção no .env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave...

# 2. Build
npm run build
```

---

## ⚠️ Avisos Importantes

1. **Nunca commite o arquivo `.env`** - Ele está no `.gitignore`
2. **Use `.env.example`** como template
3. **Chaves sensíveis** devem estar apenas no `.env` (nunca no código)
4. **Ambiente de produção** deve ter variáveis configuradas no EAS/Expo

---

## 🔄 Migração de Código Antigo

Se você tinha imports de `supabase-local.ts` ou `supabase-config.ts`:

### ❌ Antes:
```typescript
import { supabase } from '../lib/supabase-local';
import { SUPABASE_CONFIG } from '../lib/supabase-config';
```

### ✅ Depois:
```typescript
import { supabase } from '../lib/supabase';
```

---

## 📞 Troubleshooting

### Erro: "Variáveis de ambiente não estão definidas"
**Solução:** Verifique se o arquivo `.env` existe e contém as variáveis necessárias.

### Não conecta ao Supabase local
**Soluções:**
1. Verifique se o Supabase local está rodando: `npm run supabase:status`
2. Confirme a URL: `http://127.0.0.1:54321` (não use `localhost`)
3. Verifique as variáveis `*_LOCAL` no `.env`

### Sessão não persiste
**Solução:** Verifique se SecureStore e AsyncStorage têm permissões adequadas.

---

## 📝 Changelog

### v2.0.0 (30/11/2025)
- ✅ Consolidado `supabase.ts`, `supabase-local.ts` e `supabase-config.ts`
- ✅ Adicionada detecção automática de ambiente
- ✅ Melhorados logs de desenvolvimento
- ✅ Documentação completa
- ✅ Funções auxiliares aprimoradas
