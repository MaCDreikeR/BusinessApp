#!/bin/bash

# Script para verificar se o ambiente de desenvolvimento foi instalado corretamente
# Execute no terminal NATIVO (não no VS Code): bash verificar-instalacao.sh

echo "=================================================="
echo "🔍 Verificando instalação do ambiente"
echo "=================================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
    local cmd=$1
    local name=$2
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name: instalado"
        $cmd --version 2>&1 | head -n 1
    else
        echo -e "${RED}✗${NC} $name: NÃO instalado"
        return 1
    fi
    echo ""
}

check_env_var() {
    local var_name=$1
    local var_value=$(eval echo \$$var_name)
    if [ -n "$var_value" ]; then
        echo -e "${GREEN}✓${NC} $var_name: $var_value"
    else
        echo -e "${RED}✗${NC} $var_name: não configurado"
    fi
}

# Verificar comandos
echo "📦 Ferramentas instaladas:"
echo "---"
check_command "git" "Git"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "java" "Java"
check_command "watchman" "Watchman"
check_command "supabase" "Supabase CLI"
check_command "expo" "Expo CLI"
check_command "eas" "EAS CLI"

# Verificar variáveis de ambiente
echo "🔧 Variáveis de ambiente:"
echo "---"
check_env_var "ANDROID_HOME"
check_env_var "JAVA_HOME"
echo ""

# Verificar Android SDK
echo "📱 Android SDK:"
echo "---"
if [ -d "$ANDROID_HOME" ]; then
    echo -e "${GREEN}✓${NC} Diretório Android SDK existe: $ANDROID_HOME"
    
    # Verificar platform-tools
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        echo -e "${GREEN}✓${NC} ADB instalado"
        $ANDROID_HOME/platform-tools/adb --version 2>&1 | head -n 1
    else
        echo -e "${YELLOW}⚠${NC} ADB não encontrado - configure no Android Studio"
    fi
else
    echo -e "${YELLOW}⚠${NC} Android SDK não encontrado - configure no Android Studio"
fi
echo ""

# Verificar dependências do projeto
echo "📦 Dependências do projeto:"
echo "---"
if [ -d "/home/macdreiker/BusinessApp/node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules existe"
    MODULE_COUNT=$(find /home/macdreiker/BusinessApp/node_modules -maxdepth 1 -type d | wc -l)
    echo "   $MODULE_COUNT pacotes instalados"
else
    echo -e "${RED}✗${NC} node_modules não existe - execute: npm install"
fi
echo ""

# Verificar arquivo .env
echo "⚙️  Configuração:"
echo "---"
if [ -f "/home/macdreiker/BusinessApp/.env" ]; then
    echo -e "${GREEN}✓${NC} Arquivo .env existe"
else
    echo -e "${YELLOW}⚠${NC} Arquivo .env não existe - crie a partir de .env.development"
fi
echo ""

# Resumo final
echo "=================================================="
echo "📋 PRÓXIMOS PASSOS:"
echo "=================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}1. Node.js não está instalado ou não está no PATH${NC}"
    echo "   Execute: source ~/.bashrc"
    echo "   Ou feche e abra um novo terminal"
    echo ""
fi

if [ ! -d "$ANDROID_HOME" ] || [ ! -f "$ANDROID_HOME/platform-tools/adb" ]; then
    echo -e "${YELLOW}2. Configure o Android Studio:${NC}"
    echo "   • Abra Android Studio"
    echo "   • Tools → SDK Manager"
    echo "   • Instale: Android SDK Platform 34, Build-Tools, Platform-Tools"
    echo "   • Tools → Device Manager → Create Device (emulador)"
    echo ""
fi

if [ ! -f "/home/macdreiker/BusinessApp/.env" ]; then
    echo -e "${YELLOW}3. Configure o arquivo .env:${NC}"
    echo "   cd /home/macdreiker/BusinessApp"
    echo "   cp .env.development .env"
    echo "   nano .env  # Edite com suas chaves do Supabase"
    echo ""
fi

echo -e "${GREEN}4. Para iniciar o desenvolvimento:${NC}"
echo "   cd /home/macdreiker/BusinessApp"
echo "   npm run start"
echo ""
echo "=================================================="
