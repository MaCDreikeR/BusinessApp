#!/bin/bash
# Script de Teste de Timezone
# Verifica se a correção de timezone está funcionando

echo "🔍 TESTE DE TIMEZONE - Verificação Completa"
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de testes
PASS=0
FAIL=0

# Função de teste
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASSOU${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FALHOU${NC}"
        ((FAIL++))
    fi
}

echo "📋 CHECKLIST DE VERIFICAÇÃO"
echo ""

# 1. Verificar se lib/timezone.ts existe
echo -n "1. Biblioteca timezone criada............. "
if [ -f "lib/timezone.ts" ]; then
    test_result 0
else
    test_result 1
fi

# 2. Verificar imports em agenda/novo.tsx
echo -n "2. Import em agenda/novo.tsx.............. "
if grep -q "import.*toISOStringWithTimezone.*lib/timezone" app/\(app\)/agenda/novo.tsx; then
    test_result 0
else
    test_result 1
fi

# 3. Verificar uso de createLocalISOString em novo.tsx
echo -n "3. createLocalISOString em novo.tsx....... "
if grep -q "createLocalISOString" app/\(app\)/agenda/novo.tsx; then
    test_result 0
else
    test_result 1
fi

# 4. Verificar imports em index.tsx (dashboard)
echo -n "4. Import em index.tsx.................... "
if grep -q "import.*getStartOfDayLocal.*lib/timezone" app/\(app\)/index.tsx; then
    test_result 0
else
    test_result 1
fi

# 5. Verificar remoção de toISOString em queries de agendamentos
echo -n "5. Queries sem toISOString (novo.tsx)..... "
COUNT=$(grep -c "\.gte('data_hora'.*\.toISOString()" app/\(app\)/agenda/novo.tsx 2>/dev/null || echo "0")
if [ "$COUNT" -eq 0 ]; then
    test_result 0
else
    echo -e "${RED}❌ Encontradas $COUNT ocorrências${NC}"
    test_result 1
fi

# 6. Verificar imports em admin/dashboard.tsx
echo -n "6. Import em admin/dashboard.tsx.......... "
if grep -q "import.*getStartOfDayLocal.*lib/timezone" app/\(admin\)/dashboard.tsx; then
    test_result 0
else
    test_result 1
fi

# 7. Verificar imports em hooks/useAgendamentoNotificacao.ts
echo -n "7. Import em useAgendamentoNotificacao.... "
if grep -q "import.*addMinutesLocal.*lib/timezone" hooks/useAgendamentoNotificacao.ts; then
    test_result 0
else
    test_result 1
fi

# 8. Verificar imports em services/syncService.ts
echo -n "8. Import em syncService.ts............... "
if grep -q "import.*addMinutesLocal.*lib/timezone" services/syncService.ts; then
    test_result 0
else
    test_result 1
fi

# 9. Verificar função parseDataHoraLocal em agenda.tsx
echo -n "9. parseDataHoraLocal em agenda.tsx....... "
if grep -q "parseDataHoraLocal" app/\(app\)/agenda.tsx; then
    test_result 0
else
    test_result 1
fi

# 10. Verificar documentação
echo -n "10. Documentação completa................. "
if [ -f "CORRECAO_TIMEZONE_COMPLETA_FINAL.md" ]; then
    test_result 0
else
    test_result 1
fi

echo ""
echo "=============================================="
echo "📊 RESULTADO DOS TESTES"
echo "=============================================="
echo -e "✅ Passaram: ${GREEN}$PASS${NC}"
echo -e "❌ Falharam: ${RED}$FAIL${NC}"
TOTAL=$((PASS + FAIL))
PERCENT=$((PASS * 100 / TOTAL))
echo "📈 Taxa de sucesso: $PERCENT%"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
    echo ""
    echo "✅ Sistema de timezone corrigido com sucesso!"
    echo ""
    echo "📝 PRÓXIMOS PASSOS:"
    echo "1. Testar criação de agendamento no app"
    echo "2. Verificar banco de dados (ver GUIA_TESTE_TIMEZONE.md)"
    echo "3. Verificar renderização nos cards"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  ALGUNS TESTES FALHARAM!${NC}"
    echo ""
    echo "📝 AÇÕES NECESSÁRIAS:"
    echo "1. Revisar os imports nos arquivos indicados"
    echo "2. Verificar se as correções foram aplicadas"
    echo "3. Executar novamente este script"
    echo ""
    exit 1
fi
