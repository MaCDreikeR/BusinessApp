# Correção de Timezone na Renderização de Agendamentos

## 🐛 Problema Identificado

Agendamentos salvos com horário correto (18:00) apareciam com 3 horas a menos (15:00) na grade.

### Causa Raiz
Quando usávamos `new Date(ag.data_hora)`, o JavaScript interpretava a string ISO como UTC e convertia para o timezone local (BRT = UTC-3).

**Exemplo:**
```
Salvamento: "2026-01-29T18:00:00" → Salvo corretamente como 18:00
Leitura: new Date("2026-01-29T18:00:00") → Interpretado como 18:00 UTC → Convertido para 15:00 BRT
```

## ✅ Solução Implementada

### 1. Função Helper Criada
```typescript
// app/(app)/agenda.tsx (linha ~108)
const parseDataHoraLocal = (dataHoraISO: string): Date => {
  // Extrair partes da string ISO (formato: "YYYY-MM-DDTHH:MM:SS")
  const [datePart, timePart] = dataHoraISO.split('T');
  const [ano, mes, dia] = datePart.split('-').map(Number);
  const [hora, min, seg = 0] = timePart.split(':').map(Number);
  
  // Criar Date como horário LOCAL (sem conversão UTC)
  return new Date(ano, mes - 1, dia, hora, min, seg);
};
```

### 2. Substituições Realizadas

#### a) Marcação de Calendário (linha ~188)
```typescript
// ANTES
datasComAgendamento: agendamentosMes.map(ag => format(new Date(ag.data_hora), 'dd/MM/yyyy'))

// DEPOIS
datasComAgendamento: agendamentosMes.map(ag => format(parseDataHoraLocal(ag.data_hora), 'dd/MM/yyyy'))
```

#### b) Marcação de Datas com Agendamentos (linha ~197)
```typescript
// ANTES
const dataAg = new Date(ag.data_hora);

// DEPOIS
const dataAg = parseDataHoraLocal(ag.data_hora);
```

#### c) Agrupamento por Data na Lista (linha ~1590)
```typescript
// ANTES
const d = new Date(ag.data_hora);

// DEPOIS
const d = parseDataHoraLocal(ag.data_hora);
```

#### d) Exibição de Horário na Lista (linha ~1953)
```typescript
// ANTES
<Text style={styles.listItemTime}>{format(new Date(item.data_hora), 'HH:mm')}</Text>

// DEPOIS
<Text style={styles.listItemTime}>{format(parseDataHoraLocal(item.data_hora), 'HH:mm')}</Text>
```

#### e) Modal de Detalhes (linha ~2357)
```typescript
// ANTES
const dataInicio = new Date(item.data_hora);

// DEPOIS
const dataInicio = parseDataHoraLocal(item.data_hora);
```

#### f) Envio de WhatsApp (linha ~2495)
```typescript
// ANTES
const d = new Date(item.data_hora);

// DEPOIS
const d = parseDataHoraLocal(item.data_hora);
```

#### g) Cálculo de Alocação de Colunas (linha ~1803)
```typescript
// ANTES
const dataInicio = new Date(ag.data_hora);
const minutosInicio = dataInicio.getHours() * 60 + dataInicio.getMinutes();

// DEPOIS
const dataHoraParts = ag.data_hora.split('T');
const [ano, mes, dia] = dataHoraParts[0].split('-').map(Number);
const [hora, min] = dataHoraParts[1].split(':').map(Number);
const minutosInicio = hora * 60 + min;
```

#### h) Formatação de Horário nos Cards (linha ~1824)
```typescript
// ANTES
const dataInicio = new Date(ag.data_hora);
const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// DEPOIS
const dataHoraParts = ag.data_hora.split('T');
const [hora, min] = dataHoraParts[1].split(':').map(Number);
const horaInicio = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
```

#### i) Filtro de Agendamentos por Horário (linha ~1850)
```typescript
// ANTES
const dataInicio = new Date(ag.data_hora);
const horaInicio = dataInicio.getHours();
const minutoInicio = dataInicio.getMinutes();

// DEPOIS
const dataHoraParts = ag.data_hora.split('T');
const [horaInicio, minutoInicio] = dataHoraParts[1].split(':').map(Number);
```

#### j) Cálculo de Altura do Card (linha ~1733)
```typescript
// ANTES
const dataInicio = new Date(ag.data_hora);
const minutosInicio = dataInicio.getHours() * 60 + dataInicio.getMinutes();

// DEPOIS
const dataHoraParts = ag.data_hora.split('T');
const [hora, min] = dataHoraParts[1].split(':').map(Number);
const minutosInicio = hora * 60 + min;
```

## 📊 Resultado Esperado

Após as mudanças:
1. **Salvamento**: `"2026-01-29T18:00:00"` → Salvo como 18:00
2. **Leitura**: `parseDataHoraLocal("2026-01-29T18:00:00")` → Interpretado como 18:00 LOCAL
3. **Exibição**: Card aparece às 18:00 na grade

## 🧪 Como Testar

1. **Limpar cache do app:**
   ```bash
   adb shell pm clear com.macdreiker.businessapp
   ```

2. **Recompilar e executar:**
   ```bash
   npm run android
   ```

3. **Verificar agendamento existente:**
   - Abrir agenda do dia 29/01/2026
   - Confirmar que "Thamara" aparece às 18:00 (não 15:00)

4. **Criar novo agendamento:**
   - Criar agendamento para 16:00
   - Verificar que aparece às 16:00 na grade

## 📝 Notas Importantes

- ✅ Todas as ocorrências de `new Date(ag.data_hora)` foram substituídas
- ✅ Salvamento já estava correto (não usa `.toISOString()`)
- ✅ Leitura já estava correta (usa strings ISO locais nas queries)
- ✅ Problema era apenas na **renderização** dos dados

## 🔗 Arquivos Modificados

- `app/(app)/agenda.tsx`: 10 correções de timezone na renderização
