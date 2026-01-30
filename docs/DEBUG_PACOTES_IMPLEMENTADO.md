# 🔍 DEBUG IMPLEMENTADO - Cálculo de Horário de Término para Pacotes

## ✅ O que foi implementado

### 1. **Logs Detalhados no Carregamento de Pacotes**
```typescript
// Linha ~527-550 em app/(app)/agenda/novo.tsx
const pacotesComDuracao = (data || []).map(pacote => {
  logger.debug(`\n🔍 Processando pacote: "${pacote.nome}"`);
  logger.debug(`   duracao_total do banco: ${pacote.duracao_total}`);
  logger.debug(`   Tem servicos? ${!!pacote.servicos} (${pacote.servicos?.length || 0} itens)`);
  
  if (!pacote.duracao_total && pacote.servicos) {
    const duracaoCalculada = pacote.servicos.reduce((total: number, item: any) => {
      const duracao = item.servico?.duracao || 0;
      const quantidade = item.quantidade || 1;
      const subtotal = duracao * quantidade;
      logger.debug(`   - Serviço "${item.servico?.nome}": ${duracao} min x ${quantidade} = ${subtotal} min`);
      return total + subtotal;
    }, 0);
    
    logger.debug(`   ✅ Duração CALCULADA: ${duracaoCalculada} min`);
  }
  
  logger.debug(`   ℹ️  Usando duracao_total do banco: ${pacote.duracao_total} min`);
  return pacote;
});
```

### 2. **Logs Detalhados ao Selecionar Pacote**
```typescript
// Linha ~994-1007 em app/(app)/agenda/novo.tsx
const handleSelecionarPacote = (pacote: Pacote) => {
  logger.debug('═══════════════════════════════════════════════════════');
  logger.debug(`📦 PACOTE SELECIONADO: "${pacote.nome}"`);
  logger.debug(`📊 Dados do pacote:`, JSON.stringify(pacote, null, 2));
  logger.debug(`⏱️  duracao_total: ${pacote.duracao_total} min`);
  logger.debug(`🔢 Quantidade: 1`);
  logger.debug(`🕐 Horário de início atual: ${hora}`);
  logger.debug('═══════════════════════════════════════════════════════');
  
  setPacotesSelecionados([...pacotesSelecionados, { ...pacote, quantidade: 1 }]);
};
```

### 3. **Logs Detalhados no useEffect Principal**
```typescript
// Linha ~288-318 em app/(app)/agenda/novo.tsx
useEffect(() => {
  logger.debug('───────────────────────────────────────────────────────');
  logger.debug('🔄 useEffect DISPARADO - Verificando cálculo de término');
  logger.debug(`📅 Hora início: ${hora}`);
  logger.debug(`🔧 Serviços selecionados: ${servicosSelecionados.length}`);
  logger.debug(`📦 Pacotes selecionados: ${pacotesSelecionados.length}`);
  
  if (hora && (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0)) {
    logger.debug('✅ Condições atendidas - calculando duração...');
    
    const duracaoTotal = calcularDuracaoTotalCompleta();
    logger.debug(`⏱️  Duração total calculada: ${duracaoTotal} min`);
    
    if (duracaoTotal) {
      const horarioTerminoCalculado = calcularHorarioTermino(hora, duracaoTotal);
      logger.debug(`🎯 Horário de término calculado: ${horarioTerminoCalculado}`);
      logger.debug(`📝 Atualizando estado horaTermino para: ${horarioTerminoCalculado}`);
      setHoraTermino(horarioTerminoCalculado);
      logger.debug(`✅ Estado horaTermino atualizado!`);
    }
  } else {
    logger.warn('❌ Condições NÃO atendidas:');
    if (!hora) logger.warn('  - Hora de início não definida');
    if (servicosSelecionados.length === 0 && pacotesSelecionados.length === 0) {
      logger.warn('  - Nenhum serviço ou pacote selecionado');
    }
  }
  logger.debug('───────────────────────────────────────────────────────');
}, [hora, servicosSelecionados, pacotesSelecionados, calcularDuracaoTotalCompleta, calcularHorarioTermino]);
```

### 4. **Monitor de Mudança do Estado horaTermino**
```typescript
// Linha ~1095 em app/(app)/agenda/novo.tsx
useEffect(() => {
  logger.debug(`🎯 [MONITOR] horaTermino mudou para: "${horaTermino}"`);
}, [horaTermino]);
```

### 5. **Logs no useEffect de pacotesSelecionados**
```typescript
// Linha ~1069 em app/(app)/agenda/novo.tsx
useEffect(() => {
  atualizarPacotesSelecionados();
  logger.debug(`🔄 pacotesSelecionados mudou (${pacotesSelecionados.length} itens)`);
}, [pacotesSelecionados]);
```

## 📋 Como Usar os Logs

### Passo 1: Reiniciar o App
```bash
npm start -- --reset-cache
```

### Passo 2: Abrir Terminal de Logs
Os logs aparecerão no terminal do Metro Bundler automaticamente.

### Passo 3: Testar o Fluxo
1. Abra **Novo Agendamento**
2. Clique em **📦 Pacotes**
3. **OBSERVE OS LOGS:** Você verá cada pacote sendo processado
4. Selecione um pacote
5. **OBSERVE OS LOGS:** Você verá os dados do pacote selecionado
6. Selecione um horário de início
7. **OBSERVE OS LOGS:** Você verá o useEffect sendo disparado e o cálculo

### Exemplo de Saída Esperada

```
🔍 Processando pacote: "Pacote Completo"
   duracao_total do banco: null
   Tem servicos? true (2 itens)
   - Serviço "Corte de Cabelo": 30 min x 1 = 30 min
   - Serviço "Barba": 20 min x 1 = 20 min
   ✅ Duração CALCULADA: 50 min

═══════════════════════════════════════════════════════
📦 PACOTE SELECIONADO: "Pacote Completo"
📊 Dados do pacote: {
  id: "...",
  nome: "Pacote Completo",
  duracao_total: 50,
  ...
}
⏱️  duracao_total: 50 min
🔢 Quantidade: 1
🕐 Horário de início atual: 14:00
═══════════════════════════════════════════════════════

🔄 pacotesSelecionados mudou (1 itens)

───────────────────────────────────────────────────────
🔄 useEffect DISPARADO - Verificando cálculo de término
📅 Hora início: 14:00
🔧 Serviços selecionados: 0
📦 Pacotes selecionados: 1
✅ Condições atendidas - calculando duração...
📦 Pacote "Pacote Completo": 50 min x 1 = 50 min
⏱️ TOTAL calculado: 50 min (temDuracao: true)
⏱️  Duração total calculada: 50 min
🎯 Horário de término calculado: 14:50
📝 Atualizando estado horaTermino para: 14:50
✅ Estado horaTermino atualizado!
───────────────────────────────────────────────────────

🎯 [MONITOR] horaTermino mudou para: "14:50"
```

## 🎯 Diagnósticos Possíveis

### Caso 1: Duração não é calculada
**Sintoma:**
```
⚠️ Pacote "<nome>" NÃO tem duracao_total definida!
```

**Causa:** O pacote não tem `duracao_total` no banco E não conseguiu calcular

**Solução:** Verificar se os serviços do pacote têm duração definida

### Caso 2: useEffect não dispara
**Sintoma:** Nenhum log "useEffect DISPARADO" aparece após selecionar pacote ou horário

**Causa:** Problema com as dependências do useEffect

**Ação:** Compartilhar logs completos para análise

### Caso 3: Cálculo correto mas campo não atualiza
**Sintoma:**
```
📝 Atualizando estado horaTermino para: 14:50
✅ Estado horaTermino atualizado!
🎯 [MONITOR] horaTermino mudou para: "14:50"
```
Mas o campo visual não atualiza

**Causa:** Problema no componente visual (TextInput)

**Solução:** Verificar se o `value={horaTermino}` está correto

## 📊 Checklist de Teste

Execute este teste e cole os logs para análise:

- [ ] Logs de carregamento de pacotes aparecem?
- [ ] Campo `duracao_total` é calculado ou vem do banco?
- [ ] Logs de seleção de pacote aparecem com dados completos?
- [ ] useEffect dispara após selecionar pacote?
- [ ] useEffect dispara após selecionar horário?
- [ ] Duração total é calculada corretamente?
- [ ] Horário de término é calculado?
- [ ] Monitor mostra mudança do estado `horaTermino`?
- [ ] Campo visual atualiza na tela?

## 🐛 Próximos Passos

Se após coletar os logs o problema persistir:

1. **Copie TODOS os logs** do terminal
2. **Tire screenshots** da tela
3. **Descreva** exatamente o que acontece
4. Compartilhe tudo para análise

## 📝 Informações Adicionais

- **Arquivo modificado:** `app/(app)/agenda/novo.tsx`
- **Linhas com mudanças:** ~288-318, ~527-550, ~994-1007, ~1069, ~1095
- **Total de logs adicionados:** 20+ pontos de debug
- **Objetivo:** Rastrear todo o fluxo do cálculo automático de horário de término para pacotes
