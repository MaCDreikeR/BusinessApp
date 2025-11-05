#!/bin/bash
# Script para preparar ambiente WSL->Windows e executar expo run:android

# Criar diretório temporário que simula a estrutura do Android SDK
TEMP_SDK="$HOME/.android-sdk-wsl"
mkdir -p "$TEMP_SDK/platform-tools"
mkdir -p "$TEMP_SDK/build-tools"
mkdir -p "$TEMP_SDK/emulator"

# Criar wrapper para adb (sem extensão .exe)
cat > "$TEMP_SDK/platform-tools/adb" << 'EOFADB'
#!/bin/bash
exec /mnt/c/Users/borge/AppData/Local/Android/Sdk/platform-tools/adb.exe "$@"
EOFADB
chmod +x "$TEMP_SDK/platform-tools/adb"

# Criar links simbólicos para build-tools (Expo precisa)
WIN_SDK="/mnt/c/Users/borge/AppData/Local/Android/Sdk"
if [ -d "$WIN_SDK/build-tools" ]; then
  for bt_dir in "$WIN_SDK/build-tools"/*; do
    bt_version=$(basename "$bt_dir")
    if [ ! -L "$TEMP_SDK/build-tools/$bt_version" ]; then
      ln -sf "$bt_dir" "$TEMP_SDK/build-tools/$bt_version"
    fi
  done
fi

# Link para outras pastas necessárias
for dir in platforms system-images cmdline-tools licenses; do
  if [ -d "$WIN_SDK/$dir" ] && [ ! -L "$TEMP_SDK/$dir" ]; then
    ln -sf "$WIN_SDK/$dir" "$TEMP_SDK/$dir"
  fi
done

# Exportar variáveis e executar
export ANDROID_HOME="$TEMP_SDK"
export ANDROID_SDK_ROOT="$TEMP_SDK"
export PATH="$TEMP_SDK/platform-tools:$PATH"

echo "🔧 Android SDK preparado em: $ANDROID_HOME"
echo "📱 Dispositivos conectados:"
adb devices

# Executar expo run:android
echo ""
echo "🚀 Iniciando build..."
npx expo run:android "$@"
