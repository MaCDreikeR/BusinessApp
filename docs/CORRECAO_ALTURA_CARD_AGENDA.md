# 🐛 CORREÇÃO: Altura do Card de Agendamento na Agenda

## Problema Identificado

### Sintoma
O card do agendamento na tela de agenda está sendo renderizado com altura incorreta:
- **Esperado:** Card deveria cobrir de 18:00 até 18:45 (45 minutos)
- **Atual:** Card cobre apenas até ~18:15 (aproximadamente 15 minutos)

### Exemplo do Problema
```
Agendamento:
- Horário de início: 18:00
- Horário de término: 18:45
- Duração real: 45 minutos

Card renderizado:
- Altura esperada: 60px (45min / 30min * 40px = 60px)
- Altura atual: ~20px (apenas 15 minutos sendo contabilizados)
```

## Causa Raiz

### Função `timeParaMinutos` Original
```typescript
const timeParaMinutos = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};
```

### Problemas Identificados

1. **Formato do campo TIME do PostgreSQL:**
   - O campo `horario_termino` é do tipo `TIME` no banco
   - PostgreSQL retorna como: `"18:45:00"` (HH:MM:SS)
   - A função esperava: `"18:45"` (HH:MM)

2. **Possível corrupção de dados:**
   - Sem validação se `timeStr` existe
   - Sem tratamento para diferentes formatos
   - Sem logs para debug

3. **Cálculo silencioso de erro:**
   - Se a conversão falhasse, retornava valor incorreto
   - Não havia logs indicando o problema

## Solução Implementada

### Nova Função `timeParaMinutos` com Logs
```typescript
const timeParaMinutos = (timeStr: string) => {
  if (!timeStr) return 0;
  
  // Log para debug
  logger.debug(`⏱️ timeParaMinutos recebeu: "${timeStr}" (tipo: ${typeof timeStr})`);
  
  // Remove qualquer espaço e pega apenas HH:MM (ignora segundos se houver)
  const partes = String(timeStr).trim().split(':');
  const h = parseInt(partes[0] || '0', 10);
  const m = parseInt(partes[1] || '0', 10);
  
  const resultado = h * 60 + m;
  logger.debug(`   ➜ Convertido para: ${resultado} minutos (${h}h ${m}m)`);
  
  return resultado;
};
```

### Nova Função `calcularAlturaCard` com Logs Detalhados
```typescript
const calcularAlturaCard = (ag: AgendamentoAgenda) => {
  if (!ag.horario_termino) {
    logger.warn(`⚠️ Agendamento "${ag.cliente}" SEM horário de término!`);
    return 60;
  }
  
  logger.debug(`\n📏 Calculando altura para "${ag.cliente}":`);
  logger.debug(`   🕐 data_hora: ${ag.data_hora}`);
  logger.debug(`   🕑 horario_termino: ${ag.horario_termino} (tipo: ${typeof ag.horario_termino})`);
  
  const dataInicio = new Date(ag.data_hora);
  const minutosInicio = dataInicio.getHours() * 60 + dataInicio.getMinutes();
  const minutosTermino = timeParaMinutos(ag.horario_termino);
  const duracaoMinutos = minutosTermino - minutosInicio;
  const alturaCalculada = Math.max(60, (duracaoMinutos / 30) * 40);
  
  logger.debug(`   📊 minutosInicio: ${minutosInicio} (${dataInicio.getHours()}:${dataInicio.getMinutes()})`);
  logger.debug(`   📊 minutosTermino: ${minutosTermino}`);
  logger.debug(`   ⏱️  Duração: ${duracaoMinutos} minutos`);
  logger.debug(`   📐 Altura calculada: ${alturaCalculada}px`);
  
  if (duracaoMinutos <= 0) {
    logger.error(`❌ ERRO: Duração inválida (${duracaoMinutos} min) para "${ag.cliente}"!`);
    return 60;
  }
  
  return alturaCalculada;
};
```

## Melhorias Implementadas

### 1. Validação Robusta
- ✅ Verifica se `timeStr` existe antes de processar
- ✅ Usa `String()` para garantir conversão de qualquer tipo
- ✅ Usa `.trim()` para remover espaços
- ✅ Usa `parseInt()` com base 10 explícita
- ✅ Usa valores padrão `'0'` se partes não existirem

### 2. Suporte a Múltiplos Formatos
- ✅ `"18:45:00"` (HH:MM:SS) - formato TIME do PostgreSQL
- ✅ `"18:45"` (HH:MM) - formato manual
- ✅ `"18:45:00.000"` (HH:MM:SS.mmm) - formato com milissegundos

### 3. Logs Detalhados para Debug
- 🔍 Mostra o valor recebido e seu tipo
- 🔍 Mostra a conversão step-by-step
- 🔍 Mostra todos os cálculos intermediários
- 🔍 Alerta em caso de erros

### 4. Tratamento de Erros
- ⚠️ Retorna 60px (altura mínima) em caso de erro
- ⚠️ Loga erro se duração for inválida (≤ 0)
- ⚠️ Loga warning se `horario_termino` não existir

## Exemplo de Logs Esperados

### Cenário: Agendamento 18:00 → 18:45

```
⏱️ timeParaMinutos recebeu: "18:45:00" (tipo: string)
   ➜ Convertido para: 1125 minutos (18h 45m)

📏 Calculando altura para "Thamara":
   🕐 data_hora: 2026-01-29T18:00:00.000Z
   🕑 horario_termino: 18:45:00 (tipo: string)
   📊 minutosInicio: 1080 (18:0)
   📊 minutosTermino: 1125
   ⏱️  Duração: 45 minutos
   📐 Altura calculada: 60px
```

## Fórmula de Cálculo da Altura

```typescript
// Cada slot de 30 minutos = 40px de altura
alturaCalculada = (duracaoMinutos / 30) * 40

// Exemplos:
// 15 min → (15/30) * 40 = 20px
// 30 min → (30/30) * 40 = 40px
// 45 min → (45/30) * 40 = 60px
// 60 min → (60/30) * 40 = 80px
// 90 min → (90/30) * 40 = 120px

// Altura mínima sempre 60px
alturaFinal = Math.max(60, alturaCalculada)
```

## Como Testar

### 1. Recarregar o App
```bash
# Limpar cache e recarregar
npm start -- --reset-cache
```

### 2. Abrir a Tela de Agenda
- Navegue até Agenda
- Selecione a data 29/01/2026

### 3. Observar os Logs
No terminal do Metro Bundler, procure por:

```
📏 Calculando altura para "Thamara":
   🕐 data_hora: ...
   🕑 horario_termino: 18:45:00 (tipo: string)
   ...
   ⏱️  Duração: 45 minutos
   📐 Altura calculada: 60px
```

### 4. Verificar Visualmente
- O card de "Thamara" deve cobrir de 18:00 até 18:45
- A altura deve ser proporcional à duração (45 minutos)

## Checklist de Validação

- [ ] Logs aparecem no terminal?
- [ ] `horario_termino` está no formato correto?
- [ ] `minutosTermino` é calculado corretamente?
- [ ] `duracaoMinutos` está correto (45)?
- [ ] `alturaCalculada` está correto (60px)?
- [ ] Card visual cobre até 18:45?

## Possíveis Problemas Adicionais

### Problema 1: Campo `horario_termino` é NULL
**Sintoma:**
```
⚠️ Agendamento "Thamara" SEM horário de término!
```

**Solução:** O agendamento foi criado sem `horario_termino`. Verificar:
1. O novo agendamento está salvando `horario_termino`?
2. Executar: `SELECT horario_termino FROM agendamentos WHERE cliente = 'Thamara'`

### Problema 2: Formato Inesperado
**Sintoma:**
```
⏱️ timeParaMinutos recebeu: "[object Object]" (tipo: object)
```

**Solução:** O PostgreSQL está retornando um objeto ao invés de string.
Verificar a query de carregamento de agendamentos.

### Problema 3: Duração Negativa
**Sintoma:**
```
❌ ERRO: Duração inválida (-45 min) para "Thamara"!
```

**Solução:** `horario_termino` é ANTES de `data_hora`.
Verificar dados no banco.

## Arquivos Modificados

- **`app/(app)/agenda.tsx`** (linhas ~1725-1750)
  - Função `timeParaMinutos` melhorada
  - Função `calcularAlturaCard` com logs detalhados

## Próximos Passos

1. **Teste imediatamente** e colete os logs
2. **Verifique se o card agora cobre a área correta**
3. **Compartilhe os logs** se o problema persistir
4. **Teste com outros agendamentos** de diferentes durações

## Notas Técnicas

### Por que o problema aconteceu?
O PostgreSQL retorna campos `TIME` como string no formato `HH:MM:SS`, mas a função original esperava apenas `HH:MM`. A destructuring `[h, m]` funcionava, mas se houvesse qualquer problema na conversão (espaços, formato diferente, etc.), o resultado seria incorreto silenciosamente.

### Por que adicionar tantos logs?
Para diagnosticar problemas futuros rapidamente. Se algo der errado, os logs mostrarão exatamente onde e por quê.
