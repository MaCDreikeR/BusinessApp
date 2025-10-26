# 📹 GUIA COMPLETO: Vídeo na Tela de Boas-Vindas

## ✅ O que foi feito:

### 1. **Instalado o pacote `expo-av`**
```bash
npx expo install expo-av
```

### 2. **Atualizado o arquivo `boas-vindas.tsx`**
- ✅ Importado `Video` e `ResizeMode` do `expo-av`
- ✅ Adicionado `useRef` e `useEffect` para controle do vídeo
- ✅ Substituído componente `<Image>` por `<Video>`
- ✅ Adicionados estilos `videoContainer` e `video`

---

## 📁 Estrutura de Arquivos:

```
BusinessApp/
├── assets/
│   └── videos/
│       ├── README.md                    ← Instruções
│       ├── ALTERNATIVA_VIDEO_WEB.js     ← Como usar vídeo da web
│       └── welcome-video.mp4            ← SEU VÍDEO AQUI (você precisa adicionar)
└── app/
    └── (auth)/
        └── boas-vindas.tsx              ← Arquivo atualizado
```

---

## 🎬 Próximos Passos:

### **OPÇÃO 1: Usar vídeo local (Recomendado)**

1. **Coloque seu vídeo em:**
   ```
   assets/videos/welcome-video.mp4
   ```

2. **Especificações do vídeo:**
   - Formato: `.mp4` (H.264)
   - Tamanho máximo: 10-15 MB
   - Duração: 10-30 segundos
   - Resolução: 1080x1920 (vertical) ou 1920x1080 (horizontal)

3. **Comprimir vídeo (se necessário):**
   - https://www.freeconvert.com/video-compressor
   - https://www.videosmaller.com/

---

### **OPÇÃO 2: Usar vídeo da web**

Se preferir usar vídeo hospedado (YouTube, Vimeo, servidor próprio):

```tsx
// Instalar WebView
npx expo install react-native-webview

// Usar no código
<WebView
  source={{ uri: 'https://www.youtube.com/embed/VIDEO_ID' }}
  style={styles.video}
/>
```

Veja o arquivo `ALTERNATIVA_VIDEO_WEB.js` para mais detalhes.

---

### **OPÇÃO 3: Manter imagem (Temporário)**

Se ainda não tiver o vídeo, você pode voltar a usar a imagem:

No arquivo `boas-vindas.tsx`, **comente** estas linhas:

```tsx
{/* Vídeo de demonstração */}
{/* <View style={styles.videoContainer}>
  <Video
    ref={videoRef}
    source={require('../../assets/videos/welcome-video.mp4')}
    style={styles.video}
    resizeMode={ResizeMode.CONTAIN}
    isLooping
    shouldPlay
    isMuted={false}
    volume={0.5}
  />
</View> */}
```

E **descomente** estas:

```tsx
<Image 
  source={require('../../assets/images/business-welcome.png')}
  style={styles.mockupImage}
  resizeMode="contain"
/>
```

---

## ⚙️ Configurações do Vídeo:

No componente `<Video>`, você pode ajustar:

```tsx
<Video
  ref={videoRef}
  source={require('../../assets/videos/welcome-video.mp4')}
  style={styles.video}
  resizeMode={ResizeMode.CONTAIN}  // CONTAIN, COVER, STRETCH
  isLooping                        // true = repete, false = toca uma vez
  shouldPlay                       // true = autoplay, false = manual
  isMuted={false}                  // false = com som, true = sem som
  volume={0.5}                     // 0.0 a 1.0 (volume)
/>
```

---

## 🎨 Personalização:

### **Mudar tamanho do vídeo:**

No `styles.videoContainer`:

```tsx
videoContainer: {
  width: width * 0.9,        // 90% da largura da tela
  height: width * 0.6,       // Altura proporcional
  marginBottom: height * 0.03,
  alignSelf: 'center',
  borderRadius: 16,          // Cantos arredondados
  overflow: 'hidden',
  backgroundColor: '#000',   // Fundo preto
},
```

### **Adicionar controles de play/pause:**

```tsx
const [status, setStatus] = useState<any>({});

<Video
  ref={videoRef}
  onPlaybackStatusUpdate={status => setStatus(() => status)}
  // ... outras props
/>

<TouchableOpacity 
  onPress={() =>
    status.isPlaying 
      ? videoRef.current?.pauseAsync() 
      : videoRef.current?.playAsync()
  }
>
  <Ionicons 
    name={status.isPlaying ? 'pause' : 'play'} 
    size={50} 
    color="#fff" 
  />
</TouchableOpacity>
```

---

## 🔧 Solução de Problemas:

### **Vídeo não aparece:**
1. Verifique se o arquivo existe em `assets/videos/welcome-video.mp4`
2. Verifique se o nome do arquivo está correto (case-sensitive)
3. Limpe o cache: `npx expo start --clear`

### **Vídeo trava ou lento:**
1. Comprima o vídeo (reduza o tamanho)
2. Use formato `.mp4` com codec H.264
3. Reduza a resolução

### **Som não funciona:**
1. Verifique `isMuted={false}`
2. Verifique `volume={0.5}` (0 a 1)
3. Alguns devices bloqueiam áudio no autoplay

---

## 📱 Testar:

### **No desenvolvimento:**
```bash
npx expo start
```

### **Build de produção:**
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

---

## 🎥 Vídeos Grátis:

**Sites para baixar vídeos gratuitos:**
- https://www.pexels.com/videos/
- https://pixabay.com/videos/
- https://www.videvo.net/
- https://mixkit.co/

**Busque por:**
- "business app"
- "mobile phone"
- "smartphone mockup"
- "app demonstration"
- "digital business"

---

## 📌 Resumo Rápido:

1. ✅ **Pacote instalado:** `expo-av`
2. ✅ **Código atualizado:** `boas-vindas.tsx`
3. ✅ **Pasta criada:** `assets/videos/`
4. ⏳ **Próximo passo:** Adicionar seu vídeo `welcome-video.mp4`
5. 🚀 **Testar:** `npx expo start`

---

**Qualquer dúvida, é só perguntar!** 🎬
