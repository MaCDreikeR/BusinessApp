# 🔧 CORREÇÃO FINAL DE TIMEZONE - Com Offset Explícito

## 🐛 PROBLEMA IDENTIFICADO

O agendamento estava sendo salvo com **timezone UTC** ao invés do timezone local.

### Evidência no Banco
```sql
'2026-01-29 19:00:00+00'  -- Salvo como UTC (errado!)
```

Quando o usuário selecionava **18:00**, o PostgreSQL interpretava como UTC e salvava 19:00+00, que ao ser lido aparecia como 19:00 no app.

## 🔍 CAUSA RAIZ

A coluna `data_hora` é do tipo `TIMESTAMPTZ` (timestamp with timezone).

Quando enviamos uma string ISO **sem timezone** (`"2026-01-29T18:00:00"`):
1. PostgreSQL assume que é UTC
2. Salva como `19:00:00+00`
3. Ao ler, converte para BRT: `19:00:00-03` (exibe 19:00)

## ✅ SOLUÇÃO IMPLEMENTADA

### Salvamento com Offset Explícito

**Arquivo:** `app/(app)/agenda/novo.tsx` (linha ~753)

```typescript
// 🔧 CORREÇÃO: Criar string ISO com offset de timezone local
const timezoneOffset = new Date().getTimezoneOffset(); // minutos
const offsetHoras = Math.abs(Math.floor(timezoneOffset / 60));
const offsetMinutos = Math.abs(timezoneOffset % 60);
const offsetSinal = timezoneOffset > 0 ? '-' : '+'; // Invertido
const offsetString = `${offsetSinal}${String(offsetHoras).padStart(2, '0')}:${String(offsetMinutos).padStart(2, '0')}`;

const dataHoraLocal = `${anoInt}-${String(mesInt + 1).padStart(2, '0')}-${String(diaInt).padStart(2, '0')}T${String(horaInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}:00${offsetString}`;
```

### Exemplo

**Input do usuário:** 18:00  
**String gerada:** `"2026-01-29T18:00:00-03:00"`  
**Salvo no banco:** `2026-01-29 18:00:00-03`  
**Lido do banco:** `2026-01-29 18:00:00-03`  
**Exibido no app:** 18:00 ✅

## 🔧 CORREÇÃO DO AGENDAMENTO EXISTENTE

Execute o SQL:

```sql
UPDATE agendamentos
SET 
    data_hora = '2026-01-29 18:00:00-03'::timestamptz,
    updated_at = NOW()
WHERE id = '4bb8710b-8c61-4833-bec5-274052ed069c';
```

Ou execute o arquivo:
```bash
psql -U postgres -d businessapp -f corrigir-timezone-thamara.sql
```

## 📊 FLUXO COMPLETO (CORRIGIDO)

### Antes (❌)
```
Input: 18:00
↓
String: "2026-01-29T18:00:00" (sem timezone)
↓
PostgreSQL: Interpreta como UTC
↓
Salva: 19:00:00+00 (convertido para UTC)
↓
Lê: 19:00:00-03 (convertido para BRT)
↓
Exibe: 19:00 ❌
```

### Depois (✅)
```
Input: 18:00
↓
String: "2026-01-29T18:00:00-03:00" (com timezone)
↓
PostgreSQL: Reconhece timezone BRT
↓
Salva: 18:00:00-03 (mantém timezone)
↓
Lê: 18:00:00-03 (sem conversão)
↓
Exibe: 18:00 ✅
```

## 🧪 COMO TESTAR

### 1. Recompilar o App
```bash
npm run android
```

### 2. Corrigir Agendamento Existente
```bash
psql -U postgres -d businessapp -f corrigir-timezone-thamara.sql
```

### 3. Limpar Cache
```bash
./limpar-cache-app.sh
```

### 4. Testar
1. Abrir app
2. Ir para Agenda
3. Selecionar 29/01/2026
4. **VERIFICAR:** Thamara às **18:00 às 18:45** ✅

### 5. Criar Novo Agendamento
1. Criar para 16:00
2. **VERIFICAR:** Aparece às 16:00 ✅
3. **VERIFICAR NO BANCO:**
   ```sql
   SELECT data_hora, TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS TZ') 
   FROM agendamentos 
   ORDER BY created_at DESC LIMIT 1;
   ```
   Deve mostrar: `2026-01-29 16:00:00-03`

## 📝 LOGS ESPERADOS

**Ao criar agendamento:**
```
📅 Criando agendamento:
   Data: 29/1/2026
   Hora: 18:0
   ISO Local com offset: 2026-01-29T18:00:00-03:00
   Timezone offset: -03:00
```

**No banco:**
```sql
data_hora | 2026-01-29 18:00:00-03
```

## 🎯 VERIFICAÇÕES

### Verificar Tipo da Coluna
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
  AND column_name = 'data_hora';
```

**Resultado esperado:**
```
column_name | data_type
------------|------------------------
data_hora   | timestamp with time zone
```

### Verificar Agendamentos
```sql
SELECT 
    cliente,
    TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS TZ') as data_hora_com_tz,
    TO_CHAR(data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as hora_brt
FROM agendamentos
WHERE data_hora::date = '2026-01-29'
ORDER BY data_hora;
```

**Resultado esperado:**
```
cliente  | data_hora_com_tz        | hora_brt
---------|-------------------------|----------
Thamara  | 2026-01-29 18:00:00-03  | 18:00:00
```

## 🔄 COMPARAÇÃO

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **String gerada** | `"2026-01-29T18:00:00"` | `"2026-01-29T18:00:00-03:00"` |
| **Interpretação PG** | UTC | BRT explícito |
| **Salvo no banco** | `19:00:00+00` | `18:00:00-03` |
| **Exibido no app** | 19:00 ❌ | 18:00 ✅ |

## ⚠️ IMPORTANTE

**Por que `getTimezoneOffset()` é invertido?**

JavaScript retorna o offset de UTC:
- BRT (UTC-3) → `getTimezoneOffset()` retorna **+180** (minutos)
- Por isso invertemos o sinal: `timezoneOffset > 0 ? '-' : '+'`

**Exemplo:**
```javascript
new Date().getTimezoneOffset() // 180 em BRT
offsetSinal = 180 > 0 ? '-' : '+' // '-'
offsetString = '-03:00' ✅
```

## ✅ CHECKLIST

- [x] Código atualizado com offset explícito
- [x] SQL de correção criado
- [x] Documentação atualizada
- [ ] Agendamento existente corrigido no banco
- [ ] App recompilado
- [ ] Cache limpo
- [ ] Teste realizado
- [ ] Novo agendamento testado

## 🚀 PRÓXIMOS PASSOS

1. **Execute o SQL de correção:**
   ```bash
   psql -U postgres -d businessapp -f corrigir-timezone-thamara.sql
   ```

2. **Recompile o app:**
   ```bash
   npm run android
   ```

3. **Teste:**
   - Thamara deve aparecer às 18:00 ✅
   - Criar novo agendamento para 16:00 ✅

---

**Status:** ✅ Código corrigido | ⏳ Aguardando recompilação e teste
