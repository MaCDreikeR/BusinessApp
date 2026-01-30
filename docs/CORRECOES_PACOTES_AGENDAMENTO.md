# 🔧 Correções: Funcionalidade de Pacotes no Agendamento

## 📋 Problemas Corrigidos

### ❌ **Problema 1: Modal abrindo de cima para baixo**
**ANTES:** Modal de pacotes usava animação diferente do modal de serviços  
**DEPOIS:** ✅ Modal de pacotes agora usa a mesma animação (de baixo para cima) com arraste

**Mudança:**
```tsx
// ANTES
<Animated.View 
  style={[styles.modalContent, { transform: [{ translateY: translateY }] }]}
  {...panResponder.panHandlers}
>

// DEPOIS
<Animated.View 
  style={[styles.modalContent, { transform: [{ translateY }] }]} // Usa a mesma variável
>
  <View {...panResponder.panHandlers} style={styles.modalHeader}>
    <View style={styles.modalDragIndicator} />
    // ...
  </View>
```

---

### ❌ **Problema 2: Nome do pacote aparecendo em "Serviços"**
**ANTES:** Pacotes e serviços eram misturados no mesmo campo  
**DEPOIS:** ✅ Separação clara entre serviços e pacotes com contadores independentes

**Mudanças:**

**Botão de Serviços:**
```tsx
<Text>
  {servicosSelecionados.length > 0 
    ? `Serviços (${servicosSelecionados.length})` 
    : 'Serviços'}
</Text>
{servicosSelecionados.length > 0 && (
  <Text>R$ {totalServiços}</Text>
)}
```

**Botão de Pacotes:**
```tsx
<Text>
  {pacotesSelecionados.length > 0 
    ? `Pacotes (${pacotesSelecionados.length})` 
    : 'Pacotes'}
</Text>
{pacotesSelecionados.length > 0 && (
  <Text>R$ {totalPacotes}</Text>
)}
```

**Exibição Separada:**
```tsx
{servicosSelecionados.length > 0 && (
  <View style={styles.itensSelecionadosContainer}>
    <Text style={styles.itensSelecionadosLabel}>Serviços:</Text>
    {servicosSelecionados.map(s => (
      <Text>• {s.nome} ({s.quantidade}x) - R$ {s.preco * s.quantidade}</Text>
    ))}
  </View>
)}

{pacotesSelecionados.length > 0 && (
  <View style={styles.itensSelecionadosContainer}>
    <Text style={styles.itensSelecionadosLabel}>Pacotes:</Text>
    {pacotesSelecionados.map(p => (
      <Text>• {p.nome} ({p.quantidade}x) - R$ {p.valor * p.quantidade}</Text>
    ))}
  </View>
)}

{/* Valor Total Combinado */}
<View style={styles.totalContainer}>
  <Text>Valor Total:</Text>
  <Text>R$ {totalServicos + totalPacotes}</Text>
</View>
```

---

### ❌ **Problema 3: Valor do pacote mostrando soma dos serviços**
**ANTES:** Pacote mostrava soma dos preços dos serviços individuais  
**DEPOIS:** ✅ Pacote mostra o valor final (`pacote.valor`) que já inclui desconto

**Mudança:**
```tsx
// ANTES (❌ ERRADO)
<Text>R$ {calcularSomaServicos(pacote.servicos)}</Text>

// DEPOIS (✅ CORRETO)
<Text>
  R$ {pacote.valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}
</Text>
```

**Explicação:**
- `pacote.valor` = valor FINAL do pacote (com desconto já aplicado)
- Não precisa somar os serviços individuais
- O campo `valor` na tabela `pacotes` já é o preço promocional

---

### ❌ **Problema 4: Duração do pacote não calculada**
**ANTES:** `duracao_total` não estava sendo buscado ou usado  
**DEPOIS:** ✅ Duração total do pacote carregada e usada no cálculo

**Mudanças:**

**1. Query do Supabase (carregarPacotes):**
```tsx
const { data, error } = await supabase
  .from('pacotes')
  .select(`
    *,  // Inclui duracao_total
    servicos:pacotes_servicos(
      quantidade,
      servico:servicos(
        id,
        nome,
        preco,
        duracao  // ✅ Busca duracao
      )
    )
  `)
```

**2. Exibição no Modal:**
```tsx
{pacote.duracao_total && (
  <Text style={styles.servicoDuracao}>
    ⏱️ {pacote.duracao_total} min
  </Text>
)}
```

**3. Cálculo de Duração Total:**
```tsx
const calcularDuracaoTotalCompleta = useCallback((): number | null => {
  let duracaoTotal = 0;
  let temDuracao = false;
  
  // Duração dos serviços
  for (const servico of servicosSelecionados) {
    if (servico.duracao) {
      duracaoTotal += servico.duracao * servico.quantidade;
      temDuracao = true;
    }
  }
  
  // ✅ Duração dos pacotes
  for (const pacote of pacotesSelecionados) {
    if (pacote.duracao_total) {
      duracaoTotal += pacote.duracao_total * pacote.quantidade;
      temDuracao = true;
    }
  }
  
  return temDuracao ? duracaoTotal : null;
}, [servicosSelecionados, pacotesSelecionados]);
```

**4. Horário de Término Automático:**
```tsx
useEffect(() => {
  if (hora && (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0)) {
    const duracaoTotal = calcularDuracaoTotalCompleta(); // ✅ Inclui pacotes
    
    if (duracaoTotal) {
      const horarioTerminoCalculado = calcularHorarioTermino(hora, duracaoTotal);
      setHoraTermino(horarioTerminoCalculado);
    }
  }
}, [hora, servicosSelecionados, pacotesSelecionados, calcularDuracaoTotalCompleta, calcularHorarioTermino]);
```

---

## 🎨 Novos Estilos Adicionados

```typescript
itensSelecionadosContainer: {
  marginTop: 8,
  padding: 12,
  backgroundColor: colors.background,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
},
itensSelecionadosLabel: {
  fontSize: 13,
  fontWeight: '600',
  color: colors.text,
  marginBottom: 6,
},
itemSelecionadoTexto: {
  fontSize: 12,
  color: colors.textSecondary,
  marginBottom: 4,
},
totalContainer: {
  marginTop: 8,
  padding: 12,
  backgroundColor: '#F3E8FF',
  borderRadius: 8,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
totalLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
},
totalValor: {
  fontSize: 16,
  fontWeight: 'bold',
  color: colors.primary,
},
```

---

## 📊 Comparação Visual

### **ANTES** ❌
```
┌─────────────────────────────┐
│ Serviços / Pacotes *        │
├─────────────────────────────┤
│ Serviços                    │
│ Perna+axila (1x), Pacote... │ ← CONFUSO!
│ R$ 300,00                   │
└─────────────────────────────┘
```

### **DEPOIS** ✅
```
┌─────────────────────────────┐
│ Serviços / Pacotes *        │
├──────────────┬──────────────┤
│ Serviços (1) │ Pacotes (1)  │
│ R$ 150,00    │ R$ 150,00    │
├──────────────┴──────────────┤
│ Serviços:                   │
│ • Perna+axila (1x) - R$ 150 │
│                             │
│ Pacotes:                    │
│ • Pacote Premium (1x) - R$ 150 │
│                             │
│ ┌─────────────────────────┐ │
│ │ Valor Total: R$ 300,00  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## ✅ Funcionalidades Verificadas

### Modal de Pacotes:
- [x] Abre de baixo para cima (igual ao de serviços)
- [x] Permite arrastar para baixo para fechar
- [x] Mostra valor final do pacote (com desconto)
- [x] Mostra duração total do pacote
- [x] Mostra quantidade de serviços incluídos
- [x] Busca funciona corretamente

### Exibição:
- [x] Serviços e pacotes separados visualmente
- [x] Contador de itens em cada botão
- [x] Preço individual em cada botão
- [x] Lista detalhada dos itens selecionados
- [x] Valor total combinado destacado

### Cálculos:
- [x] Valor total = serviços + pacotes
- [x] Duração total = duração serviços + duração pacotes
- [x] Horário de término calculado automaticamente
- [x] Indicador visual de duração total

---

## 🧪 Como Testar

1. **Selecionar Pacote:**
   - Clicar em "Pacotes"
   - Modal abre de baixo para cima ✓
   - Selecionar "Pacote Premium"
   - Verificar que mostra o valor do pacote (ex: R$ 150,00) ✓
   - Verificar que mostra a duração (ex: ⏱️ 90 min) ✓

2. **Exibição Separada:**
   - Botão "Pacotes" mostra "Pacotes (1)" ✓
   - Aparece seção "Pacotes:" com item detalhado ✓
   - Valor total combina serviços + pacotes ✓

3. **Cálculo de Duração:**
   - Selecionar horário de início
   - Verificar indicador "⏱️ Duração total: Xh Ymin" ✓
   - Verificar que horário de término é calculado ✓

4. **Combinar Serviços e Pacotes:**
   - Selecionar 1 serviço + 1 pacote
   - Verificar duas seções separadas ✓
   - Verificar valor total correto ✓
   - Verificar duração total correta ✓

---

## 📝 Notas Importantes

### Sobre o Valor do Pacote:
- O campo `pacotes.valor` na tabela já é o valor FINAL com desconto
- Não precisa calcular desconto no front-end
- Não precisa somar serviços individuais

### Sobre a Duração do Pacote:
- O campo `pacotes.duracao_total` deve ser preenchido na tela de pacotes
- É a soma das durações dos serviços incluídos
- Se não estiver preenchido, não será calculado horário de término

### Estrutura do Banco:
```sql
-- Tabela pacotes
pacotes (
  id,
  nome,
  descricao,
  valor,              -- ✅ Valor FINAL (com desconto)
  duracao_total,      -- ✅ Duração total em minutos
  desconto,           -- Percentual de desconto (opcional)
  estabelecimento_id
)

-- Relação com serviços
pacotes_servicos (
  pacote_id,
  servico_id,
  quantidade
)
```

---

## 🚀 Status Final

```
✅ Modal: CORRIGIDO (animação de baixo para cima)
✅ Separação: CORRIGIDA (serviços ≠ pacotes)
✅ Valor: CORRIGIDO (usa pacote.valor)
✅ Duração: CORRIGIDA (usa pacote.duracao_total)
✅ Cálculos: FUNCIONANDO (total + término automático)
✅ TypeScript: SEM ERROS
```

**Data:** 29 de janeiro de 2026  
**Arquivo:** `app/(app)/agenda/novo.tsx`  
**Status:** ✅ **TODAS AS CORREÇÕES APLICADAS**
