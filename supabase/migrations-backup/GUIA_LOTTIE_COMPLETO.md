# 🎨 GUIA: Lottie na Tela de Boas-Vindas

## ✅ Tudo Configurado!

### 📁 **Onde colocar seu arquivo Lottie:**

```
BusinessApp/
└── assets/
    └── animations/
        └── welcome.json  ← SEU ARQUIVO LOTTIE AQUI
```

---

## 🚀 **Próximos Passos:**

### **1. Coloque seu arquivo Lottie:**

Mova/copie seu arquivo `.json` para:
```
assets/animations/welcome.json
```

**PowerShell:**
```powershell
# Se seu arquivo estiver em Downloads, por exemplo:
Copy-Item "C:\Users\borge\Downloads\seu-arquivo.json" "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\welcome.json"
```

**Ou manualmente:**
- Copie seu arquivo `.json`
- Cole em: `assets/animations/`
- Renomeie para: `welcome.json`

---

## 🎯 **Pronto para usar!**

O código já está configurado. Assim que você colocar o arquivo `welcome.json` na pasta, a animação vai aparecer automaticamente!

```tsx
<LottieView
  source={require('../../assets/animations/welcome.json')}
  style={styles.lottieAnimation}
  autoPlay    // ✅ Inicia automaticamente
  loop        // ✅ Repete em loop
/>
```

---

## ⚙️ **Configurações Disponíveis:**

### **Opções que você pode ajustar:**

```tsx
<LottieView
  source={require('../../assets/animations/welcome.json')}
  style={styles.lottieAnimation}
  
  // Reprodução
  autoPlay={true}         // true = autoplay, false = precisa .play()
  loop={true}             // true = loop infinito, false = toca uma vez
  
  // Velocidade
  speed={1}               // 1 = normal, 2 = 2x mais rápido, 0.5 = metade
  
  // Controle
  progress={0.5}          // 0 a 1 (0 = início, 1 = fim)
  
  // Callbacks
  onAnimationFinish={() => console.log('Animação terminou')}
/>
```

---

## 🎨 **Ajustar Tamanho:**

No arquivo `boas-vindas.tsx`, estilo `lottieAnimation`:

```tsx
lottieAnimation: {
  width: width * 0.9,     // ← 90% da largura da tela
  height: width * 0.8,    // ← Altura (ajuste conforme sua animação)
  alignSelf: 'center',
  marginBottom: height * 0.03,
},
```

**Ajuste os multiplicadores:**
- `width * 1.0` = 100% da largura
- `width * 0.7` = 70% da largura
- `height * 1.0` = Altura proporcional à altura da tela

---

## 🎭 **Onde Encontrar Animações Lottie:**

### **Sites Grátis:**
1. **LottieFiles** (Melhor!)
   - https://lottiefiles.com/
   - Busque: "business", "app", "welcome", "phone", "dashboard"
   - Filtre por: Grátis, Animado

2. **IconScout**
   - https://iconscout.com/lotties
   - Animações de alta qualidade

3. **Lordicon**
   - https://lordicon.com/
   - Ícones animados premium

### **Categorias sugeridas:**
- Business & Finance
- Technology & Apps
- Mobile UI
- Loading & Progress
- Success & Welcome

### **Palavras-chave:**
```
"business app"
"mobile phone"
"app mockup"
"welcome screen"
"dashboard"
"analytics"
"calendar"
"shopping"
"payment"
```

---

## 💡 **Por que Lottie é Melhor que GIF:**

| Característica | Lottie | GIF |
|---------------|--------|-----|
| **Tamanho** | ✅ 5-50 KB | ❌ 500KB - 5MB |
| **Qualidade** | ✅ Perfeita em qualquer tamanho | ❌ Pixelada ao redimensionar |
| **Performance** | ✅ Muito rápida | ❌ Pode travar |
| **Cores** | ✅ Pode mudar dinamicamente | ❌ Fixas |
| **Transparência** | ✅ Suporte total | ⚠️ Suporte limitado |
| **Escalabilidade** | ✅ Vetorial (infinita) | ❌ Raster (perde qualidade) |

---

## 🎨 **Personalizar Cores da Animação:**

Lottie permite mudar cores programaticamente:

```tsx
import { useRef } from 'react';

const animationRef = useRef<LottieView>(null);

<LottieView
  ref={animationRef}
  source={require('../../assets/animations/welcome.json')}
  style={styles.lottieAnimation}
  autoPlay
  loop
  colorFilters={[
    {
      keypath: "layer_name",  // Nome da camada no After Effects
      color: "#8B5CF6"        // Nova cor (purple)
    }
  ]}
/>
```

---

## 🔄 **Controlar Animação:**

### **Play/Pause/Reset:**

```tsx
import { useRef } from 'react';

const animationRef = useRef<LottieView>(null);

// Iniciar
animationRef.current?.play();

// Pausar
animationRef.current?.pause();

// Resetar
animationRef.current?.reset();

// Ir para frame específico
animationRef.current?.play(0, 50); // Do frame 0 ao 50
```

### **Exemplo com botão:**

```tsx
<TouchableOpacity onPress={() => animationRef.current?.play()}>
  <Text>▶️ Play</Text>
</TouchableOpacity>
```

---

## 📦 **Estrutura Completa:**

```
BusinessApp/
├── assets/
│   └── animations/
│       ├── welcome.json              ← SEU ARQUIVO AQUI
│       ├── loading.json              ← Outras animações (opcional)
│       └── success.json              ← Outras animações (opcional)
└── app/
    └── (auth)/
        └── boas-vindas.tsx           ← Arquivo atualizado ✅
```

---

## 🚀 **Testar:**

```bash
# Limpar cache e iniciar
npx expo start --clear

# Ou rebuild (para Android/iOS)
npx expo run:android
npx expo run:ios
```

---

## 🔧 **Solução de Problemas:**

### **Erro: "Cannot find module"**
- ✅ Verifique se o arquivo está em `assets/animations/welcome.json`
- ✅ Verifique se o nome do arquivo está correto (case-sensitive)
- ✅ Rode `npx expo start --clear`

### **Animação não aparece:**
- ✅ Verifique se o arquivo `.json` é válido
- ✅ Teste o arquivo em: https://lottiefiles.com/preview
- ✅ Verifique o tamanho no estilo (`lottieAnimation`)

### **Animação muito rápida/lenta:**
- ✅ Ajuste a propriedade `speed={1}` (0.5 = metade, 2 = dobro)
- ✅ Edite o arquivo JSON (propriedade `fr` = framerate)

### **Cores erradas:**
- ✅ Use `colorFilters` para mudar cores
- ✅ Ou edite o JSON diretamente

---

## 💾 **Exemplo de Arquivo Lottie:**

Um arquivo Lottie válido tem esta estrutura:

```json
{
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 1920,
  "h": 1080,
  "assets": [],
  "layers": [...]
}
```

**Propriedades importantes:**
- `fr` = Frame rate (FPS)
- `ip` = Frame inicial
- `op` = Frame final
- `w` e `h` = Dimensões originais

---

## 🎯 **Checklist:**

- [x] `lottie-react-native` instalado
- [x] Código atualizado em `boas-vindas.tsx`
- [x] Pasta `assets/animations/` criada
- [ ] Arquivo `welcome.json` colocado na pasta ← **VOCÊ PRECISA FAZER**
- [ ] Testado no app

---

## 📌 **Resumo Rápido:**

1. ✅ **Biblioteca instalada:** `lottie-react-native`
2. ✅ **Código pronto:** `boas-vindas.tsx` configurado
3. 📁 **Pasta criada:** `assets/animations/`
4. ⏳ **Próximo passo:** Colocar `welcome.json` na pasta
5. 🚀 **Testar:** `npx expo start --clear`

---

**Coloque seu arquivo `welcome.json` em `assets/animations/` e está pronto!** 🎨✨
