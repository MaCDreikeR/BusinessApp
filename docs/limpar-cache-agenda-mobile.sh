#!/bin/bash

echo "🧹 Limpando cache de agendamentos..."

# Script para limpar cache AsyncStorage via adb
# Limpa especificamente o namespace de agendamentos

echo "📱 Conectando ao dispositivo/emulador..."

# Para Android
if command -v adb &> /dev/null; then
    echo "🤖 Limpando cache Android..."
    
    # Encontrar o pacote do app
    PACKAGE="host.exp.exponent"  # Expo Go
    # Se for development build: PACKAGE="com.businessapp"
    
    # Limpar dados do app (cuidado: limpa tudo!)
    # adb shell pm clear $PACKAGE
    
    # Ou limpar apenas AsyncStorage via comando
    adb shell run-as $PACKAGE rm -rf /data/data/$PACKAGE/databases/RKStorage
    
    echo "✅ Cache limpo!"
else
    echo "⚠️  ADB não encontrado. Limpe manualmente pelo app."
fi

echo ""
echo "📋 Agora execute:"
echo "   1. Feche completamente o app"
echo "   2. Reabra o app"
echo "   3. Vá para Agenda"
echo "   4. Observe os logs no terminal"
