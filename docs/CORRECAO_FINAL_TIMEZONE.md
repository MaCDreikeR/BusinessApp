# 🔧 CORREÇÃO FINAL: Timezone na Leitura de Agendamentos

## 🐛 Problema Encontrado

O banco de dados estava **CORRETO** após a primeira correção:
```json
{
  "cliente": "Thamara",
  "data_hora": "2026-01-29 18:00:00",  // ✅ CORRETO
  "horario_termino": "18:45:00",       // ✅ CORRETO
  "duracao": "45 minutos"              // ✅ CORRETO
}
```

Mas o card ainda aparecia **ERRADO** no app (15:00 às 18:45).

### Causa Raiz

A **query de leitura** na tela de Agenda também estava usando `.toISOString()`, convertendo as datas de busca para UTC:

**ANTES (com bug):**
```typescript
// Buscar agendamentos do dia
.gte('data_hora', new Date(ano, mes, dia, 0, 0, 0).toISOString())
.lt('data_hora', new Date(ano, mes, dia, 23, 59, 59).toISOString())

// Exemplo:
// Buscar dia 29/01/2026
// toISOString converte:
//   29/01/2026 00:00:00 BRT → 29/01/2026 03:00:00 UTC
//   29/01/2026 23:59:59 BRT → 30/01/2026 02:59:59 UTC
// Resultado: busca agendamentos de 03:00 às 02:59 (horário errado!)
```

## ✅ Solução Aplicada

### 1. Função `carregarAgendamentos` (linha ~378)

**ANTES:**
```typescript
.gte('data_hora', new Date(...).toISOString())
.lt('data_hora', new Date(...).toISOString())
```

**DEPOIS:**
```typescript
const ano = selectedDate.getFullYear();
const mes = selectedDate.getMonth() + 1;
const dia = selectedDate.getDate();

const dataInicioLocal = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`;
const dataFimLocal = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T23:59:59`;

logger.debug(`📅 Buscando agendamentos do dia:`);
logger.debug(`   Data: ${dia}/${mes}/${ano}`);
logger.debug(`   Início: ${dataInicioLocal}`);
logger.debug(`   Fim: ${dataFimLocal}`);

let query = supabase
  .from('agendamentos')
  .select('*')
  .eq('estabelecimento_id', estabelecimentoId)
  .gte('data_hora', dataInicioLocal)
  .lt('data_hora', dataFimLocal);
```

### 2. Função `carregarAgendamentosMes` (linha ~562)

**ANTES:**
```typescript
const primeiroDiaMes = new Date(...);
const ultimoDiaMes = new Date(...);

.gte('data_hora', primeiroDiaMes.toISOString())
.lte('data_hora', ultimoDiaMes.toISOString())
```

**DEPOIS:**
```typescript
const ano = selectedDate.getFullYear();
const mes = selectedDate.getMonth() + 1;
const primeiroDia = 1;
const ultimoDia = new Date(ano, mes, 0).getDate();

const dataInicioMesLocal = `${ano}-${String(mes).padStart(2, '0')}-01T00:00:00`;
const dataFimMesLocal = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}T23:59:59`;

logger.debug(`📅 Buscando agendamentos do mês ${mes}/${ano}:`);
logger.debug(`   Início: ${dataInicioMesLocal}`);
logger.debug(`   Fim: ${dataFimMesLocal}`);

let query = supabase
  .from('agendamentos')
  .select('*')
  .eq('estabelecimento_id', estabelecimentoId)
  .gte('data_hora', dataInicioMesLocal)
  .lte('data_hora', dataFimMesLocal);
```

## 📋 Arquivos Modificados

### `app/(app)/agenda.tsx`

**Linha ~378-395:** Função `carregarAgendamentos`
- ✅ Removido `.toISOString()` das queries
- ✅ Usando strings ISO locais
- ✅ Logs de debug adicionados

**Linha ~562-600:** Função `carregarAgendamentosMes`
- ✅ Removido `.toISOString()` das queries
- ✅ Usando strings ISO locais
- ✅ Logs de debug adicionados

## 🧪 Como Testar

### 1. Limpar Cache

O cache pode estar guardando dados antigos com timezone errado.

**Opção A - Manualmente no App:**
```
1. Vá em Configurações do telefone
2. Apps → BusinessApp (ou Expo Go)
3. Armazenamento → Limpar Cache
```

**Opção B - Via Script:**
```bash
chmod +x limpar-cache-agenda-mobile.sh
./limpar-cache-agenda-mobile.sh
```

**Opção C - Forçar no Código (temporário):**
No início de `carregarAgendamentos`, adicione:
```typescript
await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
```

### 2. Reiniciar App

```bash
npm start -- --reset-cache
```

### 3. Testar a Agenda

1. **Feche completamente o app**
2. **Reabra o app**
3. **Vá para Agenda**
4. **Selecione o dia 29/01/2026**

### 4. Observar Logs

No terminal do Metro Bundler, procure:

```
📅 Buscando agendamentos do dia:
   Data: 29/1/2026
   Início: 2026-01-29T00:00:00
   Fim: 2026-01-29T23:59:59

Agendamentos carregados: 1

⏱️ timeParaMinutos recebeu: "18:45:00" (tipo: string)
   ➜ Convertido para: 1125 minutos (18h 45m)

📏 Calculando altura para "Thamara":
   🕐 data_hora: 2026-01-29T18:00:00
   🕑 horario_termino: 18:45:00
   📊 minutosInicio: 1080 (18:0)
   📊 minutosTermino: 1125
   ⏱️  Duração: 45 minutos
   📐 Altura calculada: 60px
```

### 5. Verificar Visualmente

O card da Thamara deve:
- ✅ Aparecer às **18:00** (não 15:00 ou 21:00)
- ✅ Terminar às **18:45**
- ✅ Cobrir exatamente **3 slots** (18:00, 18:15, 18:30, chegando até 18:45)
- ✅ Ter altura de **60px** (45 min = 1.5 slots)

## 🎯 Resultado Esperado

### Logs de Busca
```
📅 Buscando agendamentos do dia:
   Data: 29/1/2026
   Início: 2026-01-29T00:00:00  ✅ Sem UTC
   Fim: 2026-01-29T23:59:59      ✅ Sem UTC
```

### Logs de Renderização
```
📏 Calculando altura para "Thamara":
   🕐 data_hora: 2026-01-29T18:00:00  ✅ 18:00
   🕑 horario_termino: 18:45:00       ✅ 18:45
   ⏱️  Duração: 45 minutos             ✅ Positivo
   📐 Altura: 60px                     ✅ Correto
```

### Card Visual
```
┌─────────────────────┐
│ 18:00               │
├─────────────────────┤
│                     │
│    Thamara          │ ← Card roxo
│    18:00 às 18:45   │   60px altura
│                     │   3 slots
├─────────────────────┤
│ 18:45               │
└─────────────────────┘
```

## ⚠️ IMPORTANTE: Cache

Se após reiniciar o app o problema persistir, o cache pode estar impedindo a atualização.

**Solução Definitiva:**

1. **Desinstalar o app completamente**
2. **Reinstalar**
3. **Ou adicionar temporariamente no código:**

```typescript
// No início de carregarAgendamentos()
useEffect(() => {
  // Limpar cache na primeira carga
  CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
  carregarAgendamentos();
}, [selectedDate]);
```

## 📊 Comparação: Antes vs Depois

### ANTES (Com Bug de Timezone)

**Salvamento:**
```
Entrada: 18:00 local
toISOString(): 21:00 UTC ❌
Salvo: 21:00
```

**Leitura:**
```
Busca: 00:00 local → toISOString() → 03:00 UTC ❌
Resultado: Agendamentos de 03:00 às 02:59 (errado!)
```

**Renderização:**
```
data_hora: 21:00 ❌
Aparece às: 21:00 (errado!)
```

### DEPOIS (Corrigido)

**Salvamento:**
```
Entrada: 18:00 local
String ISO: "2026-01-29T18:00:00" ✅
Salvo: 18:00
```

**Leitura:**
```
Busca: "2026-01-29T00:00:00" (string ISO local) ✅
Resultado: Agendamentos de 00:00 às 23:59 (correto!)
```

**Renderização:**
```
data_hora: 18:00 ✅
Aparece às: 18:00 (correto!)
```

## 📝 Resumo das Correções

### Arquivos Modificados

1. **`app/(app)/agenda/novo.tsx`** (linha ~730-820)
   - ✅ Salvamento sem `.toISOString()`

2. **`app/(app)/agenda.tsx`** (linhas ~378-395, ~562-600)
   - ✅ Leitura sem `.toISOString()`
   - ✅ Logs de debug adicionados

### SQL Executado

- ✅ `corrigir-agendamento-thamara.sql` (corrigir dados existentes)

### Scripts Criados

- `limpar-cache-agenda-mobile.sh` (limpar cache)

## 🚀 Teste Agora!

1. **Limpe o cache** (manualmente ou via script)
2. **Feche o app completamente**
3. **Reabra o app**
4. **Vá para Agenda → 29/01/2026**
5. **Observe os logs no terminal**
6. **Verifique o card da Thamara**

**Cole os logs aqui quando testar!** 📝
