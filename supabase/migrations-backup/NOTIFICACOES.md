# 📱 Configuração de Notificações - BusinessApp

## 🎯 Tipos de Notificações

### 1. **Notificação Modal (In-App)** ✅ JÁ CONFIGURADA
- Aparece como popup dentro do app
- Mostra foto do cliente, serviço e horário
- Acionada automaticamente 5 minutos antes do agendamento
- Arquivo: `hooks/useAgendamentoNotificacao.ts`

### 2. **Notificação Local (Barra de Status)** ✅ JÁ CONFIGURADA
- Aparece na barra de notificações do Android/iOS
- Dispara junto com a notificação modal
- Persiste mesmo se o app estiver em segundo plano
- Configurada no mesmo hook acima

### 3. **Notificação Push (Remota)** ⚙️ REQUER CONFIGURAÇÃO

---

## ⚙️ Configuração Atual (Notificações Locais)

### ✅ O que já está funcionando:

1. **Verificação automática**:
   - A cada 30 segundos
   - Busca agendamentos entre -5min e +5min do horário atual

2. **Notificação dupla**:
   - Modal in-app (popup visual)
   - Notificação local (barra de status)

3. **Conteúdo da notificação**:
   ```
   Título: 🔔 Agendamento Iniciando!
   Corpo: [Nome Cliente] - [Serviço] às [Horário]
   ```

4. **Dados extras**:
   - ID do agendamento
   - Nome do cliente
   - Serviço
   - Horário

---

## 🔧 Como Testar as Notificações Locais

### 1. **Permissões Android**

Adicione ao `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <!-- Adicione dentro de <manifest>, antes de <application> -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.VIBRATE" />
  
  <application>
    <!-- ... resto do código ... -->
  </application>
</manifest>
```

### 2. **Solicitar Permissões no App**

No arquivo `app/(app)/_layout.tsx`, adicione:

```typescript
import { registerForPushNotificationsAsync } from '../services/notifications';

// Dentro do componente, após carregar o usuário:
useEffect(() => {
  registerForPushNotificationsAsync();
}, []);
```

### 3. **Testar**

1. Crie um agendamento para daqui a 6 minutos
2. Aguarde até faltarem 5 minutos
3. Você verá:
   - ✅ Popup no app (modal)
   - ✅ Notificação na barra de status

---

## 🚀 Configuração Avançada (Notificações Push Remotas)

### Para enviar notificações mesmo com app fechado:

### 1. **Configurar Projeto Expo**

```bash
# No terminal, execute:
npx expo install expo-notifications expo-device

# Configure o EAS:
npx eas build:configure
```

### 2. **Atualizar `app.config.js`**

```javascript
export default {
  expo: {
    // ... configurações existentes ...
    
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#7C3AED",
      androidMode: "default",
      androidCollapsedTitle: "BusinessApp"
    },
    
    android: {
      // ... configurações existentes ...
      googleServicesFile: "./google-services.json", // Para Firebase
      useNextNotificationsApi: true,
    },
    
    ios: {
      // ... configurações existentes ...
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      }
    }
  }
};
```

### 3. **Firebase Cloud Messaging (Android)**

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie/selecione seu projeto
3. Baixe `google-services.json`
4. Coloque na raiz do projeto
5. Configure no `app.config.js` (acima)

### 4. **Apple Push Notification (iOS)**

1. Acesse [Apple Developer](https://developer.apple.com)
2. Crie um certificado APNs
3. Configure no Expo:

```bash
npx eas credentials
```

### 5. **Agendar Notificações Futuras**

Para notificar 1 hora antes, 15 minutos antes, etc:

```typescript
import * as Notifications from 'expo-notifications';

// Agendar notificação para 1 hora antes
const agendarNotificacao = async (agendamento) => {
  const dataHora = new Date(agendamento.data_hora);
  const umaHoraAntes = new Date(dataHora.getTime() - 60 * 60 * 1000);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Agendamento em 1 hora',
      body: `${agendamento.cliente} - ${agendamento.servico}`,
      data: { agendamentoId: agendamento.id },
    },
    trigger: {
      date: umaHoraAntes,
    },
  });
};
```

---

## 📊 Personalização de Notificações

### Canal Android (Importância e Som)

Edite `app/services/notifications.ts`:

```typescript
await Notifications.setNotificationChannelAsync('agendamentos', {
  name: 'Agendamentos',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#7C3AED',
  sound: 'default', // ou 'custom_sound.wav'
  enableVibrate: true,
  enableLights: true,
  showBadge: true,
});
```

### Som Customizado

1. Adicione arquivo `.wav` em `android/app/src/main/res/raw/`
2. Use `sound: 'custom_sound'` na notificação

---

## 🎨 Notificações com Imagem (Android)

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: '🔔 Agendamento Iniciando!',
    body: `${cliente} - ${servico}`,
    data: { ... },
    // Adicionar imagem grande
    attachments: cliente_foto ? [{
      url: cliente_foto,
      type: 'image',
    }] : [],
  },
  trigger: null,
});
```

---

## 📝 Histórico de Notificações

Já existe uma tabela `notificacoes_historico` no Supabase que salva:
- Título
- Mensagem
- Tipo
- Data de envio
- Data de expiração (48h)

Para visualizar o histórico, crie uma tela em `app/(app)/notificacoes.tsx`:

```typescript
import { getHistoricoNotificacoes } from '../services/notifications';

const [notificacoes, setNotificacoes] = useState([]);

useEffect(() => {
  const carregar = async () => {
    const historico = await getHistoricoNotificacoes();
    setNotificacoes(historico);
  };
  carregar();
}, []);
```

---

## 🔔 Configurações Recomendadas

### Frequência de Notificações
- ✅ **1 hora antes**: Lembrete inicial
- ✅ **15 minutos antes**: Lembrete urgente
- ✅ **5 minutos antes**: Notificação de início (ATUAL)

### Horários de Funcionamento
Evite notificações fora do horário comercial:

```typescript
const horarioComercial = () => {
  const hora = new Date().getHours();
  return hora >= 8 && hora <= 22; // 8h às 22h
};

if (horarioComercial()) {
  // Enviar notificação
}
```

---

## 🐛 Troubleshooting

### Notificações não aparecem:

1. **Verificar permissões**:
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Status permissão:', status);
```

2. **Testar manualmente**:
```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Teste',
    body: 'Notificação de teste',
  },
  trigger: { seconds: 2 },
});
```

3. **Verificar canal Android**:
```typescript
const channels = await Notifications.getNotificationChannelsAsync();
console.log('Canais:', channels);
```

---

## 📚 Referências

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/notifications/)

---

## ✅ Status Atual

- ✅ Notificação modal (in-app)
- ✅ Notificação local (barra de status)
- ✅ Verificação automática a cada 30s
- ✅ Janela de 5min antes/depois
- ✅ Evita duplicatas
- ⏳ Notificações push remotas (requer configuração EAS)
- ⏳ Agendamento antecipado (1h antes, etc)
