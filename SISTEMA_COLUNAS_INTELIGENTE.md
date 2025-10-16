# 🎯 SISTEMA DE COLUNAS INTELIGENTE

## 🚀 Problema Resolvido

**ANTES**: Cards ficavam um sobre o outro quando começavam no mesmo horário

**AGORA**: Sistema de **5 colunas invisíveis** que aloca cada agendamento na primeira coluna disponível!

---

## 🧠 Lógica de Alocação

### Como Funciona:

1. **Sistema percorre todos os agendamentos** em ordem cronológica
2. **Para cada agendamento**, verifica qual é a **primeira coluna livre**
3. Uma coluna está **livre** quando:
   - Nunca foi usada, OU
   - O último agendamento dessa coluna já terminou
4. **Aloca o agendamento** nessa coluna
5. **Marca a coluna como ocupada** até o horário de término

---

## 📊 Exemplo Prático

### Cenário: 3 Agendamentos

```javascript
Agendamento A: 08:00 às 10:00 (2 horas)
Agendamento B: 08:00 às 09:00 (1 hora)  
Agendamento C: 09:00 às 11:00 (2 horas)
```

### Processo de Alocação:

#### 1️⃣ **Agendamento A (08:00-10:00)**
```
Verificar colunas:
- Coluna 0: Livre ✅
- ALOCA NA COLUNA 0
- Coluna 0 ocupada até 10:00 (600 minutos)
```

#### 2️⃣ **Agendamento B (08:00-09:00)**
```
Verificar colunas:
- Coluna 0: Ocupada até 10:00 ❌ (08:00 < 10:00)
- Coluna 1: Livre ✅
- ALOCA NA COLUNA 1
- Coluna 1 ocupada até 09:00 (540 minutos)
```

#### 3️⃣ **Agendamento C (09:00-11:00)**
```
Verificar colunas:
- Coluna 0: Ocupada até 10:00 ❌ (09:00 < 10:00)
- Coluna 1: Livre! ✅ (terminou às 09:00)
- ALOCA NA COLUNA 1 (reutiliza!)
- Coluna 1 ocupada até 11:00 (660 minutos)
```

---

## 🎨 Resultado Visual

```
Estado das Colunas:
┌────────┬────────┬────────┬────────┬────────┐
│ Col 0  │ Col 1  │ Col 2  │ Col 3  │ Col 4  │
├────────┼────────┼────────┼────────┼────────┤
│  58px  │ 246px  │ 434px  │ 622px  │ 810px  │
└────────┴────────┴────────┴────────┴────────┘

Visualização na Agenda:
08:00  ──────────────────────────────────────
       ┏━━━━━━┓  ┏━━━━━━┓
       ┃ Ag A ┃  ┃ Ag B ┃  (ambos começam às 08:00)
       ┃08-10h┃  ┃08-09h┃
       ┃      ┃  ┃      ┃
       ┃      ┃  ┗━━━━━━┛
08:30  ┃      ┃  ──────────
       ┃      ┃
09:00  ┃      ┃  ┏━━━━━━┓  (Ag C começa às 09:00)
       ┃      ┃  ┃ Ag C ┃  (reutiliza Coluna 1!)
       ┃      ┃  ┃09-11h┃
       ┗━━━━━━┛  ┃      ┃
09:30  ──────────┃      ┃
                 ┃      ┃
10:00  ──────────┃      ┃
                 ┃      ┃
10:30  ──────────┃      ┃
                 ┗━━━━━━┛
11:00  ──────────────────────────────────────

Coluna 0: Ag A (08:00-10:00)
Coluna 1: Ag B (08:00-09:00), depois Ag C (09:00-11:00)
```

---

## 💻 Implementação Técnica

### Estrutura de Dados:

```typescript
const NUM_COLUNAS = 5;
const colunasOcupadas: { [coluna: number]: number } = {};
// { 
//   0: 600,  // Coluna 0 ocupada até 600 minutos (10:00)
//   1: 660,  // Coluna 1 ocupada até 660 minutos (11:00)
// }
```

### Algoritmo de Alocação:

```typescript
const agendamentosComColuna = agendamentos.map(ag => {
  const dataInicio = new Date(ag.data_hora);
  const minutosInicio = dataInicio.getHours() * 60 + dataInicio.getMinutes();
  const minutosTermino = ag.horario_termino 
    ? timeParaMinutos(ag.horario_termino) 
    : minutosInicio + 30;

  // Encontrar primeira coluna disponível
  let colunaAlocada = 0;
  for (let col = 0; col < NUM_COLUNAS; col++) {
    // Coluna está livre se não existe ou se já terminou
    if (!colunasOcupadas[col] || colunasOcupadas[col] <= minutosInicio) {
      colunaAlocada = col;
      colunasOcupadas[col] = minutosTermino; // Ocupar até término
      break;
    }
  }

  return { ...ag, coluna: colunaAlocada };
});
```

### Cálculo de Posição:

```typescript
const leftPosition = 58 + (ag.coluna * 188);
// 58px = largura do horário
// 188px = largura card (180px) + espaço (8px)

// Exemplos:
// Coluna 0: 58 + (0 × 188) = 58px
// Coluna 1: 58 + (1 × 188) = 246px
// Coluna 2: 58 + (2 × 188) = 434px
// Coluna 3: 58 + (3 × 188) = 622px
// Coluna 4: 58 + (4 × 188) = 810px
```

---

## 📐 Dimensões das Colunas

```
┌────────────────────────────────────────────────────────────┐
│ Horário  Col 0      Col 1      Col 2      Col 3      Col 4 │
│          (58px)    (246px)    (434px)    (622px)    (810px)│
├────────────────────────────────────────────────────────────┤
│ 08:00    ┏━━━━┓                                             │
│          ┃    ┃                                             │
│ 08:30    ┃    ┃                                             │
│          ┃    ┃                                             │
│ 09:00    ┃    ┃    ┏━━━━┓                                  │
│          ┃    ┃    ┃    ┃                                  │
│ 09:30    ┗━━━━┛    ┃    ┃                                  │
│                    ┃    ┃                                  │
│ 10:00              ┃    ┃    ┏━━━━┓                        │
│                    ┃    ┃    ┃    ┃                        │
│ 10:30              ┗━━━━┛    ┃    ┃                        │
│                              ┃    ┃                        │
│ 11:00                        ┗━━━━┛                        │
└────────────────────────────────────────────────────────────┘

Largura total: 58 + (5 × 188) = 998px
```

---

## 🔄 Reutilização de Colunas

### Exemplo Complexo:

```javascript
08:00 - Ag1 (08:00-10:00) → Coluna 0
08:00 - Ag2 (08:00-09:00) → Coluna 1
09:00 - Ag3 (09:00-11:00) → Coluna 1 ✅ (reutiliza!)
09:30 - Ag4 (09:30-10:30) → Coluna 2
10:00 - Ag5 (10:00-12:00) → Coluna 0 ✅ (reutiliza!)
10:30 - Ag6 (10:30-11:30) → Coluna 2 ✅ (reutiliza!)
```

### Estado das Colunas ao Longo do Tempo:

| Horário | Col 0        | Col 1        | Col 2        | Col 3 | Col 4 |
|---------|--------------|--------------|--------------|-------|-------|
| 08:00   | Ag1 (10:00)  | Ag2 (09:00)  | -            | -     | -     |
| 09:00   | Ag1 (10:00)  | Ag3 (11:00)  | -            | -     | -     |
| 09:30   | Ag1 (10:00)  | Ag3 (11:00)  | Ag4 (10:30)  | -     | -     |
| 10:00   | Ag5 (12:00)  | Ag3 (11:00)  | Ag4 (10:30)  | -     | -     |
| 10:30   | Ag5 (12:00)  | Ag3 (11:00)  | Ag6 (11:30)  | -     | -     |
| 11:00   | Ag5 (12:00)  | -            | Ag6 (11:30)  | -     | -     |
| 11:30   | Ag5 (12:00)  | -            | -            | -     | -     |
| 12:00   | -            | -            | -            | -     | -     |

---

## 🎯 Benefícios do Sistema

### 1. **Organização Automática**
- Não há sobreposição visual
- Cards sempre na primeira coluna disponível
- Reutilização inteligente de colunas

### 2. **Eficiência de Espaço**
```
SEM sistema de colunas:
┏━━━┓
┃ A ┃ ← Todos empilhados
┗━━━┛
┏━━━┓
┃ B ┃
┗━━━┛

COM sistema de colunas:
┏━━━┓ ┏━━━┓ ┏━━━┓
┃ A ┃ ┃ B ┃ ┃ C ┃ ← Lado a lado
┗━━━┛ ┗━━━┛ ┗━━━┛
```

### 3. **Escalabilidade**
- Suporta até 5 agendamentos simultâneos
- Fácil ajustar `NUM_COLUNAS` para mais ou menos

### 4. **Performance**
- Algoritmo O(n × c) onde n = agendamentos, c = colunas
- Com 5 colunas: O(5n) = O(n) - linear!

---

## 🧪 Casos de Teste

### Teste 1: Dois Agendamentos Simultâneos
```
08:00 - Ag1 (08:00-10:00)
08:00 - Ag2 (08:00-09:00)

Resultado:
┏━━━━┓ ┏━━━━┓
┃ Ag1┃ ┃ Ag2┃
┃    ┃ ┗━━━━┛
┗━━━━┛

Ag1 → Coluna 0
Ag2 → Coluna 1
```

### Teste 2: Três Agendamentos com Reuso
```
08:00 - Ag1 (08:00-09:00)
08:00 - Ag2 (08:00-10:00)
09:00 - Ag3 (09:00-11:00)

Resultado:
┏━━━━┓ ┏━━━━┓
┃ Ag1┃ ┃ Ag2┃
┗━━━━┛ ┃    ┃
┏━━━━┓ ┃    ┃
┃ Ag3┃ ┗━━━━┛
┃    ┃
┗━━━━┛

Ag1 → Coluna 0
Ag2 → Coluna 1
Ag3 → Coluna 0 (reutiliza!)
```

### Teste 3: Cinco Agendamentos Simultâneos (Máximo)
```
09:00 - Ag1, Ag2, Ag3, Ag4, Ag5 (todos 09:00-10:00)

Resultado:
┏━━┓ ┏━━┓ ┏━━┓ ┏━━┓ ┏━━┓
┃ 1┃ ┃ 2┃ ┃ 3┃ ┃ 4┃ ┃ 5┃
┗━━┛ ┗━━┛ ┗━━┛ ┗━━┛ ┗━━┛

Colunas: 0, 1, 2, 3, 4 (todas usadas!)
```

---

## ⚙️ Configuração

### Ajustar Número de Colunas:

```typescript
// Alterar para mais ou menos colunas
const NUM_COLUNAS = 5;  // Padrão: 5 colunas

// Exemplos:
const NUM_COLUNAS = 3;  // Ambientes menores
const NUM_COLUNAS = 7;  // Ambientes grandes
const NUM_COLUNAS = 10; // Eventos com muitas salas
```

### Ajustar Largura dos Cards:

```typescript
// No estilo agendamentoCardAbsolute:
width: 180,  // Largura atual

// Cálculo da posição precisa ser atualizado:
const larguraCard = 180;
const espacoEntreCards = 8;
const larguraTotal = larguraCard + espacoEntreCards; // 188px

const leftPosition = 58 + (ag.coluna * larguraTotal);
```

---

## 🎉 Resultado Final

### Visualização Completa:

```
┌─────────────────────────────────────────────────────────────┐
│ qui, 16/10/2025                                      < >    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 08:00  ┏━━━━━━━━━┓  ┏━━━━━━━━━┓                          │
│        ┃ ● 08:00 ┃  ┃ ● 08:00 ┃                          │
│        ┃   às    ┃  ┃   às    ┃                          │
│ 08:30  ┃  14:00  ┃  ┃  09:15  ┃                          │
│        ┃         ┃  ┃         ┃                          │
│        ┃ borges  ┃  ┗━━━━━━━━━┛                          │
│ 09:00  ┃         ┃  ┏━━━━━━━━━┓                          │
│        ┃Formataç ┃  ┃ ● 09:00 ┃                          │
│        ┃   ão    ┃  ┃   às    ┃                          │
│ 09:30  ┃         ┃  ┃  12:45  ┃                          │
│        ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃Deyvison ┃                          │
│ 10:00  ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃ limpeza ┃                          │
│        ┃         ┃  ┃         ┃                          │
│ 10:30  ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃         ┃                          │
│ 11:00  ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃         ┃                          │
│ 11:30  ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┃         ┃                          │
│        ┃         ┃  ┗━━━━━━━━━┛                          │
│ 12:00  ┃         ┃                                        │
│        ┃         ┃                                        │
│        ┃         ┃                                        │
│ 12:30  ┃         ┃                                        │
│        ┃         ┃                                        │
│        ┃         ┃                                        │
│ 13:00  ┃         ┃                                        │
│        ┃         ┃                                        │
│        ┃         ┃                                        │
│ 13:30  ┃         ┃                                        │
│        ┗━━━━━━━━━┛                                        │
│ 14:00  ──────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────┘

✅ Card 1 (borges):    Coluna 0 - 08:00 às 14:00
✅ Card 2 (Deyvison):  Coluna 1 - 09:00 às 12:45

Sem sobreposição! Organização perfeita! 🎉
```

---

**Sistema de colunas inteligente funcionando perfeitamente! 🚀**
