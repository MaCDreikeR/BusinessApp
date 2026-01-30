#!/bin/bash
# Script para identificar qual BUILD do BusinessApp está instalado

echo "🔍 IDENTIFICANDO BUILD DO BUSINESSAPP"
echo "======================================"
echo ""

# Verificar se ADB está instalado
if ! command -v adb &> /dev/null; then
    echo "❌ ADB não encontrado. Instale com: sudo apt install adb"
    exit 1
fi

# Listar dispositivos conectados
echo "📱 Dispositivos conectados:"
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "❌ Nenhum dispositivo conectado"
    echo "💡 Conecte via USB e ative Debug USB"
    exit 1
fi
adb devices -l
echo ""

# Buscar package name do app
if [ -f "app.config.js" ]; then
    PACKAGE_NAME=$(node -e "const config = require('./app.config.js'); console.log(config.expo?.android?.package || 'com.businessapp')" 2>/dev/null || echo "com.businessapp")
    echo "📦 Package Name: $PACKAGE_NAME"
    echo ""
    
    if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ BUSINESSAPP ENCONTRADO"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Ver versão
        VERSION_INFO=$(adb shell dumpsys package "$PACKAGE_NAME" | grep -A 1 "versionName")
        VERSION_NAME=$(echo "$VERSION_INFO" | grep "versionName" | cut -d= -f2 | tr -d '\r\n ')
        VERSION_CODE=$(echo "$VERSION_INFO" | grep "versionCode" | cut -d= -f2 | cut -d' ' -f1)
        
        echo "📌 Versão: $VERSION_NAME (Build: $VERSION_CODE)"
        
        # Ver caminho do APK
        APK_PATH=$(adb shell pm path "$PACKAGE_NAME" | cut -d: -f2 | tr -d '\r\n ')
        echo "📂 APK: $APK_PATH"
        
        # Verificar se é Development ou Production
        echo ""
        echo "🔍 Identificando tipo de build..."
        
        # Método 1: Verificar se tem developmentClient no manifest
        MANIFEST=$(adb shell cat "$APK_PATH" 2>/dev/null | strings | grep -i "developmentClient\|devClient" | head -1)
        
        # Método 2: Verificar versão (geralmente dev tem -dev no nome)
        if [[ "$VERSION_NAME" == *"dev"* ]] || [[ "$VERSION_NAME" == *"development"* ]]; then
            BUILD_TYPE="development"
        elif [[ "$VERSION_NAME" == *"prod"* ]] || [[ "$VERSION_NAME" == *"production"* ]]; then
            BUILD_TYPE="production"
        else
            # Método 3: Verificar tamanho do APK (dev geralmente é menor)
            APK_SIZE=$(adb shell stat -c%s "$APK_PATH" 2>/dev/null)
            if [ ! -z "$APK_SIZE" ]; then
                APK_SIZE_MB=$((APK_SIZE / 1024 / 1024))
                echo "📊 Tamanho: ${APK_SIZE_MB}MB"
                
                if [ "$APK_SIZE_MB" -lt 60 ]; then
                    BUILD_TYPE="development"
                else
                    BUILD_TYPE="production"
                fi
            else
                BUILD_TYPE="desconhecido"
            fi
        fi
        
        echo ""
        if [ "$BUILD_TYPE" == "development" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🔧 TIPO: DEVELOPMENT BUILD"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "✅ Características:"
            echo "  🔌 Precisa do Metro Server rodando"
            echo "  ⚡ Hot Reload: SIM"
            echo "  🐛 Dev Menu: SIM (sacuda o celular)"
            echo "  🔄 Mudanças aparecem instantaneamente"
            echo ""
            echo "💡 Para usar:"
            echo "  1. npm start"
            echo "  2. Abra o app no celular"
            echo "  3. Conecte na mesma rede"
            echo ""
        elif [ "$BUILD_TYPE" == "production" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🚀 TIPO: PRODUCTION BUILD"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "✅ Características:"
            echo "  🚫 NÃO precisa do Metro Server"
            echo "  ❌ Hot Reload: NÃO"
            echo "  🚫 Dev Menu: NÃO"
            echo "  📦 Código embutido no APK"
            echo ""
            echo "💡 Para atualizar:"
            echo "  1. Buildar novo APK"
            echo "  2. Instalar no celular"
            echo ""
        fi
        
        # Teste prático
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🧪 TESTE PARA CONFIRMAR:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "1. Feche o Metro Server (Ctrl+C)"
        echo "2. Abra o app no celular"
        echo ""
        echo "   → Abre normalmente: PRODUCTION"
        echo "   → Fica carregando: DEVELOPMENT"
        echo ""
        
    else
        echo "❌ BusinessApp NÃO está instalado"
        echo ""
        echo "Para instalar:"
        echo "  Development: adb install BusinessApp-development.apk"
        echo "  Production:  adb install BusinessApp-production.apk"
    fi
else
    echo "❌ app.config.js não encontrado"
fi
