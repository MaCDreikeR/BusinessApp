#!/bin/bash

# Script para limpar cache do BusinessApp no dispositivo Android

echo "🧹 Limpando cache do BusinessApp..."

# Verificar se há dispositivo conectado
if ! adb devices | grep -q "device$"; then
  echo "❌ Nenhum dispositivo Android conectado!"
  echo "   Conecte um dispositivo ou inicie o emulador"
  exit 1
fi

# Limpar cache e dados do app
echo "📱 Limpando dados do aplicativo..."
adb shell pm clear com.macdreiker.businessapp

if [ $? -eq 0 ]; then
  echo "✅ Cache limpo com sucesso!"
  echo ""
  echo "📋 Próximos passos:"
  echo "   1. Recompilar o app: npm run android"
  echo "   2. Fazer login novamente"
  echo "   3. Testar agendamentos"
else
  echo "❌ Erro ao limpar cache"
  echo "   Verifique se o app está instalado"
fi
