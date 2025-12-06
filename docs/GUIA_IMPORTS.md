# 📝 Guia de Importações - BusinessApp

Este documento define os padrões de importação para manter consistência no projeto.

---

## 🎯 **REGRAS GERAIS**

### ✅ **SEMPRE USE**
- Imports específicos do arquivo (não do diretório)
- Paths absolutos via aliases quando possível
- Named exports em vez de default exports

### ❌ **NUNCA USE**
- Imports de arquivos `index.ts` genéricos para componentes
- Paths relativos muito longos (`../../../`)
- Import `* as` desnecessários

---

## 📁 **ALIASES DISPONÍVEIS**

Configure seu editor para reconhecer estes aliases (já configurado em `tsconfig.json`, `babel.config.js` e `metro.config.js`):

```typescript
@lib         → /lib/
@components  → /components/
@contexts    → /contexts/
@utils       → /utils/
@services    → /services/
```

---

## 🧩 **COMPONENTES**

### ✅ **CORRETO - Import específico**
```typescript
// Componentes themed
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { ThemedTextInput } from '../../components/ThemedTextInput';

// Ou usando alias (preferível)
import { ThemedText } from '@components/ThemedText';
import { ThemedView } from '@components/ThemedView';

// Componentes específicos
import { Button } from '@components/Button';
import DashboardCard from '@components/DashboardCard';
import AgendamentoNotificacao from '@components/AgendamentoNotificacao';
```

### ❌ **INCORRETO - Import genérico**
```typescript
// NÃO FAÇA ISSO
import { ThemedText } from '../../components/Themed';
import { ThemedText, ThemedView } from '../../components';
```

**Razão:** Dificulta rastreamento de dependências e pode causar imports circulares.

---

## 🔧 **UTILITÁRIOS**

### ✅ **CORRETO**
```typescript
// Logger
import { logger } from '@utils/logger';
import { logger } from '../utils/logger';

// Futuras utilidades
import { validators } from '@utils/validators';
import { formatters } from '@utils/formatters';
```

### Uso do Logger
```typescript
// Em vez de console.log
logger.log('Mensagem normal');
logger.warn('Aviso');
logger.error('Erro'); // Único que aparece em produção
logger.debug('Detalhes técnicos');
logger.info('Informação importante');
logger.success('Operação bem-sucedida');

// Logs especializados
logger.navigation('/login', '/dashboard');
logger.api('GET', '/api/users', 200);
logger.auth('login', { userId: '123' });
logger.database('SELECT', 'usuarios', { count: 10 });
```

---

## 📚 **BIBLIOTECAS**

### ✅ **CORRETO**
```typescript
// Supabase (SEMPRE use o arquivo principal)
import { supabase } from '@lib/supabase';
import { testConnection, checkSession } from '@lib/supabase';

// Contextos
import { useAuth } from '@contexts/AuthContext';
```

### ❌ **INCORRETO**
```typescript
// NÃO FAÇA ISSO
import { supabase } from '@lib/supabase-local'; // Arquivo removido
import { SUPABASE_CONFIG } from '@lib/supabase-config'; // Arquivo removido
```

---

## 🛠️ **SERVIÇOS**

### ✅ **CORRETO**
```typescript
import { enviarMensagemWhatsapp } from '@services/whatsapp';
import { agendarNotificacao } from '@services/notifications';
```

---

## 🎨 **HOOKS**

### ✅ **CORRETO**
```typescript
import { usePermissions } from '../hooks/usePermissions';
import { useColorScheme } from '../hooks/useColorScheme';
import { useThemeColor } from '../hooks/useThemeColor';
```

---

## 🌈 **CONSTANTES**

### ✅ **CORRETO**
```typescript
import { Colors } from '../constants/Colors';
```

---

## 📋 **CHECKLIST DE IMPORTS**

Ao adicionar novos imports, verifique:

- [ ] ✅ Usa path específico (não genérico)
- [ ] ✅ Usa alias quando path relativo tem 3+ níveis
- [ ] ✅ Import de componentes usa arquivo específico (ThemedText, não Themed)
- [ ] ✅ Import de logger usa `@utils/logger`
- [ ] ✅ Import de supabase usa `@lib/supabase` (não -local ou -config)
- [ ] ✅ Named exports quando possível

---

## 🔄 **MIGRAÇÃO DE CÓDIGO ANTIGO**

Se você encontrar imports antigos, migre assim:

### Componentes
```typescript
// ❌ Antigo
import { ThemedText } from '../../../components/Themed';

// ✅ Novo
import { ThemedText } from '@components/ThemedText';
```

### Console.log
```typescript
// ❌ Antigo
console.log('Debug info');
console.error('Error');

// ✅ Novo
import { logger } from '@utils/logger';
logger.debug('Debug info');
logger.error('Error');
```

### Supabase
```typescript
// ❌ Antigo
import { supabase } from '../../lib/supabase-local';

// ✅ Novo
import { supabase } from '@lib/supabase';
```

---

## 📊 **EXEMPLOS COMPLETOS**

### Tela Simples
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@components/ThemedText';
import { ThemedView } from '@components/ThemedView';
import { logger } from '@utils/logger';

export default function MinhaTelaScreen() {
  logger.info('Tela carregada');
  
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Minha Tela</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
```

### Tela com Dados
```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ThemedText } from '@components/ThemedText';
import { supabase } from '@lib/supabase';
import { useAuth } from '@contexts/AuthContext';
import { logger } from '@utils/logger';

export default function ListaScreen() {
  const { user } = useAuth();
  const [dados, setDados] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      logger.time('carregarDados');
      
      const { data, error } = await supabase
        .from('tabela')
        .select('*');
      
      if (error) throw error;
      
      logger.database('SELECT', 'tabela', { count: data?.length });
      setDados(data || []);
      
      logger.timeEnd('carregarDados');
    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={dados}
        renderItem={({ item }) => (
          <ThemedText>{item.nome}</ThemedText>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

---

## 🚨 **AVISOS**

1. **Não crie arquivos `index.ts` barrel exports** para componentes - dificulta tree-shaking
2. **Use logger em vez de console** - logs condicionais economizam performance
3. **Prefira aliases para imports profundos** - `@components` em vez de `../../../components`
4. **Mantenha consistência** - se um arquivo usa path relativo, outros no mesmo nível também devem

---

## 📞 **Dúvidas?**

Veja também:
- `utils/logger.ts` - Documentação do sistema de logging
- `lib/README_SUPABASE.md` - Guia do Supabase
- `tsconfig.json` - Configuração de paths
