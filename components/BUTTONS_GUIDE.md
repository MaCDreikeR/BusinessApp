# Guia de Uso: Componentes de Botões Padronizados

Este documento descreve os componentes de botões disponíveis no BusinessApp e quando usar cada um.

## 🎯 Regra de Ouro: Padronização de Botões de Tipo de Item

**TODOS os botões de tipo de item (Produto, Serviço, Pacote) devem usar `SelectionButton`**

| Tela | Componente | Status |
|------|------------|--------|
| ✅ Agenda | SelectionButton | Padronizado |
| ✅ Pacotes | SelectionButton | Padronizado |
| ✅ Comandas | SelectionButton | Padronizado |
| ✅ Orçamentos | SelectionButton | Padronizado |

**Por quê?**
- **Aparência idêntica** em todas as telas
- **Comportamento consistente** para mesma funcionalidade
- **Fácil manutenção** - mudança em um lugar afeta tudo

---

## 📦 Componentes Disponíveis

### 1. **Button** (`Button2.tsx`)
Botão principal do sistema, usado para ações gerais.

**Quando usar:**
- Botões de "Salvar", "Cancelar", "Confirmar"
- Ações principais em modais e formulários
- Botões de navegação

**Variantes:**
- `primary` - Ação principal (roxo)
- `secondary` - Ação secundária (cinza com borda)
- `outline` - Contornado (transparente com borda roxa)
- `ghost` - Sem fundo (apenas texto roxo)
- `danger` - Ação destrutiva (vermelho)

**Tamanhos:**
- `small` - Botões compactos
- `medium` - Padrão (recomendado)
- `large` - Destaque

**Exemplo:**
```tsx
import { Button } from '@/components/Button2';

<Button 
  variant="primary" 
  size="large" 
  icon="save-outline"
  onPress={handleSalvar}
>
  Salvar
</Button>
```

---

### 2. **SelectionButton** (`Buttons.tsx`)
**🎯 COMPONENTE ÚNICO PADRONIZADO PARA TODOS OS BOTÕES DE TIPO DE ITEM**

**Quando usar:**
- ✅ Adicionar/Selecionar Produtos
- ✅ Adicionar/Selecionar Serviços  
- ✅ Adicionar/Selecionar Pacotes
- ✅ Selecionar Cliente
- ✅ Qualquer botão que abre modal para seleção de itens

**⚠️ IMPORTANTE:**
- TODAS as telas (Agenda, Pacotes, Comandas, Orçamentos) usam SelectionButton
- Garante aparência visual IDÊNTICA em todo o app
- Funcionalidades opcionais (contador e valor podem ser omitidos)

**Recursos:**
- ✅ Mostra contador de selecionados
- ✅ Muda cor quando selecionado
- ✅ Pode mostrar valor total
- ✅ Ícone customizável

**Exemplo:**
```tsx
import { SelectionButton } from '@/components/Buttons';

<SelectionButton 
  label="Adicionar Produtos" 
  icon="cube-outline"
  count={produtosSelecionados.length}
  selected={produtosSelecionados.length > 0}
  value={valorTotalProdutos}
  onPress={handleMostrarModalProdutos}
/>
```

**Casos de uso:**
- ✅ Novo Pacote → Adicionar Produtos/Serviços
- ✅ Nova Comanda → Adicionar Itens
- ✅ Novo Agendamento → Selecionar Serviços/Pacotes
- ✅ Novo Orçamento → Adicionar Itens

---

### 3. **ItemButton** (`Buttons.tsx`)
Botão para item de lista/modal (clicável).

**Quando usar:**
- Listas de seleção em modais
- Cards de produtos, serviços, clientes
- Opções selecionáveis

**Recursos:**
- ✅ Destaque visual quando selecionado
- ✅ Suporta título, subtítulo e valor
- ✅ Ícone opcional
- ✅ Checkmark quando selecionado

**Exemplo:**
```tsx
import { ItemButton } from '@/components/Buttons';

<ItemButton
  title="Corte de Cabelo"
  subtitle="30 minutos"
  value="R$ 50,00"
  icon="cut-outline"
  selected={servicosSelecionados.includes(servico.id)}
  onPress={() => handleSelecionarServico(servico)}
/>
```

**Casos de uso:**
- ✅ Modal de seleção de serviços
- ✅ Modal de seleção de produtos
- ✅ Lista de clientes
- ✅ Lista de pacotes

---

### 4. **ActionButton** (`Buttons.tsx`)
Botão compacto para ações rápidas em headers e toolbars.

**⚠️ NÃO USE PARA BOTÕES DE TIPO DE ITEM - Use SelectionButton**

**Quando usar:**
- Cabeçalhos de tela
- Toolbars
- Ações rápidas em cards
- Filtros

**Quando NÃO usar:**
- ❌ Botões de Produto, Serviço, Pacote (use SelectionButton)
- ❌ Qualquer botão que abre modal de seleção (use SelectionButton)

**Variantes:**
- `primary` - Ação principal (fundo colorido)
- `secondary` - Ação secundária (fundo surface)
- `outline` - Contornado

**Exemplo - Filtro em header:**
```tsx
import { ActionButton } from '@/components/Buttons';

<ActionButton 
  label="Filtrar"
  icon="filter-outline"
  variant="outline"
  onPress={handleFiltrar}
/>
```

---

### 5. **AddItemButton** (`Buttons.tsx`)
Botão para adicionar novo item em listas.

**Quando usar:**
- Adicionar nova categoria
- Adicionar nova forma de pagamento
- Adicionar novo campo dinamicamente

**Variantes:**
- `default` - Botão com fundo cinza
- `inline` - Sem fundo (inline com texto)
- `full` - Largura total

**Exemplo:**
```tsx
import { AddItemButton } from '@/components/Buttons';

<AddItemButton 
  label="Adicionar Categoria" 
  variant="full"
  onPress={handleAdicionarCategoria}
/>
```

---

## 🎨 Padronização por Tela

### **Novo Pacote / Editar Pacote**

```tsx
// Adicionar Produtos
<SelectionButton 
  label="Adicionar Produtos" 
  icon="cube-outline"
  count={produtosSelecionados.length}
  selected={produtosSelecionados.length > 0}
  value={valorTotalProdutos}
  onPress={handleMostrarModalProdutos}
/>

// Adicionar Serviços
<SelectionButton 
  label="Adicionar Serviços" 
  icon="cut-outline"
  count={servicosSelecionados.length}
  selected={servicosSelecionados.length > 0}
  value={valorTotalServicos}
  onPress={handleMostrarModalServicos}
/>
```

### **Nova Comanda**

```tsx
// Selecionar Cliente
<SelectionButton 
  label="Selecionar Cliente" 
  icon="person-outline"
  selected={!!selectedCliente}
  onPress={handleMostrarModalClientes}
/>

// Adicionar Itens
<SelectionButton 
  label="Adicionar Itens" 
  icon="add-circle-outline"
  count={itensComanda.length}
  selected={itensComanda.length > 0}
  value={valorTotalItens}
  onPress={handleMostrarModalItens}
/>
```

### **Novo Agendamento**

```tsx
// Selecionar Serviços
<SelectionButton 
  label="Serviços" 
  icon="cut-outline"
  count={servicosSelecionados.length}
  selected={servicosSelecionados.length > 0}
  value={valorServicos}
  onPress={abrirModalServicos}
/>

// Selecionar Pacotes
<SelectionButton 
  label="Pacotes" 
  icon="gift-outline"
  count={pacotesSelecionados.length}
  selected={pacotesSelecionados.length > 0}
  value={valorPacotes}
  onPress={abrirModalPacotes}
/>
```

### **Modais de Seleção**

```tsx
// Lista de serviços para selecionar
{servicos.map(servico => (
  <ItemButton
    key={servico.id}
    title={servico.nome}
    subtitle={servico.duracao ? `${servico.duracao} min` : undefined}
    value={`R$ ${servico.preco.toFixed(2)}`}
    icon="cut-outline"
    selected={servicosSelecionados.includes(servico.id)}
    onPress={() => handleSelecionarServico(servico)}
  />
))}
```

---

## ✅ Checklist de Migração

Para atualizar uma tela existente:

1. [ ] Importar componentes de `@/components/Buttons`
2. [ ] Substituir `Button variant="outline" icon="add-circle-outline"` por `SelectionButton`
3. [ ] Substituir cards clicáveis por `ItemButton`
4. [ ] Adicionar contadores de selecionados quando aplicável
5. [ ] Adicionar valores totais quando aplicável
6. [ ] Testar interações e visual no dispositivo

---

## 🚀 Benefícios

✅ **Consistência** - Mesma aparência em todo o app  
✅ **Manutenibilidade** - Mudanças em um lugar refletem em todos  
✅ **Produtividade** - Menos código para escrever  
✅ **UX** - Comportamento previsível para o usuário  
✅ **Acessibilidade** - Estados visuais claros (selecionado, desabilitado)

---

## 📝 Notas

- Todos os botões suportam `style` prop para customização quando necessário
- Use cores do tema (`colors`) ao invés de valores hardcoded
- Ícones devem ser do Ionicons
- Mantenha labels curtas e descritivas
