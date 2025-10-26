# 📋 Como Mover seu Arquivo Lottie

## 🪟 Windows (PowerShell):

### **Se seu arquivo está em Downloads:**

```powershell
# Listar arquivos JSON em Downloads
Get-ChildItem "$env:USERPROFILE\Downloads\*.json"

# Mover arquivo para a pasta correta
Move-Item "$env:USERPROFILE\Downloads\SEU_ARQUIVO.json" "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\welcome.json"

# Ou copiar (mantendo o original)
Copy-Item "$env:USERPROFILE\Downloads\SEU_ARQUIVO.json" "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\welcome.json"
```

### **Exemplo real:**

```powershell
# Se o arquivo se chama "animation.json"
Copy-Item "$env:USERPROFILE\Downloads\animation.json" "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\welcome.json"
```

---

## 🖱️ Manualmente (Explorer):

1. Abra o Explorer
2. Vá até a pasta onde está seu arquivo `.json`
3. Copie o arquivo (Ctrl+C)
4. Vá até: `C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\`
5. Cole (Ctrl+V)
6. Renomeie para: `welcome.json`

---

## 🔍 Verificar se o arquivo está no lugar certo:

```powershell
# Ver se o arquivo existe
Test-Path "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations\welcome.json"

# Se retornar "True", está no lugar certo! ✅
# Se retornar "False", precisa mover o arquivo ❌
```

---

## 📂 Abrir a pasta diretamente:

```powershell
# Abrir a pasta de animações no Explorer
explorer "C:\Users\borge\OneDrive\Documentos\BusinessApp\assets\animations"
```

---

## 🚀 Depois de colocar o arquivo:

```bash
# Limpar cache e testar
npx expo start --clear
```

---

## 💡 Dica:

Se você baixou de **LottieFiles.com**, o arquivo geralmente tem um nome como:
- `lottie-animation.json`
- `animation-12345.json`
- `business-app.json`

Apenas renomeie para `welcome.json` ao mover para a pasta.

---

**Precisa de ajuda? Me diga onde está seu arquivo que eu monto o comando exato!** 📁✨
