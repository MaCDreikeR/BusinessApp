# 🐛 CORREÇÃO DE ERRO: Invalid time value

## ❌ Problema

```
ERROR [RangeError: Invalid time value]
Code: agenda.tsx
> 199 | datasComAgendamento: agendamentosMes.map(ag => format(parseDataHoraLocal(ag.data_hora), 'dd/MM/yyyy'))
```

## 🔍 Causa

A função `parseDataHoraLocal()` estava recebendo valores inválidos:
- Agendamentos com `data_hora = null`
- Agendamentos com `data_hora = undefined`
- Strings em formato inválido

Quando tentava fazer `split('T')` em valores inválidos, resultava em `Date` inválida, causando `RangeError` no `format()`.

## ✅ Solução Implementada

### 1. Validação Robusta na Função `parseDataHoraLocal()`

**Arquivo:** `app/(app)/agenda.tsx` (linha ~108)

```typescript
const parseDataHoraLocal = (dataHoraISO: string): Date => {
  try {
    // ✅ Validar entrada
    if (!dataHoraISO || typeof dataHoraISO !== 'string') {
      logger.warn('⚠️ parseDataHoraLocal: entrada inválida', dataHoraISO);
      return new Date(); // Fallback para data atual
    }

    // ✅ Validar formato
    const [datePart, timePart] = dataHoraISO.split('T');
    if (!datePart || !timePart) {
      logger.warn('⚠️ parseDataHoraLocal: formato inválido', dataHoraISO);
      return new Date();
    }

    // ✅ Extrair e validar valores
    const [ano, mes, dia] = datePart.split('-').map(Number);
    const [hora, min, seg = 0] = timePart.split(':').map(Number);
    
    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || isNaN(hora) || isNaN(min)) {
      logger.warn('⚠️ parseDataHoraLocal: valores NaN', { ano, mes, dia, hora, min });
      return new Date();
    }
    
    // ✅ Criar Date e validar resultado
    const date = new Date(ano, mes - 1, dia, hora, min, seg);
    if (isNaN(date.getTime())) {
      logger.warn('⚠️ parseDataHoraLocal: Date inválida resultante', dataHoraISO);
      return new Date();
    }
    
    return date;
  } catch (error) {
    logger.error('❌ parseDataHoraLocal: erro ao fazer parse', error, dataHoraISO);
    return new Date(); // Fallback
  }
};
```

### 2. Filtro de Agendamentos Válidos no useEffect do Calendário

**Arquivo:** `app/(app)/agenda.tsx` (linha ~226)

```typescript
useEffect(() => {
  const marked: {[key: string]: any} = {};
  
  // ✅ Filtrar agendamentos válidos ANTES de processar
  const agendamentosValidos = agendamentosMes.filter(ag => {
    if (!ag || !ag.data_hora) {
      logger.warn('⚠️ Agendamento sem data_hora ignorado:', ag?.id);
      return false;
    }
    return true;
  });
  
  // ✅ Try-catch no map para evitar crash
  logger.debug('📅 [CALENDÁRIO] Atualizando marcações:', {
    totalAgendamentosMes: agendamentosValidos.length,
    datasComAgendamento: agendamentosValidos.map(ag => {
      try {
        return format(parseDataHoraLocal(ag.data_hora), 'dd/MM/yyyy');
      } catch (e) {
        logger.error('❌ Erro ao formatar data:', ag.id, ag.data_hora, e);
        return 'data_invalida';
      }
    })
  });
  
  // ✅ Try-catch no forEach
  agendamentosValidos.forEach(ag => {
    try {
      const dataAg = parseDataHoraLocal(ag.data_hora);
      const dataStr = format(dataAg, 'yyyy-MM-dd');
      // ... marcar data
    } catch (e) {
      logger.error('❌ Erro ao marcar data no calendário:', ag.id, e);
    }
  });
  
  // ...
}, [agendamentosMes, selectedDate, datasBloqueadas]);
```

### 3. Validação no `listSections` useMemo

**Arquivo:** `app/(app)/agenda.tsx` (linha ~1650)

```typescript
const listSections = useMemo(() => {
  const map: Record<string, AgendamentoAgenda[]> = {};
  (agendamentosMes || []).forEach((ag) => {
    try {
      // ✅ Validar data_hora
      if (!ag || !ag.data_hora) {
        logger.warn('⚠️ Agendamento sem data_hora ignorado na lista:', ag?.id);
        return;
      }
      
      const d = parseDataHoraLocal(ag.data_hora);
      const key = format(d, 'dd/MM/yyyy');
      if (!map[key]) map[key] = [];
      map[key].push(ag);
    } catch (e) {
      logger.error('❌ Erro ao agrupar agendamento:', ag?.id, e);
    }
  });
  // ...
}, [agendamentosMes]);
```

## 🎯 Benefícios

### Antes (❌)
- App crashava com `RangeError: Invalid time value`
- Dados inválidos causavam erro fatal
- Usuário via tela em branco

### Depois (✅)
- App continua funcionando mesmo com dados inválidos
- Logs detalhados sobre problemas
- Fallback para data atual evita crashes
- Agendamentos inválidos são filtrados/ignorados

## 📊 Validações Implementadas

| Tipo de Validação | Local | Comportamento |
|-------------------|-------|---------------|
| **Entrada nula** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **String vazia** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **Formato inválido** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **Valores NaN** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **Date inválida** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **Exceção** | `parseDataHoraLocal()` | Retorna `new Date()` |
| **Agendamento sem data_hora** | useEffect calendário | Filtrado antes de processar |
| **Erro no format()** | useEffect calendário | Try-catch com log |
| **Erro no forEach** | useEffect calendário | Try-catch com log |
| **Agendamento sem data_hora** | listSections | Ignorado com log |

## 🧪 Como Testar

### 1. Cenário Normal (Dados Válidos)
```bash
# App deve funcionar normalmente
npm run android
```

**Resultado Esperado:**
- ✅ Agenda carrega
- ✅ Calendário marca datas
- ✅ Lista exibe agendamentos
- ✅ Nenhum erro no console

### 2. Cenário com Dados Inválidos

**Criar agendamento com data_hora = null no banco:**
```sql
INSERT INTO agendamentos (
  cliente, 
  data_hora, 
  estabelecimento_id
) VALUES (
  'Teste Erro',
  NULL,
  'seu-estabelecimento-id'
);
```

**Resultado Esperado:**
- ✅ App NÃO crasha
- ✅ Log de warning aparece
- ✅ Agendamento inválido é ignorado
- ✅ Outros agendamentos continuam funcionando

### 3. Logs Esperados

**Dados válidos:**
```
📅 [CALENDÁRIO] Atualizando marcações: {
  totalAgendamentosMes: 1,
  datasComAgendamento: ["29/01/2026"]
}
```

**Dados inválidos filtrados:**
```
⚠️ Agendamento sem data_hora ignorado: abc-123-def
📅 [CALENDÁRIO] Atualizando marcações: {
  totalAgendamentosMes: 0,
  datasComAgendamento: []
}
```

**Erro capturado:**
```
❌ Erro ao formatar data: abc-123-def "invalid" [Error: ...]
```

## 🔧 Manutenção Futura

### Melhorias Possíveis

1. **Limpeza de Dados:**
   ```sql
   -- Identificar agendamentos com data_hora inválida
   SELECT id, cliente, data_hora 
   FROM agendamentos 
   WHERE data_hora IS NULL;
   
   -- Remover ou corrigir
   DELETE FROM agendamentos WHERE data_hora IS NULL;
   ```

2. **Constraint no Banco:**
   ```sql
   ALTER TABLE agendamentos 
   ALTER COLUMN data_hora SET NOT NULL;
   ```

3. **Validação no Formulário:**
   - Garantir que `data_hora` nunca seja salva como `null`
   - Adicionar validação no `novo.tsx` antes de salvar

4. **Type Safety:**
   ```typescript
   interface AgendamentoAgenda {
     // ...
     data_hora: string; // Remover ? para tornar obrigatório
     // ...
   }
   ```

## 📝 Checklist

- [x] Função `parseDataHoraLocal()` com validação robusta
- [x] Filtro de agendamentos válidos no useEffect
- [x] Try-catch no map do datasComAgendamento
- [x] Try-catch no forEach de marcação de datas
- [x] Validação no listSections
- [x] Logs detalhados para debugging
- [x] Sem erros de compilação
- [x] Documentação criada

## 🚀 Status

**Correção:** ✅ IMPLEMENTADA  
**Testado:** ⏳ PENDENTE  
**Deploy:** ⏳ PENDENTE

**Próximo Passo:** Recompilar e testar o app!

```bash
npm run android
```
