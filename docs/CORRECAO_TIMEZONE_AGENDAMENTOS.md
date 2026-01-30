# 🚨 PROBLEMA CRÍTICO: Timezone no Salvamento de Agendamentos

## 🐛 Problema Identificado

### Sintoma
O agendamento aparece no horário ERRADO na agenda:
- **Esperado:** 18:00 (6 da tarde)
- **Salvo no banco:** 21:00 (9 da noite)
- **Diferença:** +3 horas (fuso horário de Brasília = UTC-3)

### Causa Raiz

**ANTES (código com bug):**
```typescript
const dataHoraAgendamento = new Date(
  parseInt(ano),
  parseInt(mes) - 1,
  parseInt(dia),
  parseInt(hora_agendamento),
  parseInt(minuto)
);

// ❌ PROBLEMA: toISOString() converte para UTC!
data_hora: dataHoraAgendamento.toISOString()
// Entrada: 18:00 hora local
// Saída: 21:00 (18:00 + 3 horas = UTC)
```

O método `.toISOString()` **sempre converte para UTC (GMT+0)**, adicionando 3 horas ao horário brasileiro (GMT-3).

### Exemplo do Problema

```javascript
// Brasil = UTC-3
const data = new Date(2026, 0, 29, 18, 0); // 29/01/2026 18:00 local
console.log(data.toISOString());
// ❌ Resultado: "2026-01-29T21:00:00.000Z" (21:00 UTC = 18:00 BRT + 3h)
```

### Impacto

1. **Agendamentos aparecem 3 horas adiantados**
2. **Cálculo de duração fica negativo** quando término < início
3. **Cards ficam com altura errada** (duração negativa)
4. **Conflitos de horários** detectados incorretamente

## ✅ Solução Implementada

### DEPOIS (código corrigido):

```typescript
const [dia, mes, ano] = data.split('/');
const [hora_agendamento, minuto] = hora.split(':');

// Criar valores numéricos
const anoInt = parseInt(ano);
const mesInt = parseInt(mes) - 1;
const diaInt = parseInt(dia);
const horaInt = parseInt(hora_agendamento);
const minInt = parseInt(minuto);

// ✅ SOLUÇÃO: Criar string ISO manualmente (SEM conversão UTC)
const dataHoraLocal = `${anoInt}-${String(mesInt + 1).padStart(2, '0')}-${String(diaInt).padStart(2, '0')}T${String(horaInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}:00`;

logger.debug(`📅 Criando agendamento:`);
logger.debug(`   Data: ${diaInt}/${mesInt + 1}/${anoInt}`);
logger.debug(`   Hora: ${horaInt}:${minInt}`);
logger.debug(`   ISO Local: ${dataHoraLocal}`);

// Salvar no banco com horário LOCAL
const { error } = await supabase
  .from('agendamentos')
  .insert({
    // ... outros campos
    data_hora: dataHoraLocal, // ✅ String ISO local
    // ...
  });
```

### Exemplo Corrigido

```javascript
// Entrada
const hora = "18:00";
const data = "29/01/2026";

// Processamento
const dataHoraLocal = "2026-01-29T18:00:00";

// Salvamento no banco
✅ Resultado: "2026-01-29T18:00:00" (mantém 18:00)
```

## 🔧 Correções Aplicadas

### 1. Arquivo: `app/(app)/agenda/novo.tsx`

**Linhas ~730-755:** Criação da data/hora
```typescript
// ANTES
const dataHoraAgendamento = new Date(...);
data_hora: dataHoraAgendamento.toISOString() // ❌

// DEPOIS
const dataHoraLocal = `${ano}-${mes}-${dia}T${hora}:${min}:00`;
data_hora: dataHoraLocal // ✅
```

**Logs adicionados:**
```typescript
logger.debug(`📅 Criando agendamento:`);
logger.debug(`   Data: ${diaInt}/${mesInt + 1}/${anoInt}`);
logger.debug(`   Hora: ${horaInt}:${minInt}`);
logger.debug(`   ISO Local: ${dataHoraLocal}`);
logger.debug(`   Horário Término: ${horarioTerminoFormatado}`);
logger.debug(`\n💾 Salvando no banco:`);
logger.debug(`   data_hora: ${dataHoraLocal}`);
logger.debug(`   horario_termino: ${horarioTerminoFormatado}`);
```

### 2. Correção do Agendamento Existente

**SQL:** `corrigir-agendamento-thamara.sql`

```sql
-- Corrigir horário de 21:00 para 18:00 (diminuir 3 horas)
UPDATE agendamentos
SET data_hora = data_hora - INTERVAL '3 hours'
WHERE cliente ILIKE '%Thamara%'
AND data_hora::date = '2026-01-29'
AND EXTRACT(HOUR FROM data_hora) = 21;
```

## 📋 Como Testar

### 1. Corrigir Agendamento Existente

Execute o SQL `corrigir-agendamento-thamara.sql` no Supabase SQL Editor.

### 2. Criar Novo Agendamento

1. Reinicie o app:
   ```bash
   npm start -- --reset-cache
   ```

2. Crie um novo agendamento:
   - Cliente: "Teste Timezone"
   - Data: Hoje
   - Hora: 18:00
   - Término: 18:45

3. Observe os logs:
   ```
   📅 Criando agendamento:
      Data: 29/1/2026
      Hora: 18:0
      ISO Local: 2026-01-29T18:00:00
      Horário Término: 18:45:00
   
   💾 Salvando no banco:
      data_hora: 2026-01-29T18:00:00
      horario_termino: 18:45:00
   ```

4. Verifique no banco:
   ```sql
   SELECT 
       cliente,
       TO_CHAR(data_hora, 'HH24:MI') as inicio,
       horario_termino,
       EXTRACT(EPOCH FROM (
           (data_hora::date + horario_termino::time) - data_hora
       )) / 60 as duracao_min
   FROM agendamentos
   WHERE cliente = 'Teste Timezone';
   ```

   Resultado esperado:
   ```json
   {
     "cliente": "Teste Timezone",
     "inicio": "18:00",
     "termino": "18:45:00",
     "duracao_min": "45"
   }
   ```

### 3. Verificar na Agenda

- Abra a tela de Agenda
- O card deve aparecer às **18:00** (não 21:00)
- O card deve cobrir de 18:00 até 18:45
- Altura do card deve ser proporcional (45 min = 60px)

## 🎯 Resultados Esperados

### Antes da Correção
```json
{
  "cliente": "Thamara",
  "inicio": "21:00",      // ❌ ERRADO
  "termino": "18:45:00",
  "duracao_min": "-135"   // ❌ NEGATIVO
}
```

### Após a Correção
```json
{
  "cliente": "Thamara",
  "inicio": "18:00",      // ✅ CORRETO
  "termino": "18:45:00",
  "duracao_min": "45"     // ✅ POSITIVO
}
```

## 📊 Checklist de Validação

- [ ] Execute SQL de correção para agendamento da Thamara
- [ ] Verifique que início mudou de 21:00 para 18:00
- [ ] Verifique que duração mudou de -135 para 45
- [ ] Reinicie o app
- [ ] Crie novo agendamento de teste
- [ ] Verifique logs de criação
- [ ] Verifique dados no banco
- [ ] Verifique card na agenda (posição e altura)

## 🔍 Logs Esperados

### Ao Criar Agendamento
```
📅 Criando agendamento:
   Data: 29/1/2026
   Hora: 18:0
   ISO Local: 2026-01-29T18:00:00
   Horário Término: 18:45:00

💾 Salvando no banco:
   data_hora: 2026-01-29T18:00:00
   horario_termino: 18:45:00
```

### Ao Renderizar na Agenda
```
📏 Calculando altura para "Thamara":
   🕐 data_hora: 2026-01-29T18:00:00
   🕑 horario_termino: 18:45:00
   📊 minutosInicio: 1080 (18:0)
   📊 minutosTermino: 1125 (18:45)
   ⏱️  Duração: 45 minutos
   📐 Altura calculada: 60px
```

## ⚠️ Importante

### Por que não usar `toISOString()`?

O `toISOString()` é útil quando você precisa de timestamps UTC (logs, APIs internacionais), mas para agendamentos locais, você quer manter o horário exato escolhido pelo usuário.

### Alternativas Consideradas

1. **Converter timezone no servidor:** ❌ Complexo
2. **Usar biblioteca date-fns:** ✅ Boa opção futura
3. **String ISO manual:** ✅ Simples e funciona (escolhida)

### Para o Futuro

Considere usar `date-fns-tz` para melhor controle:

```typescript
import { formatInTimeZone } from 'date-fns-tz';

const dataHoraLocal = formatInTimeZone(
  dataHoraAgendamento,
  'America/Sao_Paulo',
  "yyyy-MM-dd'T'HH:mm:ss"
);
```

## 📝 Arquivos Modificados

1. **`app/(app)/agenda/novo.tsx`** (linhas ~730-820)
   - Função `salvarAgendamento` corrigida
   - Logs de debug adicionados

2. **`corrigir-agendamento-thamara.sql`** (novo arquivo)
   - Script para corrigir dados existentes

3. **`CORRECAO_TIMEZONE_AGENDAMENTOS.md`** (este arquivo)
   - Documentação completa do problema e solução

## 🚀 Próximos Passos

1. ✅ Execute SQL de correção
2. ✅ Teste criação de novo agendamento
3. ✅ Verifique card na agenda
4. ✅ Confirme que problema foi resolvido
5. 📝 Compartilhe logs e screenshots
