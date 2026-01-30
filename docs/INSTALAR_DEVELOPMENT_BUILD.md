# 📱 Como Instalar o Development Build

## 🎯 O Que é Development Build?

- 🎨 Ícone customizado do BusinessApp
- 🔌 Precisa do Metro Server rodando (`npm start`)
- ⚡ Hot Reload: mudanças aparecem instantaneamente
- 🐛 Dev Menu: sacuda o celular para abrir

---

## 🚀 MÉTODO 1: Via EAS Build (Recomendado)

### Passo 1: Instalar EAS CLI

```bash
npm install -g eas-cli
```

### Passo 2: Login no Expo

```bash
eas login
```

### Passo 3: Configurar o Projeto

```bash
eas build:configure
```

### Passo 4: Buildar Development Build

```bash
# Para Android
eas build --profile development --platform android

# Aguarde o build terminar (leva ~10-15 minutos)
```

### Passo 5: Instalar no Dispositivo

Quando o build terminar, você terá **duas opções**:

**A) Escanear QR Code:**
- EAS mostrará um QR code
- Escaneie com a câmera do celular
- Baixe e instale o APK

**B) Download Manual:**
- Acesse: https://expo.dev
- Vá em "Builds"
- Baixe o APK
- Transfira para o celular e instale

---

## 🔧 MÉTODO 2: Build Local (Avançado)

### Requisitos:
- ✅ Android Studio instalado
- ✅ Java JDK 17
- ✅ Android SDK configurado
- ✅ Variáveis de ambiente configuradas

### Passo 1: Pré-build

```bash
npx expo prebuild --clean
```

### Passo 2: Buildar APK

```bash
cd android
./gradlew assembleDebug
```

### Passo 3: Instalar via ADB

```bash
# Conecte o celular via USB
adb devices

# Instale o APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Configuração do eas.json

Seu arquivo `eas.json` deve ter:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## ✅ Depois de Instalar

### 1. Inicie o Metro Server

```bash
npm start
```

### 2. Abra o App no Celular

- Ícone do BusinessApp aparecerá
- App tentará conectar ao Metro

### 3. Conecte na Mesma Rede

**Se não conectar automaticamente:**
1. Sacuda o celular (abre Dev Menu)
2. Toque em "Enter URL manually"
3. Digite: `http://SEU_IP:8081`
4. Toque em "Connect"

---

## 🔍 Como Descobrir Seu IP

```bash
# Linux
hostname -I | awk '{print $1}'

# Ou
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1
```

---

## 🐛 Troubleshooting

### App não conecta ao Metro

**Solução 1: Verificar Firewall**
```bash
sudo ufw allow 8081/tcp
```

**Solução 2: Usar Túnel**
```bash
npm start -- --tunnel
```

**Solução 3: Dev Menu**
1. Sacuda o celular
2. "Enter URL manually"
3. Digite o IP:8081

### Erro de Assinatura

Se aparecer erro de assinatura:
```bash
cd android
./gradlew clean
cd ..
npm start
```

### App trava ao abrir

Limpe o cache:
```bash
npm start -- --reset-cache
```

---

## 📊 Diferença Visual

### Development Build:
```
📱 Tela Inicial
├── 🎨 Ícone: BusinessApp (customizado)
├── 📝 Nome: BusinessApp
├── 🔌 Status: "Connecting to Metro..."
└── ⚡ Depois: Hot Reload ativo
```

### Production Build:
```
📱 Tela Inicial
├── 🎨 Ícone: BusinessApp (customizado)
├── 📝 Nome: BusinessApp
├── ✅ Status: Abre direto
└── 🚫 Metro: Não necessário
```

---

## 🎯 Comandos Rápidos

```bash
# Instalar Development Build via EAS
eas build --profile development --platform android

# Iniciar Metro Server
npm start

# Verificar dispositivos conectados
adb devices

# Instalar APK via ADB
adb install caminho/para/app.apk

# Ver logs do app
adb logcat | grep ReactNative
```

---

## 📁 Arquivos Relacionados

- `eas.json` - Configuração de builds
- `app.config.js` - Configuração do Expo
- `android/` - Projeto Android nativo
- `verificar-apps-instalados.sh` - Script de verificação

---

## ⚡ Atalho Rápido (Se já tem EAS configurado)

```bash
# Um comando para buildar e instalar
eas build --profile development --platform android --local

# Depois de terminar
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

**Recomendação:** Use o **MÉTODO 1 (EAS Build)** se for a primeira vez!
