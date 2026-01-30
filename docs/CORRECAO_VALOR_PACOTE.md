# 🐛 Correção: Modal de Pacotes Vazio e Valor Incorreto

## 📋 Problemas Identificados

### 1. ❌ Modal de Pacotes Vazio
**Sintoma:** Ao clicar em "Pacotes", o modal abre mas não mostra nenhum pacote

**Causa:** O modal está funcionando, mas:
- `todosPacotes` pode estar vazio
- Query pode não estar retornando dados
- Faltava validação de `estabelecimentoId`

**Solução Aplicada:**
```typescript
const carregarPacotes = async () => {
  try {
    logger.debug('Iniciando carregamento de pacotes...', { estabelecimentoId });
    
    // ✅ Validação adicionada
    if (!estabelecimentoId) {
      logger.warn('estabelecimentoId não disponível para carregar pacotes');
      return;
    }
    
    // ✅ Logs detalhados
    logger.debug('Executando query de pacotes...');
    
    const { data, error } = await supabase
      .from('pacotes')
      .select(...)
      .eq('estabelecimento_id', estabelecimentoId);
    
    // ✅ Log de sucesso
    logger.debug('Pacotes carregados:', { 
      quantidade: data?.length || 0,
      pacotes: data 
    });
    
    setTodosPacotes(data || []);
  } catch (error) {
    logger.error('Erro ao carregar pacotes:', error);
  }
};
```

**Melhorias no Modal:**
```typescript
<ScrollView style={styles.modalScrollView}>
  {buscandoPacotes ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator />
      <Text>Carregando pacotes...</Text>
    </View>
  ) : todosPacotes.length === 0 ? (
    // ✅ Mensagem quando não há pacotes
    <View style={styles.loadingContainer}>
      <Text>Nenhum pacote cadastrado</Text>
    </View>
  ) : (
    // Renderiza pacotes normalmente
  )}
</ScrollView>
```

---

### 2. ❌ Valor do Pacote Mostrando Soma dos Serviços

**Sintoma:** 
- Pacote "Perna+axila" mostra **R$ 150,00** (soma: R$ 50 + R$ 100)
- Deveria mostrar **R$ 130,00** (valor com desconto de R$ 20)

**Causa:** O campo `pacotes.valor` no banco de dados está com o valor ERRADO

**Onde está o problema:**

```
TABELA: pacotes
┌────────────┬────────┬──────────┬──────────────┐
│ nome       │ valor  │ desconto │ ESPERADO     │
├────────────┼────────┼──────────┼──────────────┤
│ Perna+axila│ 150.00 │ 20       │ 130.00       │
│            │   ❌   │          │   ✅         │
└────────────┴────────┴──────────┴──────────────┘

SERVIÇOS DO PACOTE:
┌──────────────┬────────┬────────────┬──────────┐
│ Serviço      │ Preço  │ Quantidade │ Subtotal │
├──────────────┼────────┼────────────┼──────────┤
│ Axila        │  50.00 │     1      │   50.00  │
│ Perna Compl. │ 100.00 │     1      │  100.00  │
├──────────────┴────────┴────────────┼──────────┤
│ SOMA DOS SERVIÇOS:                 │  150.00  │
│ DESCONTO: R$ 20,00 (13,33%)        │ - 20.00  │
│ VALOR FINAL DO PACOTE:             │  130.00  │
└────────────────────────────────────┴──────────┘
```

---

## 🔧 Solução: Corrigir Valor no Banco de Dados

### **Opção 1: Correção Manual (Recomendado)**

Execute no **SQL Editor do Supabase**:

```sql
-- 1. Verificar o pacote atual
SELECT 
  id, 
  nome, 
  valor AS valor_atual,
  desconto,
  (
    SELECT SUM(s.preco * ps.quantidade)
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = pacotes.id
  ) AS soma_servicos,
  (
    SELECT SUM(s.preco * ps.quantidade)
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = pacotes.id
  ) - desconto AS valor_correto
FROM pacotes
WHERE nome = 'Perna+axila';

-- 2. Corrigir o valor do pacote
UPDATE pacotes
SET valor = 130.00  -- R$ 150 (soma) - R$ 20 (desconto) = R$ 130
WHERE nome = 'Perna+axila';

-- 3. Confirmar correção
SELECT 
  nome, 
  valor AS valor_corrigido,
  desconto
FROM pacotes
WHERE nome = 'Perna+axila';
```

### **Opção 2: Calcular Automaticamente**

Se o desconto for em **PERCENTUAL**:

```sql
UPDATE pacotes p
SET valor = (
  SELECT SUM(s.preco * ps.quantidade) * (1 - p.desconto / 100.0)
  FROM pacotes_servicos ps
  JOIN servicos s ON s.id = ps.servico_id
  WHERE ps.pacote_id = p.id
)
WHERE nome = 'Perna+axila';
```

Se o desconto for em **VALOR FIXO** (R$ 20,00):

```sql
UPDATE pacotes p
SET valor = (
  SELECT SUM(s.preco * ps.quantidade) - p.desconto
  FROM pacotes_servicos ps
  JOIN servicos s ON s.id = ps.servico_id
  WHERE ps.pacote_id = p.id
)
WHERE nome = 'Perna+axila';
```

---

## 📊 Verificação Final

Após executar a correção, execute este script para verificar:

```sql
-- Verificar todos os pacotes
SELECT 
  p.nome,
  p.valor AS valor_pacote,
  p.desconto,
  p.duracao_total,
  (
    SELECT SUM(s.preco * ps.quantidade)
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = p.id
  ) AS soma_servicos,
  (
    SELECT json_agg(
      json_build_object(
        'nome', s.nome,
        'preco', s.preco,
        'quantidade', ps.quantidade,
        'subtotal', s.preco * ps.quantidade
      )
    )
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = p.id
  ) AS servicos
FROM pacotes p
ORDER BY p.created_at DESC;
```

**Resultado Esperado:**
```
nome: Perna+axila
valor_pacote: 130.00  ← ✅ CORRETO
desconto: 20
duracao_total: 45
soma_servicos: 150.00
servicos: [
  { nome: "Axila", preco: 50, quantidade: 1, subtotal: 50 },
  { nome: "Perna Completa", preco: 100, quantidade: 1, subtotal: 100 }
]
```

---

## 🎯 Como o Código Funciona (Após Correção)

### **1. Query Busca o Valor Correto**
```typescript
const { data, error } = await supabase
  .from('pacotes')
  .select(`
    *,           // ← Inclui 'valor' que deve estar correto no banco
    servicos:pacotes_servicos(...)
  `)
```

### **2. Modal Exibe o Valor do Banco**
```tsx
<Text style={styles.modalServicoPreco}>
  R$ {pacote.valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2 
  })}
</Text>
// Se pacote.valor = 130.00 → Mostra "R$ 130,00" ✅
// Se pacote.valor = 150.00 → Mostra "R$ 150,00" ❌
```

### **3. Seleção Usa o Valor Correto**
```typescript
// Ao selecionar o pacote
setPacotesSelecionados([...pacotesSelecionados, { ...pacote, quantidade: 1 }]);

// Cálculo do total
const totalPacotes = pacotesSelecionados.reduce(
  (sum, p) => sum + (p.valor * p.quantidade), // ← Usa p.valor (130.00)
  0
);
```

---

## 🔍 Como Identificar o Problema

### **Logs para Depuração:**

1. **Ao carregar pacotes:**
```
🔍 Iniciando carregamento de pacotes... { estabelecimentoId: "..." }
🔍 Executando query de pacotes...
✅ Pacotes carregados: { 
  quantidade: 1,
  pacotes: [{ 
    nome: "Perna+axila", 
    valor: 150.00,  ← ❌ ESTE É O PROBLEMA!
    desconto: 20 
  }]
}
```

2. **Ao renderizar no modal:**
```
🔍 Renderizando pacote: {
  nome: "Perna+axila",
  valor: 150.00,  ← ❌ Deveria ser 130.00
  duracao_total: 45
}
```

3. **Ao selecionar:**
```
🔍 Pacote selecionado: {
  id: "...",
  nome: "Perna+axila",
  valor: 150.00,  ← ❌ Vai calcular errado!
  quantidade: 1
}
```

---

## ✅ Checklist de Correção

- [ ] Executar `verificar-valor-pacote.sql` no Supabase
- [ ] Verificar se `valor` está incorreto (150 em vez de 130)
- [ ] Executar UPDATE para corrigir valor (130.00)
- [ ] Limpar cache do app (fechar e reabrir)
- [ ] Testar no app:
  - [ ] Abrir modal de pacotes
  - [ ] Verificar se mostra "R$ 130,00"
  - [ ] Selecionar pacote
  - [ ] Verificar total (deve ser 130.00)

---

## 📝 Importante

### **Onde NÃO Deve Calcular:**
- ❌ No front-end ao carregar pacotes
- ❌ No modal de seleção
- ❌ Ao adicionar ao agendamento

### **Onde Deve Estar Correto:**
- ✅ **No banco de dados** (campo `pacotes.valor`)
- ✅ Atualizado quando pacote é criado/editado
- ✅ Campo `desconto` apenas para referência

### **Regra:**
```
pacotes.valor = VALOR FINAL JÁ COM DESCONTO
```

**Não faça:**
```typescript
const valorFinal = somarServicos(pacote) - pacote.desconto; ❌
```

**Faça:**
```typescript
const valorFinal = pacote.valor; ✅
```

---

## 🚀 Após Correção

1. **Reiniciar o app** para limpar cache
2. **Abrir modal de pacotes**
3. **Verificar** que mostra:
   ```
   Perna+axila
   R$ 130,00  ← ✅ CORRETO!
   ⏱️ 45 min
   📦 2 serviço(s) incluído(s)
   ```

4. **Selecionar pacote**
5. **Verificar exibição:**
   ```
   Pacotes:
   • Perna+axila (1x) - R$ 130,00
   
   Valor Total: R$ 130,00
   ```

---

**Data:** 29 de janeiro de 2026  
**Status:** ✅ **Código corrigido - Aguardando correção no banco de dados**
