#!/bin/bash

# Script de configuração do ambiente de desenvolvimento para BusinessApp
# Pop!_OS / Ubuntu / Debian
# 
# ⚠️  IMPORTANTE: Execute este script em um terminal NATIVO do sistema,
#     não no terminal integrado do VS Code (se estiver usando VS Code via Flatpak)
# 
# Execute com: bash setup-dev-environment.sh

set -e  # Parar em caso de erro

echo "=================================================="
echo "🚀 Configurando ambiente de desenvolvimento"
echo "   BusinessApp - React Native + Expo + Supabase"
echo "=================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Atualizar sistema
print_step "Atualizando sistema..."
sudo apt update
sudo apt upgrade -y
print_success "Sistema atualizado"
echo ""

# 2. Instalar dependências base
print_step "Instalando dependências base..."
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    procps \
    file
print_success "Dependências base instaladas"
echo ""

# 3. Instalar Java JDK 17
print_step "Instalando OpenJDK 17..."
if command -v java &> /dev/null; then
    print_warning "Java já está instalado: $(java -version 2>&1 | head -n 1)"
else
    sudo apt install -y openjdk-17-jdk
    print_success "OpenJDK 17 instalado"
fi
echo ""

# 4. Instalar Node.js via nvm
print_step "Instalando Node.js via nvm..."
if [ -d "$HOME/.nvm" ]; then
    print_warning "nvm já está instalado"
else
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    
    # Carregar nvm no shell atual
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    print_success "nvm instalado"
fi

# Carregar nvm se ainda não estiver carregado
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if command -v nvm &> /dev/null || [ -s "$NVM_DIR/nvm.sh" ]; then
    print_step "Instalando Node.js LTS..."
    nvm install --lts
    nvm use --lts
    nvm alias default lts/*
    print_success "Node.js $(node --version) instalado"
    print_success "npm $(npm --version) instalado"
else
    print_error "Erro ao instalar nvm. Execute manualmente."
fi
echo ""

# 5. Instalar Watchman (para React Native)
print_step "Instalando Watchman..."
if command -v watchman &> /dev/null; then
    print_warning "Watchman já está instalado"
else
    # Compilar do source (Pop!_OS não tem pacote oficial)
    cd /tmp
    git clone https://github.com/facebook/watchman.git
    cd watchman
    git checkout v2024.01.22.00  # Versão estável
    
    sudo apt install -y \
        autoconf \
        automake \
        libtool \
        pkg-config \
        libssl-dev \
        libpcre2-dev \
        python3-dev
    
    ./autogen.sh
    ./configure --enable-lenient
    make
    sudo make install
    
    cd /tmp
    rm -rf watchman
    
    print_success "Watchman instalado"
fi
echo ""

# 6. Configurar variáveis de ambiente do Android
print_step "Configurando variáveis de ambiente do Android..."

ANDROID_HOME="$HOME/Android/Sdk"
SHELL_RC="$HOME/.bashrc"

# Detectar se usa zsh
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

# Verificar se já existe no arquivo
if grep -q "ANDROID_HOME" "$SHELL_RC"; then
    print_warning "Variáveis do Android já configuradas em $SHELL_RC"
else
    cat >> "$SHELL_RC" << 'EOF'

# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
EOF
    print_success "Variáveis de ambiente configuradas em $SHELL_RC"
fi

# Aplicar as variáveis no shell atual
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

echo ""

# 7. Instalar Supabase CLI
print_step "Instalando Supabase CLI..."
if command -v supabase &> /dev/null; then
    print_warning "Supabase CLI já está instalado"
else
    npm install -g supabase
    print_success "Supabase CLI instalado"
fi
echo ""

# 8. Instalar Expo CLI e EAS CLI
print_step "Instalando Expo CLI e EAS CLI..."
npm install -g expo-cli eas-cli
print_success "Expo CLI e EAS CLI instalados"
echo ""

# 9. Instalar dependências do projeto
print_step "Instalando dependências do projeto..."
cd /home/macdreiker/BusinessApp
npm install
print_success "Dependências do projeto instaladas"
echo ""

# 10. Verificar arquivo .env
print_step "Verificando arquivo .env..."
if [ -f ".env" ]; then
    print_success "Arquivo .env já existe"
else
    if [ -f ".env.development" ]; then
        cp .env.development .env
        print_success "Arquivo .env criado a partir de .env.development"
    else
        print_warning "Nenhum arquivo .env encontrado. Você precisará criar manualmente."
    fi
fi
echo ""

# Resumo final
echo "=================================================="
echo -e "${GREEN}✓ Instalação concluída!${NC}"
echo "=================================================="
echo ""
echo "📋 Resumo do que foi instalado:"
echo "  • Git: $(git --version)"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • Java: $(java -version 2>&1 | head -n 1)"
echo "  • Supabase CLI: $(supabase --version 2>&1 || echo 'Instalado')"
echo "  • Expo CLI: $(expo --version 2>&1 || echo 'Instalado')"
echo ""
echo "⚠️  PRÓXIMOS PASSOS IMPORTANTES:"
echo ""
echo "1️⃣  REINICIE O TERMINAL ou execute:"
echo "   source ~/.bashrc"
echo ""
echo "2️⃣  Configure o Android Studio:"
echo "   • Abra o Android Studio"
echo "   • Vá em: Tools → SDK Manager"
echo "   • Na aba 'SDK Platforms', instale:"
echo "     - Android 14.0 (API 34) ou superior"
echo "   • Na aba 'SDK Tools', marque e instale:"
echo "     - Android SDK Build-Tools"
echo "     - Android SDK Platform-Tools"
echo "     - Android Emulator"
echo "     - Android SDK Tools"
echo ""
echo "3️⃣  Crie um emulador Android:"
echo "   • No Android Studio: Tools → Device Manager"
echo "   • Create Device → Escolha um dispositivo"
echo "   • Baixe a system image (ex: Android 14)"
echo ""
echo "4️⃣  Configure suas credenciais do Supabase:"
echo "   • Edite o arquivo .env com suas chaves"
echo ""
echo "5️⃣  Inicie o desenvolvimento:"
echo "   cd /home/macdreiker/BusinessApp"
echo "   npm run start"
echo ""
echo "=================================================="
echo -e "${BLUE}Happy coding! 🎉${NC}"
echo "=================================================="
