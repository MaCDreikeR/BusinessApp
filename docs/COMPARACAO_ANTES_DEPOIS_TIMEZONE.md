# 📊 COMPARAÇÃO VISUAL: ANTES vs DEPOIS

## 🔴 CÓDIGO ANTIGO (BUG)

### ❌ Problema 1: Salvamento com UTC
```typescript
// app/(app)/agenda/novo.tsx - LINHA ~762 (ANTES)

// ❌ BUG: Cria string SEM offset de timezone
const dataHoraLocal = `${ano}-${mes}-${dia}T${hora}:${min}:00`;
// Resultado: "2026-01-29T19:00:00"
// PostgreSQL interpreta como UTC → salva 22:00

const { error } = await supabase
  .from('agendamentos')
  .insert({ data_hora: dataHoraLocal, ... });
```

### ❌ Problema 2: Queries com conversão UTC
```typescript
// app/(app)/agenda/novo.tsx - LINHA ~776 (ANTES)

// ❌ BUG: .toISOString() converte para UTC
.gte('data_hora', new Date(ano, mes, dia, hora, min - 15).toISOString())
.lte('data_hora', new Date(ano, mes, dia, hora, min + 15).toISOString())
// Se busca 19:00 local, envia 22:00 UTC → não encontra nada
```

### ❌ Problema 3: Dashboard com UTC
```typescript
// app/(app)/index.tsx - LINHA ~435 (ANTES)

// ❌ BUG: Cria Date e converte para UTC
const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
.gte('data_hora', inicioHoje.toISOString())
// Busca 00:00 → envia 03:00 UTC → perde agendamentos das 00h-03h
```

---

## 🟢 CÓDIGO NOVO (CORRIGIDO)

### ✅ Solução 1: Salvamento com Offset Local
```typescript
// app/(app)/agenda/novo.tsx - LINHA ~762 (DEPOIS)

import { createLocalISOString } from '../../../lib/timezone';

// ✅ CORRETO: Cria string COM offset de timezone
const dataHoraLocal = createLocalISOString(ano, mes, dia, hora, min);
// Resultado: "2026-01-29T19:00:00-03:00"
// PostgreSQL interpreta corretamente → salva 19:00

const { error } = await supabase
  .from('agendamentos')
  .insert({ data_hora: dataHoraLocal, ... });
```

### ✅ Solução 2: Queries com Timezone Local
```typescript
// app/(app)/agenda/novo.tsx - LINHA ~765 (DEPOIS)

import { toISOStringWithTimezone } from '../../../lib/timezone';

// ✅ CORRETO: Usa função que mantém timezone
const dataInicio = new Date(ano, mes, dia, hora, min - 15);
const dataFim = new Date(ano, mes, dia, hora, min + 15);

.gte('data_hora', toISOStringWithTimezone(dataInicio))
.lte('data_hora', toISOStringWithTimezone(dataFim))
// Busca 19:00 local → envia 19:00-03:00 → encontra agendamentos corretos
```

### ✅ Solução 3: Dashboard com Timezone Local
```typescript
// app/(app)/index.tsx - LINHA ~425 (DEPOIS)

import { getStartOfDayLocal, getEndOfDayLocal } from '../../lib/timezone';

// ✅ CORRETO: Usa funções que mantêm timezone
const inicioHoje = getStartOfDayLocal();
const fimHoje = getEndOfDayLocal();

.gte('data_hora', inicioHoje)
.lte('data_hora', fimHoje)
// Busca 00:00 local → envia 00:00-03:00 → pega todos os agendamentos do dia
```

---

## 🔍 COMPARAÇÃO LADO A LADO

### String ISO Gerada

| Operação | ANTES (Bug) | DEPOIS (Corrigido) |
|----------|-------------|---------------------|
| Input usuário | 19:00 | 19:00 |
| String gerada | `2026-01-29T19:00:00` | `2026-01-29T19:00:00-03:00` |
| Interpretação PG | UTC (22:00 BRT) | BRT (19:00 BRT) |
| Valor salvo | `2026-01-29 22:00:00-03` | `2026-01-29 19:00:00-03` |
| Hora local | 22 ❌ | 19 ✅ |

### Query de Busca

| Operação | ANTES (Bug) | DEPOIS (Corrigido) |
|----------|-------------|---------------------|
| Buscar agendamentos de hoje às 00:00 | `2026-01-29T00:00:00.000Z` | `2026-01-29T00:00:00-03:00` |
| PostgreSQL interpreta | 2026-01-29 03:00:00 BRT | 2026-01-29 00:00:00 BRT |
| Resultado | ❌ Perde 00:00-03:00 | ✅ Pega dia inteiro |

### Exibição no App

| Fonte | ANTES (Bug) | DEPOIS (Corrigido) |
|-------|-------------|---------------------|
| Banco | `22:00:00-03` | `19:00:00-03` |
| Parse | `new Date("2026-01-29T22:00:00-03:00")` | `parseISOStringLocal("2026-01-29T19:00:00-03:00")` |
| `.getHours()` | 22 → converte → 19 localmente | 19 diretamente |
| Display | 19:00 (por sorte cancela) ⚠️ | 19:00 ✅ |

---

## 📦 NOVA BIBLIOTECA: `lib/timezone.ts`

### Funções Principais

```typescript
// 1. Converter Date → ISO com timezone
toISOStringWithTimezone(new Date(2026, 0, 29, 19, 0))
// → "2026-01-29T19:00:00-03:00"

// 2. Criar ISO direto dos componentes
createLocalISOString(2026, 1, 29, 19, 0)
// → "2026-01-29T19:00:00-03:00"

// 3. Início do dia
getStartOfDayLocal()
// → "2026-01-29T00:00:00-03:00"

// 4. Fim do dia
getEndOfDayLocal()
// → "2026-01-29T23:59:59-03:00"

// 5. Adicionar minutos
addMinutesLocal(new Date(), -5)
// → "2026-01-29T18:55:00-03:00"

// 6. Parse sem conversão UTC
parseISOStringLocal("2026-01-29T19:00:00-03:00")
// → Date local sem conversão
```

---

## 🎨 EXEMPLO VISUAL COMPLETO

### Fluxo ANTES (Bug):
```
┌─────────────────────────────────────────────────────┐
│ 1. Usuário digita: 19:00                            │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. App cria: "2026-01-29T19:00:00" (SEM offset)     │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. PostgreSQL interpreta como UTC                   │
│    "2026-01-29T19:00:00Z"                           │
│    19:00 UTC = 22:00 BRT (Brasil, UTC-3)            │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Banco salva: "2026-01-29 22:00:00-03"            │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. App lê: new Date("2026-01-29T22:00:00-03:00")    │
│    → 22:00 BRT                                      │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Conversão para local: 22:00 - 3h = 19:00         │
│    (Por sorte, cancela o erro!)                     │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. Display: 19:00 ✓ (correto por coincidência)      │
└─────────────────────────────────────────────────────┘

❌ MAS QUERIES FILTRAM ERRADO! Busca às 19:00 não encontra
   porque banco tem 22:00
```

### Fluxo DEPOIS (Corrigido):
```
┌─────────────────────────────────────────────────────┐
│ 1. Usuário digita: 19:00                            │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. App cria: "2026-01-29T19:00:00-03:00" (COM offset)│
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. PostgreSQL interpreta corretamente               │
│    "2026-01-29T19:00:00-03:00"                      │
│    19:00 BRT = 19:00 BRT ✓                          │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Banco salva: "2026-01-29 19:00:00-03" ✓          │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. App lê: parseISOStringLocal(...)                 │
│    → 19:00 diretamente                              │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Display: 19:00 ✓ (correto!)                      │
└─────────────────────────────────────────────────────┘

✅ QUERIES TAMBÉM FUNCIONAM! Busca às 19:00 encontra
   porque banco tem 19:00
```

---

## 🔬 TESTE PRÁTICO

### Crie um agendamento e execute:

```sql
-- No Supabase SQL Editor
SELECT 
  cliente,
  data_hora::text as iso_string,
  EXTRACT(HOUR FROM data_hora) as hora_banco,
  EXTRACT(TIMEZONE_HOUR FROM data_hora) as timezone_offset,
  CASE 
    WHEN data_hora::text LIKE '%-03:%' THEN '✅ BRT (Corrigido)'
    WHEN data_hora::text LIKE '%+00:%' OR data_hora::text NOT LIKE '%-%' 
      THEN '❌ UTC (Bug)'
    ELSE '⚠️ Verificar'
  END as status
FROM agendamentos
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

### Resultado Esperado:
```
cliente    | iso_string                  | hora_banco | timezone_offset | status
-----------+-----------------------------+------------+-----------------+------------------
Teste      | 2026-01-29 19:00:00-03     | 19         | -3              | ✅ BRT (Corrigido)
```

### Se ver isso, está ❌ ERRADO:
```
cliente    | iso_string                  | hora_banco | timezone_offset | status
-----------+-----------------------------+------------+-----------------+------------------
Teste      | 2026-01-29 22:00:00-03     | 22         | -3              | ❌ UTC (Bug)
```

---

**CONCLUSÃO**: A correção substitui `.toISOString()` por funções que mantêm o timezone local, garantindo que o PostgreSQL interprete corretamente os horários brasileiros (BRT = UTC-3).
