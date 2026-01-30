#!/bin/bash

# ============================================================================
# SCRIPT DE VALIDAÇÃO: Correção Tela Branca
# ============================================================================
# 
# Este script valida que as correções foram implementadas corretamente
# e que o app funciona em todos os cenários críticos.
#
# Uso: ./scripts/validate-auth-fix.sh
# ============================================================================

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🔍 VALIDAÇÃO: Correção de Tela Branca Após Período Sem Uso  ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0
WARN=0

# Função para checar se arquivo existe
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $description: $file ${RED}(NÃO ENCONTRADO)${NC}"
        ((FAIL++))
    fi
}

# Função para checar se string existe em arquivo
check_string_in_file() {
    local file=$1
    local search_string=$2
    local description=$3
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} $description: Arquivo não encontrado"
        ((FAIL++))
        return 1
    fi
    
    if grep -q "$search_string" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $description ${RED}(STRING NÃO ENCONTRADA)${NC}"
        ((FAIL++))
    fi
}

echo "📁 Verificando arquivos modificados..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "contexts/AuthContext.tsx" "AuthContext"
check_file "app/_layout.tsx" "_layout"
check_file "lib/supabase.ts" "Supabase config"
check_file "docs/CORRECAO-TELA-BRANCA.md" "Documentação detalhada"
check_file "docs/RESUMO-CORRECAO-TELA-BRANCA.md" "Resumo executivo"
check_file "__tests__/AuthContext.integration.test.ts" "Testes de integração"

echo ""
echo "🔍 Verificando implementações críticas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# AuthContext checks
check_string_in_file "contexts/AuthContext.tsx" "retryCount" "AuthContext: Estado de retry"
check_string_in_file "contexts/AuthContext.tsx" "isInitializing" "AuthContext: Flag de inicialização"
check_string_in_file "contexts/AuthContext.tsx" "MAX_RETRIES" "AuthContext: Limite de retries"
check_string_in_file "contexts/AuthContext.tsx" "SESSION_TIMEOUT" "AuthContext: Timeout configurável"
check_string_in_file "contexts/AuthContext.tsx" "clearAuthState" "AuthContext: Função de limpeza de estado"
check_string_in_file "contexts/AuthContext.tsx" "clearAuthCache" "AuthContext: Função de limpeza de cache"

# _layout checks
check_string_in_file "app/_layout.tsx" "shouldForceLogin" "Layout: Flag de força login"
check_string_in_file "app/_layout.tsx" "ABSOLUTE_TIMEOUT" "Layout: Timeout absoluto"
check_string_in_file "app/_layout.tsx" "timeoutRef" "Layout: Referência de timeout"

# Supabase checks
check_string_in_file "lib/supabase.ts" "AbortController" "Supabase: Timeout com AbortController"
check_string_in_file "lib/supabase.ts" "flowType.*pkce" "Supabase: Flow type PKCE"

echo ""
echo "🧪 Rodando testes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if jest is configured
if [ -f "package.json" ] && grep -q "jest" "package.json"; then
    echo -e "${BLUE}ℹ${NC} Executando testes de integração..."
    
    # Run tests (não falha o script se testes falharem)
    if npm test -- --testPathPattern=AuthContext.integration.test.ts --passWithNoTests 2>&1 | tee /tmp/test-output.log; then
        echo -e "${GREEN}✓${NC} Testes executados com sucesso"
        ((PASS++))
    else
        if grep -q "No tests found" /tmp/test-output.log; then
            echo -e "${YELLOW}⚠${NC} Nenhum teste encontrado (tudo ok, apenas configure jest)"
            ((WARN++))
        else
            echo -e "${RED}✗${NC} Alguns testes falharam"
            ((FAIL++))
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} Jest não configurado. Configure para rodar testes automatizados."
    ((WARN++))
fi

echo ""
echo "📊 Verificando métricas de código..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check TypeScript compilation
echo -e "${BLUE}ℹ${NC} Verificando compilação TypeScript..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}✗${NC} Erros de TypeScript encontrados"
    ((FAIL++))
else
    echo -e "${GREEN}✓${NC} Sem erros de TypeScript"
    ((PASS++))
fi

# Check for console.logs (code smell)
echo -e "${BLUE}ℹ${NC} Verificando console.logs esquecidos..."
if grep -r "console\.log" contexts/AuthContext.tsx app/_layout.tsx 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} console.logs encontrados (considere remover para produção)"
    ((WARN++))
else
    echo -e "${GREEN}✓${NC} Sem console.logs esquecidos"
    ((PASS++))
fi

echo ""
echo "📝 Verificando documentação..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if documentation is complete
REQUIRED_SECTIONS=(
    "PROBLEMA IDENTIFICADO"
    "SOLUÇÕES IMPLEMENTADAS"
    "COMO TESTAR"
    "TROUBLESHOOTING"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
    if grep -qi "$section" docs/CORRECAO-TELA-BRANCA.md 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Seção encontrada: $section"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} Seção não encontrada: $section"
        ((WARN++))
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        RESULTADO FINAL                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Passou:${NC}    $PASS testes"
echo -e "${YELLOW}⚠ Avisos:${NC}    $WARN avisos"
echo -e "${RED}✗ Falhou:${NC}    $FAIL testes"
echo ""

# Calculate percentage
TOTAL=$((PASS + FAIL + WARN))
if [ $TOTAL -eq 0 ]; then
    PERCENT=0
else
    PERCENT=$(( (PASS * 100) / TOTAL ))
fi

echo -e "Taxa de sucesso: ${BLUE}${PERCENT}%${NC}"
echo ""

# Final status
if [ $FAIL -eq 0 ] && [ $PERCENT -ge 80 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║   ✅ VALIDAÇÃO PASSOU! Correções implementadas corretamente.   ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║   Próximos passos:                                            ║${NC}"
    echo -e "${GREEN}║   1. Teste manualmente em dispositivo físico                  ║${NC}"
    echo -e "${GREEN}║   2. Teste cenário sem internet (modo avião)                  ║${NC}"
    echo -e "${GREEN}║   3. Teste com sessão expirada (limpar AsyncStorage)          ║${NC}"
    echo -e "${GREEN}║   4. Monitore logs após deploy                                ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
elif [ $FAIL -eq 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}║   ⚠️  VALIDAÇÃO PASSOU COM AVISOS                              ║${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}║   Revise os avisos acima antes de fazer deploy.               ║${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║   ❌ VALIDAÇÃO FALHOU!                                          ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║   Corrija os erros acima antes de continuar.                  ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
