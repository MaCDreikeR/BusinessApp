# Sistema de Sincronização Offline

## ✨ O que foi implementado

Sistema completo de sincronização bidirecional que permite ao app funcionar offline e sincronizar automaticamente quando a conexão voltar.

### Componentes Criados

1. **`services/syncQueue.ts`** - Fila de operações pendentes
2. **`services/networkMonitor.ts`** - Monitor de conectividade
3. **`services/syncService.ts`** - Serviço de sincronização bidirecional
4. **`hooks/useOfflineSync.ts`** - Hook para facilitar uso
5. **`components/SyncIndicator.tsx`** - Indicador visual de sincronização

## 🚀 Como Usar

### 1. Em uma tela de criação de cliente (exemplo)

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/lib/supabase';
import { networkMonitor } from '@/services/networkMonitor';

export default function CadastroCliente() {
  const { createOffline } = useOfflineSync();

  const handleSalvarCliente = async (dadosCliente: any) => {
    try {
      // Verifica se está online
      const isOnline = networkMonitor.getStatus();

      if (isOnline) {
        // ONLINE: salva direto no Supabase
        const { data, error } = await supabase
          .from('clientes')
          .insert(dadosCliente);

        if (error) throw error;
        Alert.alert('Sucesso', 'Cliente cadastrado!');
      } else {
        // OFFLINE: adiciona à fila de sincronização
        await createOffline('clientes', dadosCliente);
        Alert.alert(
          'Salvo Localmente', 
          'Sem conexão. Dados serão enviados quando conectar.'
        );
      }
    } catch (error) {
      logger.error('Erro ao salvar cliente:', error);
      Alert.alert('Erro', 'Não foi possível salvar o cliente');
    }
  };

  return (
    // ... seu componente
  );
}
```

### 2. Atualização de registro

```typescript
const { updateOffline } = useOfflineSync();

const handleEditarCliente = async (clienteId: string, novosDados: any) => {
  const isOnline = networkMonitor.getStatus();

  if (isOnline) {
    await supabase
      .from('clientes')
      .update(novosDados)
      .eq('id', clienteId);
  } else {
    await updateOffline('clientes', clienteId, novosDados);
  }
};
```

### 3. Exclusão de registro

```typescript
const { deleteOffline } = useOfflineSync();

const handleDeletarCliente = async (clienteId: string) => {
  const isOnline = networkMonitor.getStatus();

  if (isOnline) {
    await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteId);
  } else {
    await deleteOffline('clientes', clienteId);
  }
};
```

### 4. Adicionar indicador visual no header

```typescript
// No layout da sua tela (ex: app/(app)/_layout.tsx)
import { SyncIndicator } from '@/components/SyncIndicator';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <SyncIndicator />,
      }}
    >
      {/* suas rotas */}
    </Stack>
  );
}
```

## 🔄 Funcionamento Automático

### Quando o app fica online novamente

1. **NetworkMonitor** detecta conexão restaurada
2. **SyncService** inicia sincronização automática após 2 segundos
3. **SyncQueue** processa todas as operações pendentes (upload)
4. **SyncService** baixa dados novos do servidor (download)
5. **Usuário** recebe notificação de sincronização completa

### Sincronização Manual

Usuário pode forçar sincronização a qualquer momento:
- Botão "Sincronizar Dados" em Configurações
- Clicando no SyncIndicator (se houver operações pendentes)

## 📊 Status e Indicadores

### SyncIndicator mostra:

- **Roxo com número** - X operações pendentes (pode clicar para sincronizar)
- **Vermelho "Offline"** - Sem conexão com internet
- **Roxo "Sincronizando..."** - Sincronização em andamento
- **Invisível** - Tudo sincronizado e online

## ⚙️ Configurações

### Desativar sincronização automática

```typescript
import { syncService } from '@/services/syncService';

// Desativar
syncService.setAutoSync(false);

// Reativar
syncService.setAutoSync(true);
```

### Verificar operações pendentes

```typescript
import { syncQueue } from '@/services/syncQueue';

const pendingOps = syncQueue.getQueueSize();
console.log(`${pendingOps} operações aguardando sincronização`);
```

### Ver última sincronização

```typescript
import { syncService } from '@/services/syncService';

const lastSync = await syncService.getLastSyncTime();
console.log('Última sincronização:', lastSync);
```

## 🛡️ Segurança

- ✅ Operações incluem `estabelecimento_id` automaticamente
- ✅ Máximo 3 tentativas por operação
- ✅ Operações falhas são removidas após 3 tentativas
- ✅ Dados locais nunca são perdidos no download
- ✅ Cache de leitura é limpo, cache de escrita é preservado

## 🐛 Resolução de Problemas

### Fila não está processando

```typescript
import { syncQueue } from '@/services/syncQueue';

// Ver operações pendentes
const ops = syncQueue.getPendingOperations();
console.log('Operações na fila:', ops);

// Processar manualmente
await syncQueue.processQueue();
```

### Limpar fila (CUIDADO!)

```typescript
import { syncQueue } from '@/services/syncQueue';

// Remove TODAS as operações pendentes (dados serão perdidos!)
await syncQueue.clearQueue();
```

## 📝 Próximos Passos

Para integrar em todas as telas:

1. Busque por `supabase.from().insert()` no código
2. Substitua por lógica com `createOffline()`
3. Repita para `.update()` e `.delete()`
4. Adicione `SyncIndicator` no header
5. Teste offline mode criando/editando registros

## 🎯 Exemplo Completo

Ver arquivo `app/(app)/configuracoes.tsx` linha ~190 para exemplo de integração do botão de sincronização manual.
