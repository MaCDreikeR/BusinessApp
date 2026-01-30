# ✅ CORREÇÃO: CÁLCULO AUTOMÁTICO DE DURAÇÃO PARA PACOTES

## 📅 Data: 29 de Janeiro de 2026

---

## 🐛 PROBLEMA IDENTIFICADO

### Sintoma:
- **Serviços:** Cálculo automático de horário de término funciona ✅
- **Pacotes:** Cálculo automático NÃO funciona ❌
- Ao selecionar um pacote, o horário de término não é calculado automaticamente

### Causa Raiz:
O campo `duracao_total` dos pacotes não estava sendo:
1. **Carregado do banco** (pode não existir na tabela)
2. **Calculado dinamicamente** a partir dos serviços incluídos

```typescript
// Interface estava correta
interface Pacote {
  duracao_total?: number; // ← Campo existe
}

// Mas os dados vinham assim:
{
  id: "...",
  nome: "Perna+axila",
  valor: 130,
  duracao_total: null // ← OU undefined ❌
}

// Resultado: calcularDuracaoTotalCompleta() retornava null
```

---

## ✅ SOLUÇÃO APLICADA

### Cálculo Dinâmico na Função `carregarPacotes()`

**Arquivo:** `app/(app)/agenda/novo.tsx` (Linha ~497)

```typescript
// ✅ DEPOIS (COM CÁLCULO)
const pacotesComDuracao = (data || []).map(pacote => {
  if (!pacote.duracao_total && pacote.servicos) {
    // Calcular duração total somando os serviços
    const duracaoCalculada = pacote.servicos.reduce((total: number, item: any) => {
      const duracao = item.servico?.duracao || 0;
      const quantidade = item.quantidade || 1;
      return total + (duracao * quantidade);
    }, 0);
    
    logger.debug(`📦 Pacote "${pacote.nome}": duracao_total calculada = ${duracaoCalculada} min`);
    
    return {
      ...pacote,
      duracao_total: duracaoCalculada > 0 ? duracaoCalculada : undefined
    };
  }
  
  logger.debug(`📦 Pacote "${pacote.nome}": duracao_total do banco = ${pacote.duracao_total} min`);
  return pacote;
});

setTodosPacotes(pacotesComDuracao);
```

---

## 📊 COMO FUNCIONA

### 1. Query Busca Serviços Incluídos no Pacote

```typescript
const { data, error } = await supabase
  .from('pacotes')
  .select(`
    *,
    servicos:pacotes_servicos(
      quantidade,
      servico:servicos(
        id,
        nome,
        preco,
        duracao  // ← Duração de cada serviço
      )
    )
  `)
```

### 2. Cálculo da Duração Total

```typescript
// Exemplo: Pacote "Perna+axila"
// - Serviço 1: Depilação Perna (60 min) x 1 = 60 min
// - Serviço 2: Depilação Axila (15 min) x 1 = 15 min
// Duração Total = 75 minutos ✅

const duracaoCalculada = pacote.servicos.reduce((total, item) => {
  const duracao = item.servico?.duracao || 0; // 60, depois 15
  const quantidade = item.quantidade || 1;    // 1, depois 1
  return total + (duracao * quantidade);      // 60 + 15 = 75
}, 0);
```

### 3. Uso pela Função `calcularDuracaoTotalCompleta()`

```typescript
const calcularDuracaoTotalCompleta = useCallback((): number | null => {
  let duracaoTotal = 0;
  let temDuracao = false;
  
  // Duração dos serviços individuais
  for (const servico of servicosSelecionados) {
    if (servico.duracao) {
      duracaoTotal += servico.duracao * servico.quantidade;
      temDuracao = true;
    }
  }
  
  // Duração dos pacotes (AGORA FUNCIONA! ✅)
  for (const pacote of pacotesSelecionados) {
    if (pacote.duracao_total) { // ← Agora tem valor!
      duracaoTotal += pacote.duracao_total * pacote.quantidade;
      temDuracao = true;
    }
  }
  
  return temDuracao ? duracaoTotal : null;
}, [servicosSelecionados, pacotesSelecionados]);
```

### 4. Cálculo Automático do Horário de Término

```typescript
// useEffect monitora mudanças
useEffect(() => {
  if (hora && (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0)) {
    const duracaoTotal = calcularDuracaoTotalCompleta(); // ← Agora inclui pacotes!
    
    if (duracaoTotal) {
      const horarioTerminoCalculado = calcularHorarioTermino(hora, duracaoTotal);
      setHoraTermino(horarioTerminoCalculado);
      logger.debug(`⏱️ Duração: ${duracaoTotal} min | Término: ${horarioTerminoCalculado}`);
    }
  }
}, [hora, servicosSelecionados, pacotesSelecionados]);
```

---

## 🎯 EXEMPLO PRÁTICO

### Cenário: Pacote "Perna+axila" (75 minutos)

```typescript
// 1. Usuário seleciona pacote
handleSelecionarPacote({
  id: "abc",
  nome: "Perna+axila",
  valor: 130,
  duracao_total: 75, // ← Calculado automaticamente!
  servicos: [
    { servico: { nome: "Perna", duracao: 60 }, quantidade: 1 },
    { servico: { nome: "Axila", duracao: 15 }, quantidade: 1 }
  ]
});

// 2. Usuário seleciona horário de início
setHora("14:00");

// 3. useEffect detecta mudança e calcula término
// Duração total = 75 minutos
// Horário início = 14:00
// Horário término = 15:15 ✅ (calculado automaticamente)

setHoraTermino("15:15");
```

---

## 📝 LOGS ADICIONADOS

Para facilitar o debug, foram adicionados logs detalhados:

```typescript
// Log quando duracao_total vem do banco
logger.debug(`📦 Pacote "${pacote.nome}": duracao_total do banco = ${pacote.duracao_total} min`);

// Log quando duracao_total é calculada
logger.debug(`📦 Pacote "${pacote.nome}": duracao_total calculada = ${duracaoCalculada} min`);

// Log no useEffect
logger.debug(`⏱️ Duração total: ${duracaoTotal} min | Início: ${hora} | Término: ${horarioTerminoCalculado}`);
```

**Ver logs no console:**
```bash
# Metro Bundler exibe os logs automaticamente
# Ou use:
npx react-native log-android  # Android
npx react-native log-ios      # iOS
```

---

## 🧪 COMO TESTAR

### Teste 1: Pacote com Duração
```
1. Novo Agendamento
2. Clicar botão "Pacotes"
3. Selecionar "Perna+axila" (75 min)
4. Selecionar horário início: 14:00
5. ✅ Horário término calculado automaticamente: 15:15
6. ✅ Indicador mostra: "⏱️ Duração total: 1h 15min"
```

### Teste 2: Múltiplos Pacotes
```
1. Selecionar pacote 1: "Perna+axila" (75 min)
2. Selecionar pacote 2: "Facial" (45 min)
3. Horário início: 14:00
4. ✅ Duração total: 120 min (2 horas)
5. ✅ Horário término: 16:00
```

### Teste 3: Serviço + Pacote
```
1. Selecionar serviço: "Corte" (30 min)
2. Selecionar pacote: "Perna+axila" (75 min)
3. Horário início: 14:00
4. ✅ Duração total: 105 min (1h 45min)
5. ✅ Horário término: 15:45
```

### Teste 4: Quantidade de Pacotes
```
1. Selecionar pacote: "Perna+axila" (75 min)
2. Aumentar quantidade para 2x
3. Horário início: 14:00
4. ✅ Duração total: 150 min (2h 30min)
5. ✅ Horário término: 16:30
```

---

## 🔧 MANUTENÇÃO FUTURA

### Se a Tabela `pacotes` Tiver o Campo `duracao_total`:

O código já está preparado para isso:

```typescript
if (!pacote.duracao_total && pacote.servicos) {
  // ← Só calcula se duracao_total não existir
  const duracaoCalculada = ...
}
```

**Comportamento:**
- Se `duracao_total` vem do banco → Usa o valor do banco
- Se `duracao_total` é `null/undefined` → Calcula dinamicamente

### Para Adicionar o Campo no Banco (Futuro):

```sql
-- Migration SQL
ALTER TABLE pacotes 
ADD COLUMN duracao_total INTEGER;

-- Atualizar registros existentes
UPDATE pacotes p
SET duracao_total = (
  SELECT SUM(s.duracao * ps.quantidade)
  FROM pacotes_servicos ps
  JOIN servicos s ON s.id = ps.servico_id
  WHERE ps.pacote_id = p.id
);

-- Adicionar trigger para atualizar automaticamente
CREATE OR REPLACE FUNCTION update_pacote_duracao()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pacotes
  SET duracao_total = (
    SELECT COALESCE(SUM(s.duracao * ps.quantidade), 0)
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = NEW.pacote_id
  )
  WHERE id = NEW.pacote_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pacote_duracao
AFTER INSERT OR UPDATE OR DELETE ON pacotes_servicos
FOR EACH ROW
EXECUTE FUNCTION update_pacote_duracao();
```

---

## 📊 COMPARAÇÃO

### ❌ ANTES:
```typescript
// Pacote carregado
{
  id: "abc",
  nome: "Perna+axila",
  valor: 130,
  duracao_total: undefined  // ← Sem valor
}

// Resultado
Horário início: 14:00
Horário término: [campo vazio] ❌
```

### ✅ DEPOIS:
```typescript
// Pacote carregado
{
  id: "abc",
  nome: "Perna+axila",
  valor: 130,
  duracao_total: 75  // ← Calculado automaticamente!
}

// Resultado
Horário início: 14:00
Horário término: 15:15 ✅ (calculado automaticamente)
Indicador: "⏱️ Duração total: 1h 15min" ✅
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Campo `duracao_total` calculado dinamicamente
- [x] Cálculo considera quantidade de cada serviço
- [x] `calcularDuracaoTotalCompleta()` inclui pacotes
- [x] `useEffect` detecta mudanças em `pacotesSelecionados`
- [x] Horário de término calculado automaticamente
- [x] Indicador de duração total exibido
- [x] Logs detalhados para debug
- [x] Sem erros de TypeScript
- [x] Compatível com futuro campo no banco

---

## 🎉 CONCLUSÃO

O cálculo automático de duração agora funciona **perfeitamente para pacotes**!

**Mudança:** Apenas 1 função modificada (`carregarPacotes`)  
**Impacto:** Cálculo automático de horário de término para pacotes  
**Compatibilidade:** Funciona com ou sem campo `duracao_total` no banco  

**Sistema completo de agendamentos com pacotes 100% funcional!** 🚀

---

## 📚 DOCUMENTAÇÃO RELACIONADA

1. **Implementação de pacotes:** `IMPLEMENTACAO_PACOTES_AGENDAMENTO.md`
2. **Correção de valor:** `CORRECAO_COMPLETA_VALOR_PACOTES.md`
3. **Correção de animação:** `CORRECAO_MODAL_PACOTES_ANIMACAO.md`
4. **Correção visual:** `CORRECAO_VISUAL_MODAL_PACOTES.md`
5. **Índice completo:** `INDICE_DOCUMENTACAO_PACOTES.md`
