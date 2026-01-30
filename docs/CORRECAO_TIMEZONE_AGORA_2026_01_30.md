# 🔧 CORREÇÃO DE TIMEZONE - AGENDAMENTOS COM DATA INCORRETA

## 🐛 Problema Identificado

Quando você criou um agendamento para **30/01/2026 00:30**, o sistema:
- ❌ **Salvou com a data correta** no banco (2026-01-30T00:30:00)
- ❌ **Mas resgatou com a data errada** (2026-01-29T21:30:00)
- ❌ **Calendário marcou** 29/01 em vez de 30/01

## 🎯 Causa Raiz

A função `createLocalISOString()` estava retornando **SEM offset timezone**:

```typescript
// ❌ ERRADO (ANTES)
return `${ano}-${mesStr}-${diaStr}T${horaStr}:${minStr}:${segStr}`;
// Resultado: "2026-01-30T00:30:00" (sem -03:00!)
```

Quando PostgreSQL recebe uma string ISO **sem offset**, ele assume que é **UTC**:
1. Input: `"2026-01-30T00:30:00"` (sem offset)
2. PostgreSQL interpreta: "Isso é UTC, preciso converter para a timezone do banco"
3. Salva como: `2026-01-30T03:30:00Z` (UTC interno)
4. Retorna como: `2026-01-30T03:30:00+00:00` (UTC)
5. parseISOStringLocal remove o +00:00 e deixa: 03:30
6. Mas calcula como: 30/01 03:30... que é 29/01 21:30 em BRT! ❌

## ✅ Solução Implementada

Agora `createLocalISOString()` retorna **COM offset timezone**:

```typescript
// ✅ CORRETO (DEPOIS)
const date = new Date(ano, mes - 1, dia, hora, minuto, segundo);
return toISOStringWithTimezone(date);
// Resultado: "2026-01-30T00:30:00-03:00" (COM offset BRT!)
```

### Fluxo Corrigido:
1. Input: `"2026-01-30T00:30:00-03:00"` (COM offset)
2. PostgreSQL interpreta: "Isso é -03:00 (BRT)"
3. Salva como: `2026-01-30T03:30:00Z` (UTC interno)
4. Retorna como: `2026-01-30T03:30:00+00:00` (UTC) ⚠️ **Ainda retorna em UTC!**

### MAS... há um segundo problema!

Quando o Supabase retorna com `+00:00`, o `parseISOStringLocal` remove o offset e fica:
- `2026-01-30T03:30:00` (sem offset)
- É interpretado como local: 3:30 da manhã
- Mas deveria ser 00:30!

## 🔴 Problema Mais Profundo - Falta Conversão na Leitura

A solução **REAL** precisa:

### 1️⃣ **Na ESCRITA** (novo.tsx)
- ✅ Salvar COM offset local: `2026-01-30T00:30:00-03:00`
- PostgreSQL converte internamente para UTC

### 2️⃣ **Na LEITURA** (agenda.tsx) 
- ❌ **FALTA FAZER**: Converter de UTC para horário local!
- Quando recebe `2026-01-30T03:30:00+00:00` (UTC)
- Deve converter para: `2026-01-30T00:30:00-03:00` (BRT)

## 🔧 Próximos Passos Necessários

### A. Atualizar parseISOStringLocal para aplicar conversão de timezone

Se a string recebida tem offset `+00:00` (UTC), precisa reconverter para BRT:

```typescript
export function parseISOStringLocal(isoString: string): Date {
  // Se tem offset UTC (+00:00 ou Z), converter para BRT (-03:00)
  if (isoString.includes('+00:00') || isoString.includes('Z')) {
    // Reconverter UTC para BRT
    const date = new Date(isoString); // Isso já faz a conversão automaticamente!
    return date; // Date.constructor já ajusta para horário local da máquina
  }
  
  // Se não tem offset, assume que é string ISO local
  // ... resto do código ...
}
```

### B. Ou atualizar as queries do Supabase para retornar em BRT

Executar SET timezone antes das queries:
```sql
SET timezone = 'America/Sao_Paulo';
SELECT data_hora FROM agendamentos;
```

### C. Ou usar função do Supabase que força timezone

```typescript
.select(`
  id,
  data_hora::timestamptz AT TIME ZONE 'America/Sao_Paulo' as data_hora,
  horario_termino
`)
```

## 📋 Status da Correção

- [x] Corrigido: `createLocalISOString()` agora retorna COM offset
- [ ] **Pendente**: Verificar se agendamentos antigos foram salvos incorretamente
- [ ] **Pendente**: Testar se novos agendamentos aparecem com data correta no calendário
- [ ] **Pendente**: Implementar conversão UTC→BRT na leitura do banco

## 🧪 Como Testar

1. Criar novo agendamento para 30/01/2026 00:30
2. Verificar se aparece como 30/01 no calendário (não 29/01)
3. Verificar se o card aparece no horário correto

## 📝 Arquivos Modificados

- `lib/timezone.ts` - `createLocalISOString()` agora usa `toISOStringWithTimezone()`
