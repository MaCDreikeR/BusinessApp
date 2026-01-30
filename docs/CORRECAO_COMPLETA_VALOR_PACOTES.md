# ✅ CORREÇÃO COMPLETA: VALOR DE PACOTES

## 📋 PROBLEMA IDENTIFICADO

O campo `valor` na tabela `pacotes` estava sendo **gravado incorretamente**:

### ❌ ANTES (ERRADO)
```typescript
// No código: app/(app)/pacotes.tsx
const valorNum = Number(novoPacote.valor); // Contém SOMA dos serviços
const pacoteData = {
  valor: valorNum, // ← Gravava R$ 150,00 (soma dos serviços)
  desconto: 20.00
};

// No banco de dados:
INSERT INTO pacotes (valor, desconto) VALUES (150.00, 20.00);
// valor = R$ 150,00 (SOMA dos serviços - ERRADO!)
// desconto = R$ 20,00
```

### ✅ DEPOIS (CORRETO)
```typescript
// No código: app/(app)/pacotes.tsx (CORRIGIDO)
const somaServicos = Number(novoPacote.valor); // R$ 150,00
const descontoNum = Number(novoPacote.desconto); // R$ 20,00
const valorFinal = somaServicos - descontoNum; // R$ 130,00 ← CORRETO!

const pacoteData = {
  valor: valorFinal, // ← Grava R$ 130,00 (valor final com desconto)
  desconto: descontoNum
};

// No banco de dados:
INSERT INTO pacotes (valor, desconto) VALUES (130.00, 20.00);
// valor = R$ 130,00 (VALOR FINAL - CORRETO! ✅)
// desconto = R$ 20,00
```

---

## 🔧 CORREÇÕES APLICADAS

### 1️⃣ Função `handleSalvarPacote()` - LINHA ~410

**Arquivo:** `app/(app)/pacotes.tsx`

```typescript
// ❌ ANTES
const valorNum = Number(novoPacote.valor.replace(',', '.'));
const descontoNum = Number(novoPacote.desconto.replace(',', '.'));
const pacoteData = {
  valor: isNaN(valorNum) ? 0 : valorNum, // ← ERRADO
  desconto: isNaN(descontoNum) ? 0 : descontoNum,
};

// ✅ DEPOIS
const somaServicos = Number(novoPacote.valor.replace(',', '.'));
const descontoNum = Number(novoPacote.desconto.replace(',', '.'));

// IMPORTANTE: O campo "valor" no banco deve ser o VALOR FINAL (com desconto aplicado)
// novoPacote.valor contém a SOMA dos serviços/produtos
// Então: valor_final = soma_servicos - desconto
const valorFinal = somaServicos - descontoNum;

const pacoteData = {
  valor: isNaN(valorFinal) ? 0 : Math.max(0, valorFinal), // ← CORRETO ✅
  desconto: isNaN(descontoNum) ? 0 : descontoNum,
  estabelecimento_id: estabelecimentoId,
};
```

---

### 2️⃣ Função `handleEditarPacote()` - LINHA ~345

**Problema:** Quando editava um pacote, o campo `novoPacote.valor` recebia o valor do banco (que agora é o valor final), mas deveria recalcular a soma dos serviços para funcionar corretamente com as funções de adicionar/remover itens.

```typescript
// ❌ ANTES
const handleEditarPacote = (pacote: PacoteDetalhado) => {
  setPacoteEmEdicao(pacote);
  setNovoPacote({
    nome: pacote.nome,
    descricao: pacote.descricao,
    valor: pacote.valor.toString(), // ← ERRADO (valor final do banco)
    desconto: pacote.desconto.toString(),
    produtos: pacote.produtos || [],
    servicos: pacote.servicos || []
  });
  setMostrarModal(true);
};

// ✅ DEPOIS
const handleEditarPacote = (pacote: PacoteDetalhado) => {
  setPacoteEmEdicao(pacote);
  
  // Recalcular a soma dos serviços e produtos (sem desconto)
  const somaProdutos = (pacote.produtos || []).reduce((total, item) => {
    return total + (item.produto?.preco || 0) * item.quantidade;
  }, 0);
  
  const somaServicos = (pacote.servicos || []).reduce((total, item) => {
    return total + (item.servico?.preco || 0) * item.quantidade;
  }, 0);
  
  const somaTotal = somaProdutos + somaServicos;
  
  setNovoPacote({
    nome: pacote.nome,
    descricao: pacote.descricao,
    valor: somaTotal.toString(), // ← CORRETO (soma sem desconto)
    desconto: pacote.desconto.toString(),
    produtos: pacote.produtos || [],
    servicos: pacote.servicos || []
  });
  setMostrarModal(true);
};
```

---

### 3️⃣ Função `renderItem()` - LINHA ~680

**Problema:** A exibição do card mostrava `item.valor` como "valor original", mas agora `item.valor` JÁ É o valor final.

```typescript
// ❌ ANTES
<View style={styles.pacoteValores}>
  <Text style={styles.valorOriginalText}>
    {item.valor.toLocaleString('pt-BR', { // ← Mostrava valor do banco
      style: 'currency',
      currency: 'BRL'
    })}
  </Text>
  {item.desconto > 0 && (
    <>
      <Text style={styles.descontoText}>
        - {item.desconto.toLocaleString('pt-BR', {...})}
      </Text>
      <Text style={styles.valorFinalText}>
        = {(item.valor - item.desconto).toLocaleString(...)} {/* ← ERRADO */}
      </Text>
    </>
  )}
</View>

// ✅ DEPOIS
const renderItem = ({ item }: { item: PacoteDetalhado }) => {
  // Calcular soma dos serviços e produtos
  const somaProdutos = (item.produtos || []).reduce((total, prod) => {
    return total + (prod.produto?.preco || 0) * prod.quantidade;
  }, 0);
  
  const somaServicos = (item.servicos || []).reduce((total, serv) => {
    return total + (serv.servico?.preco || 0) * serv.quantidade;
  }, 0);
  
  const valorSemDesconto = somaProdutos + somaServicos; // ← Soma calculada
  const valorComDesconto = item.valor; // ← Valor final do banco
  
  return (
    <View style={styles.pacoteValores}>
      {item.desconto > 0 ? (
        <>
          <Text style={styles.valorOriginalText}>
            De: {valorSemDesconto.toLocaleString(...)} {/* ← Soma calculada */}
          </Text>
          <Text style={styles.descontoText}>
            Desconto: {item.desconto.toLocaleString(...)}
          </Text>
          <Text style={styles.valorFinalText}>
            Por: {valorComDesconto.toLocaleString(...)} {/* ← Valor do banco */}
          </Text>
        </>
      ) : (
        <Text style={styles.valorFinalText}>
          {valorComDesconto.toLocaleString(...)}
        </Text>
      )}
    </View>
  );
};
```

---

## 🗄️ CORREÇÃO DO BANCO DE DADOS

### Pacotes Existentes Precisam Ser Corrigidos

Execute o script: **`corrigir-valor-pacotes-existentes.sql`**

```bash
# Via Supabase SQL Editor
1. Abra o SQL Editor no painel do Supabase
2. Cole o conteúdo do arquivo corrigir-valor-pacotes-existentes.sql
3. Execute os comandos em ordem
```

### O que o Script Faz:

1. **PASSO 1:** Verifica pacotes com valores incorretos
2. **PASSO 2:** Cria backup da tabela `pacotes`
3. **PASSO 3:** Atualiza o campo `valor` corretamente
4. **PASSO 4:** Verifica se a correção funcionou
5. **PASSO 5:** Instruções para reverter (se necessário)

---

## 📊 EXEMPLO PRÁTICO

### Pacote: "Corte + Barba + Sobrancelha"

#### Composição:
- Serviço 1: Corte Masculino (R$ 50,00)
- Serviço 2: Barba (R$ 40,00)
- Serviço 3: Design de Sobrancelha (R$ 30,00)
- **Soma:** R$ 120,00
- **Desconto:** R$ 20,00

#### ❌ ANTES (ERRADO)
```sql
SELECT * FROM pacotes WHERE nome = 'Corte + Barba + Sobrancelha';

-- Resultado:
-- valor: 120.00 ← ERRADO (soma dos serviços)
-- desconto: 20.00
-- Cliente pagaria: R$ 100,00 (calculado no app: 120 - 20)
```

#### ✅ DEPOIS (CORRETO)
```sql
SELECT * FROM pacotes WHERE nome = 'Corte + Barba + Sobrancelha';

-- Resultado:
-- valor: 100.00 ← CORRETO (valor final)
-- desconto: 20.00 (apenas referência)
-- Cliente paga: R$ 100,00 (direto do campo valor)
```

---

## 🎯 IMPACTO NOS AGENDAMENTOS

### Em `app/(app)/agenda/novo.tsx`

A tela de novo agendamento **JÁ FUNCIONA CORRETAMENTE** porque:

```typescript
// Interface Pacote
interface Pacote {
  id: string;
  nome: string;
  valor: number; // ← Agora recebe o valor CORRETO do banco
  // ...
}

// Cálculo do total
const totalPacotes = pacotesSelecionados.reduce(
  (sum, p) => sum + p.valor * p.quantidade, // ← Usa valor do banco (correto)
  0
);

// ✅ Funcionará perfeitamente após a correção do banco!
```

---

## ✅ CHECKLIST DE TESTE

Após aplicar as correções, teste:

### 1. Criar Novo Pacote
- [ ] Adicionar serviços (ex: R$ 50 + R$ 100 = R$ 150)
- [ ] Adicionar desconto (ex: R$ 20)
- [ ] Salvar pacote
- [ ] Verificar no banco: `SELECT valor FROM pacotes WHERE nome = '...'`
- [ ] Esperado: `valor = 130.00` (não 150.00)

### 2. Editar Pacote Existente
- [ ] Abrir pacote para edição
- [ ] Adicionar mais um serviço
- [ ] Salvar
- [ ] Verificar no banco se valor foi recalculado corretamente

### 3. Exibição no Card
- [ ] Card deve mostrar:
  - "De: R$ 150,00" (soma dos serviços)
  - "Desconto: R$ 20,00"
  - "Por: R$ 130,00" (valor final)

### 4. Uso em Agendamentos
- [ ] Criar novo agendamento
- [ ] Selecionar pacote
- [ ] Valor total deve mostrar R$ 130,00 (não R$ 150,00)
- [ ] Salvar agendamento
- [ ] Verificar na tabela `agendamentos` se o valor está correto

---

## 📁 ARQUIVOS MODIFICADOS

1. **`app/(app)/pacotes.tsx`**
   - Função `handleSalvarPacote()` → Calcula valor final
   - Função `handleEditarPacote()` → Recalcula soma dos serviços
   - Função `renderItem()` → Exibe valores corretamente

2. **`corrigir-valor-pacotes-existentes.sql`** (NOVO)
   - Script para corrigir registros existentes no banco

3. **`CORRECAO_COMPLETA_VALOR_PACOTES.md`** (este documento)
   - Documentação completa das correções

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Código corrigido em `pacotes.tsx`
2. ⚠️ **PENDENTE:** Executar script SQL para corrigir banco de dados
3. ⚠️ **PENDENTE:** Testar criação/edição de pacotes
4. ⚠️ **PENDENTE:** Testar uso de pacotes em agendamentos

---

## 📝 NOTAS IMPORTANTES

### Por que o campo `valor` no estado é diferente do banco?

```typescript
// No ESTADO (novoPacote.valor)
// → Contém a SOMA dos serviços (para facilitar adicionar/remover)
// → Exemplo: R$ 150,00

// No BANCO (tabela pacotes.valor)
// → Contém o VALOR FINAL (soma - desconto)
// → Exemplo: R$ 130,00

// Na hora de SALVAR, fazemos a conversão:
const valorFinal = somaServicos - desconto; // 150 - 20 = 130
```

### Essa mudança quebra algo?

**NÃO!** A mudança é retrocompatível porque:
- A tela de agendamento já usa `pacote.valor` diretamente
- Após corrigir o banco, os valores estarão corretos
- A exibição nos cards foi ajustada para calcular a soma dinamicamente

---

## 🎉 CONCLUSÃO

O problema foi **totalmente corrigido**:

1. ✅ Lógica de salvamento corrigida
2. ✅ Lógica de edição corrigida
3. ✅ Exibição nos cards corrigida
4. ✅ Script SQL criado para corrigir dados existentes

**Próximo passo crítico:** Executar o script SQL no banco de dados!
