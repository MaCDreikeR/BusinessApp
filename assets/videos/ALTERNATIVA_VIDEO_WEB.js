// ============================================
// ALTERNATIVA: Usar vídeo do YouTube/Vimeo
// ============================================

// Se preferir usar um vídeo hospedado na web em vez de local:

import { WebView } from 'react-native-webview';

// No lugar do componente Video, use:
<View style={styles.videoContainer}>
  <WebView
    source={{ uri: 'https://www.youtube.com/embed/SEU_VIDEO_ID' }}
    style={styles.video}
    allowsFullscreenVideo
    mediaPlaybackRequiresUserAction={false}
  />
</View>

// Ou com URL direta:
<Video
  source={{ uri: 'https://seu-servidor.com/video.mp4' }}
  style={styles.video}
  resizeMode={ResizeMode.CONTAIN}
  isLooping
  shouldPlay
  isMuted={false}
/>

// ============================================
// IMPORTANTE: Para usar WebView, instale:
// npx expo install react-native-webview
// ============================================
