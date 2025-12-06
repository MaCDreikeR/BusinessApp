# 📝 Guia de Logging - BusinessApp

## 🎯 Visão Geral

Este projeto usa um sistema de logging customizado que **automaticamente desabilita logs em produção**, exceto erros críticos. Isso melhora a performance e segurança do app.

## ⚠️ Regra de Ouro

**NUNCA use `console.log`, `console.warn` ou `console.error` diretamente!**

❌ **ERRADO:**
```typescript
console.log('Dados carregados:', data);
console.error('Erro ao salvar:', error);
```

✅ **CORRETO:**
```typescript
import { logger } from '@utils/logger';

logger.debug('Dados carregados:', data);
logger.error('Erro ao salvar:', error);
```

## 🔧 Importação

```typescript
// Usando alias (recomendado)
import { logger } from '@utils/logger';

// Ou caminho relativo
import { logger } from '../utils/logger';
import { logger } from '../../utils/logger';
```

## 📚 Métodos Disponíveis

### 1. **logger.log()** - Log Básico
- **Quando usar**: Logs gerais que não se encaixam em outras categorias
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `🔹`

```typescript
logger.log('Aplicativo iniciado');
logger.log('Configurações carregadas:', config);
```

---

### 2. **logger.debug()** - Debugging
- **Quando usar**: Informações detalhadas para debug durante desenvolvimento
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `🐛 [DEBUG]`

```typescript
logger.debug('Estado atual:', state);
logger.debug('Parâmetros recebidos:', params);
logger.debug('📱 Largura da tela (dp):', screenWidth);
```

---

### 3. **logger.info()** - Informações
- **Quando usar**: Informações importantes sobre o fluxo da aplicação
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `ℹ️ [INFO]`

```typescript
logger.info('Dados sincronizados com sucesso');
logger.info('Usuário autenticado:', user.email);
logger.info('🔄 Verificando agendamentos...');
```

---

### 4. **logger.success()** - Sucesso
- **Quando usar**: Operações concluídas com sucesso
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `✅ [SUCCESS]`

```typescript
logger.success('Agendamento criado com sucesso!');
logger.success('✅ Comanda criada:', comanda.id);
logger.success('Perfil atualizado');
```

---

### 5. **logger.warn()** - Avisos
- **Quando usar**: Situações anormais que não são erros críticos
- **Produção**: ✅ **EXIBE** (importante para monitoramento)
- **Desenvolvimento**: ✅ Exibe com prefixo `⚠️`

```typescript
logger.warn('API lenta, usando fallback');
logger.warn('⚠️ Produto com estoque baixo:', produto.nome);
logger.warn('Token expirando em breve');
```

---

### 6. **logger.error()** - Erros
- **Quando usar**: Erros e exceções que precisam ser investigados
- **Produção**: ✅ **EXIBE** (crítico para debugging)
- **Desenvolvimento**: ✅ Exibe com prefixo `❌`

```typescript
logger.error('Erro ao carregar dados:', error);
logger.error('❌ Falha ao criar comanda:', error.message);
logger.error('Erro inesperado:', error);

// Com try/catch
try {
  await supabase.from('clientes').insert(data);
} catch (error) {
  logger.error('Erro ao salvar cliente:', error);
}
```

---

### 7. **logger.navigation()** - Navegação
- **Quando usar**: Rastreamento de navegação entre telas
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `🧭 [NAVIGATION]`

```typescript
logger.navigation('login', 'dashboard');
logger.navigation('clientes/lista', 'clientes/novo');
```

**Exemplo no código:**
```typescript
const handleNavigate = (screen: string) => {
  logger.navigation(route.name, screen);
  router.push(`/(app)/${screen}`);
};
```

---

### 8. **logger.api()** - Chamadas API
- **Quando usar**: Log de requisições HTTP/Supabase
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `🌐 [API]`

```typescript
logger.api('GET', '/api/clientes');
logger.api('POST', '/api/agendamentos', 201);
logger.api('DELETE', '/api/produtos/123', 204);
```

**Exemplo com Supabase:**
```typescript
logger.api('GET', 'supabase/agendamentos');
const { data, error } = await supabase.from('agendamentos').select();
if (error) {
  logger.error('Erro na API:', error);
} else {
  logger.api('GET', 'supabase/agendamentos', 200);
}
```

---

### 9. **logger.auth()** - Autenticação
- **Quando usar**: Eventos de login, logout, sessão
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `🔐 [AUTH]`

```typescript
logger.auth('Login realizado', { email: user.email });
logger.auth('Logout');
logger.auth('Token renovado');
logger.auth('Sessão expirada');
```

**Exemplo no AuthContext:**
```typescript
const signIn = async (email: string, password: string) => {
  logger.auth('Tentativa de login', { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    logger.error('Erro no login:', error);
    return;
  }
  
  logger.auth('Login bem-sucedido', { userId: data.user.id });
};
```

---

### 10. **logger.database()** - Operações Database
- **Quando usar**: Operações CRUD no banco de dados
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe com prefixo `💾 [DB]`

```typescript
logger.database('SELECT', 'clientes');
logger.database('INSERT', 'agendamentos', { id: newId });
logger.database('UPDATE', 'produtos', { count: 5 });
logger.database('DELETE', 'vendas', { id: '123' });
```

**Exemplo completo:**
```typescript
const criarAgendamento = async (data: AgendamentoData) => {
  logger.database('INSERT', 'agendamentos', data);
  
  const { data: result, error } = await supabase
    .from('agendamentos')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    logger.error('Erro ao criar agendamento:', error);
    throw error;
  }
  
  logger.success('Agendamento criado:', result.id);
  return result;
};
```

---

### 11. **logger.group()** - Agrupar Logs
- **Quando usar**: Agrupar múltiplos logs relacionados
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe agrupado

```typescript
logger.group('Carregando dados do dashboard', () => {
  logger.debug('Buscando agendamentos...');
  logger.debug('Buscando vendas...');
  logger.debug('Buscando clientes...');
  logger.success('Dados carregados!');
});
```

**Saída no console:**
```
📦 Carregando dados do dashboard
  🐛 [DEBUG] Buscando agendamentos...
  🐛 [DEBUG] Buscando vendas...
  🐛 [DEBUG] Buscando clientes...
  ✅ [SUCCESS] Dados carregados!
```

---

### 12. **logger.time()** - Medição de Performance
- **Quando usar**: Medir tempo de execução de operações
- **Produção**: ❌ Não exibe
- **Desenvolvimento**: ✅ Exibe tempo decorrido

```typescript
logger.time('loadData', async () => {
  const data = await fetchData();
  return data;
});
```

**Saída no console:**
```
⏱️ loadData: 234ms
```

**Exemplo com cálculo de estoque:**
```typescript
const calcularEstoque = async () => {
  return logger.time('calcularEstoque', async () => {
    const produtos = await supabase.from('produtos').select();
    // ... processamento pesado ...
    return resultado;
  });
};
```

---

## 📋 Tabela Resumo

| Método | Produção | Desenvolvimento | Uso Principal |
|--------|----------|-----------------|---------------|
| `log()` | ❌ | ✅ 🔹 | Logs gerais |
| `debug()` | ❌ | ✅ 🐛 | Debugging detalhado |
| `info()` | ❌ | ✅ ℹ️ | Informações importantes |
| `success()` | ❌ | ✅ ✅ | Operações bem-sucedidas |
| `warn()` | ✅ | ✅ ⚠️ | Avisos não-críticos |
| `error()` | ✅ | ✅ ❌ | Erros e exceções |
| `navigation()` | ❌ | ✅ 🧭 | Rastreamento de rotas |
| `api()` | ❌ | ✅ 🌐 | Chamadas HTTP/API |
| `auth()` | ❌ | ✅ 🔐 | Login/Logout/Sessão |
| `database()` | ❌ | ✅ 💾 | Operações CRUD |
| `group()` | ❌ | ✅ 📦 | Agrupar logs |
| `time()` | ❌ | ✅ ⏱️ | Medir performance |

---

## 🎨 Boas Práticas

### 1. **Use emojis para clareza**
```typescript
logger.debug('📱 Dispositivo:', deviceInfo);
logger.success('✅ Sincronização completa');
logger.warn('⚠️ Conexão instável');
logger.error('❌ Falha crítica');
```

### 2. **Seja descritivo**
```typescript
// ❌ Ruim
logger.debug('data', data);

// ✅ Bom
logger.debug('Dados do cliente carregados:', data);
```

### 3. **Use o método certo**
```typescript
// ❌ Errado
logger.log('Erro ao salvar'); // Não aparece em produção!

// ✅ Correto
logger.error('Erro ao salvar'); // Aparece em produção
```

### 4. **Contextualize erros**
```typescript
// ❌ Ruim
logger.error(error);

// ✅ Bom
logger.error('Erro ao criar agendamento para cliente ID 123:', error);
```

### 5. **Evite dados sensíveis**
```typescript
// ❌ NUNCA faça isso
logger.debug('Senha do usuário:', password);
logger.debug('Token de acesso:', token);

// ✅ Correto
logger.debug('Autenticação realizada para:', user.email);
logger.debug('Token renovado');
```

---

## 🔍 Verificação Automática

O projeto tem um script que **bloqueia o build** se encontrar `console.log` no código:

```bash
# Verificar manualmente
npm run check:console

# Executado automaticamente antes do build
npm run build
```

**Saída de sucesso:**
```
✅ Nenhum console.log encontrado no código de produção!
✨ Todos os logs estão usando o sistema logger.
```

**Saída de erro:**
```
❌ Encontrados 3 console.log em produção:

📁 app/(app)/index.tsx
   console.log('Dados carregados:', data);

💡 Use o sistema logger ao invés de console:
   logger.debug()  // Para desenvolvimento
   logger.error()  // Para erros
```

---

## 🚀 Migração de Código Antigo

Se você encontrar `console.log` no código, migre assim:

```typescript
// ANTES
console.log('Iniciando...');
console.warn('Atenção!');
console.error('Falhou:', error);

// DEPOIS
import { logger } from '@utils/logger';

logger.debug('Iniciando...');
logger.warn('Atenção!');
logger.error('Falhou:', error);
```

### Script de Migração Automática

```bash
# Migrar todos os arquivos de uma pasta
python3 << 'EOF'
import re
from pathlib import Path

for filepath in Path('app/(app)').rglob('*.tsx'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'logger' not in content:
        # Adicionar import
        lines = content.split('\n')
        last_import = max([i for i, line in enumerate(lines) if line.startswith('import')], default=0)
        lines.insert(last_import + 1, "import { logger } from '@utils/logger';")
        content = '\n'.join(lines)
    
    # Substituir
    content = re.sub(r'console\.log\(', 'logger.debug(', content)
    content = re.sub(r'console\.warn\(', 'logger.warn(', content)
    content = re.sub(r'console\.error\(', 'logger.error(', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
EOF
```

---

## 📊 Estatísticas do Projeto

Após a migração completa:
- ✅ **0 console.log** no código de produção
- ✅ **70+ arquivos** migrados para logger
- ✅ **200+ instâncias** convertidas
- ✅ **100% cobertura** do sistema de logging

---

## 🛠️ Configuração Avançada

O logger detecta automaticamente o ambiente:

```typescript
// utils/logger.ts
const isDevelopment = __DEV__;

// Em produção (__DEV__ = false):
logger.debug('teste'); // Não exibe
logger.error('erro');  // ✅ Exibe

// Em desenvolvimento (__DEV__ = true):
logger.debug('teste'); // ✅ Exibe
logger.error('erro');  // ✅ Exibe
```

---

## 📞 Suporte

Dúvidas sobre logging?
1. Consulte este guia primeiro
2. Veja exemplos no código: `app/_layout.tsx`, `contexts/AuthContext.tsx`
3. Execute `npm run check:console` para validar
4. Em caso de dúvida, prefira `logger.debug()` para desenvolvimento e `logger.error()` para erros

---

**Última atualização**: 2024
**Versão**: 1.0.0
