# 📹 Pasta de Vídeos

## Como adicionar seu vídeo na tela de boas-vindas:

### 1. **Coloque seu vídeo aqui:**
- Nome do arquivo: `welcome-video.mp4`
- Formatos aceitos: `.mp4`, `.mov`, `.m4v`
- Tamanho recomendado: Máximo 10-15 MB
- Duração recomendada: 10-30 segundos
- Resolução recomendada: 1080x1920 (vertical) ou 1920x1080 (horizontal)

### 2. **Dicas para otimizar o vídeo:**

#### **Comprimir vídeo online:**
- https://www.freeconvert.com/video-compressor
- https://www.videosmaller.com/
- https://cloudconvert.com/mp4-converter

#### **Configurações recomendadas:**
- Codec: H.264
- Taxa de bits: 1-2 Mbps
- FPS: 24-30
- Áudio: AAC, 128 kbps (ou remover se não precisar)

### 3. **Se não tiver vídeo ainda:**
O código está preparado para usar uma imagem como fallback. Basta descomentar as linhas:

```tsx
<Image 
  source={require('../../assets/images/business-welcome.png')}
  style={styles.mockupImage}
  resizeMode="contain"
/>
```

E comentar o componente Video.

### 4. **Opções de configuração do vídeo:**

No arquivo `boas-vindas.tsx`, você pode ajustar:

```tsx
<Video
  isLooping       // true = vídeo em loop, false = toca uma vez
  shouldPlay      // true = autoplay, false = precisa clicar
  isMuted={false} // false = com som, true = sem som
  volume={0.5}    // 0.0 a 1.0 (0 = mudo, 1 = volume máximo)
/>
```

### 5. **Vídeos de exemplo grátis:**
- https://www.pexels.com/videos/
- https://pixabay.com/videos/
- https://www.videvo.net/
- https://mixkit.co/free-stock-video/

**Busque por:** "business app", "mobile app", "smartphone", "technology"
