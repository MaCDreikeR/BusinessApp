# Implementação de Duração nos Pacotes

## 📋 Resumo

Implementação completa do campo de duração nos pacotes, calculando automaticamente a soma das durações dos serviços incluídos no pacote.

## ✅ Implementação Realizada

### 1. **Interfaces TypeScript** (`types/index.ts`)

#### Interface `Pacote`
```typescript
export interface Pacote {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  desconto: number;
  duracao_total?: number; // ✨ NOVO: duração total calculada em minutos
  validade_dias?: number;
  ativo?: boolean;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}
```

#### Interface `ServicoPacote`
```typescript
export interface ServicoPacote {
  id: string;
  pacote_id: string;
  servico_id: string;
  servico_nome?: string;
  servico_duracao?: number; // ✨ NOVO: duração do serviço em minutos
  quantidade: number;
  created_at?: string;
}
```

### 2. **Query Supabase** (`app/(app)/pacotes.tsx`)

#### Busca de Serviços com Duração
```typescript
const { data, error } = await supabase
  .from('servicos')
  .select('id, nome, preco, duracao') // ✨ incluindo duracao
  .eq('estabelecimento_id', estabelecimentoId)
  .order('nome');
```

#### Busca de Pacotes com Duração dos Serviços
```sql
servicos:pacotes_servicos(
  quantidade,
  servico:servicos(
    id,
    nome,
    preco,
    duracao  -- ✨ NOVO
  )
)
```

### 3. **Cálculo Automático da Duração Total**

```typescript
// Função para calcular duração total do pacote
const calcularDuracaoTotal = (servicos: any[]): number | undefined => {
  if (!servicos || servicos.length === 0) return undefined;
  
  let duracaoTotal = 0;
  let temDuracao = false;
  
  for (const s of servicos) {
    if (s.servico?.duracao) {
      duracaoTotal += s.servico.duracao * (s.quantidade || 1);
      temDuracao = true;
    }
  }
  
  return temDuracao ? duracaoTotal : undefined;
};
```

#### Lógica de Cálculo
- **Se nenhum serviço tem duração:** retorna `undefined`
- **Se pelo menos um serviço tem duração:** soma as durações
- **Fórmula:** `duracao_servico * quantidade` para cada serviço
- **Exemplo:**
  - Serviço A: 30 min × 2 = 60 min
  - Serviço B: 45 min × 1 = 45 min
  - **Total:** 105 minutos

### 4. **Interface do Usuário**

#### Lista de Serviços no Modal de Edição/Criação
```tsx
{novoPacote.servicos.map((servico, index) => (
  <View key={servico.id} style={styles.itemLista}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNome}>{servico.servico?.nome}</Text>
      <Text style={styles.itemQuantidade}>Qtd: {servico.quantidade}</Text>
      {/* ✨ NOVO: Exibe duração do serviço */}
      {servico.servico?.duracao && (
        <Text style={styles.itemDuracao}>
          ⏱️ {servico.servico.duracao * servico.quantidade} min
        </Text>
      )}
      <Text style={styles.itemPreco}>R$ {valor}</Text>
    </View>
  </View>
))}
```

#### Card de Pacote na Lista Principal
```tsx
{item.servicos.map((servico) => (
  <View key={servico.id} style={styles.itemListaCompacto}>
    <View style={styles.itemInfoCompacto}>
      <Text style={styles.itemNomeCompacto}>
        {servico.servico?.nome} (x{servico.quantidade})
      </Text>
      {/* ✨ NOVO: Duração individual do serviço */}
      {servico.servico?.duracao && (
        <Text style={styles.itemDuracaoCompacto}>
          ⏱️ {servico.servico.duracao * servico.quantidade} min
        </Text>
      )}
    </View>
    <Text style={styles.itemPrecoCompacto}>R$ {valor}</Text>
  </View>
))}

{/* ✨ NOVO: Duração total do pacote */}
{item.duracao_total && (
  <View style={styles.duracaoTotalContainer}>
    <Text style={styles.duracaoTotalText}>
      ⏱️ Duração total: {item.duracao_total} minutos
    </Text>
  </View>
)}
```

### 5. **Estilos CSS**

```typescript
itemInfoCompacto: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
itemDuracaoCompacto: {
  fontSize: 12,
  color: colors.textTertiary,
  fontStyle: 'italic',
},
itemDuracao: {
  fontSize: 12,
  color: colors.textTertiary,
  fontStyle: 'italic',
  marginTop: 2,
},
duracaoTotalContainer: {
  marginTop: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  alignItems: 'flex-end',
},
duracaoTotalText: {
  fontSize: 13,
  fontWeight: '600',
  color: theme.colors.primary,
},
```

### 6. **Migration SQL** (`supabase/migrations/20260129_add_duracao_to_pacotes.sql`)

```sql
-- Adicionar coluna duracao_total à tabela pacotes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pacotes' 
    AND column_name = 'duracao_total'
  ) THEN
    ALTER TABLE pacotes 
    ADD COLUMN duracao_total INTEGER;
    
    COMMENT ON COLUMN pacotes.duracao_total IS 
      'Duração total do pacote em minutos (soma das durações dos serviços)';
  END IF;
END $$;
```

## 🎯 Características

### ✅ Totalmente Opcional
- Pacotes sem serviços com duração: `duracao_total = undefined`
- Pacotes com serviços: cálculo automático
- Serviços sem duração são ignorados no cálculo

### ✅ Cálculo Automático
- Duração calculada ao carregar os pacotes
- Não requer entrada manual
- Atualiza automaticamente ao adicionar/remover serviços

### ✅ Interface Clara
- Ícone ⏱️ para identificar durações
- Duração individual por serviço (considerando quantidade)
- Duração total destacada no final da lista de serviços

### ✅ Consistente com Serviços
- Segue o mesmo padrão de duração dos serviços
- Mesma unidade (minutos)
- Mesmo comportamento (NULL quando não informado)

## 📊 Fluxo de Dados

```
1. Serviços têm duração opcional (30, 45, 60 minutos, etc.)
   ↓
2. Pacote inclui serviços com quantidade (2x Corte, 1x Barba)
   ↓
3. Ao carregar pacote:
   - Busca duracao de cada serviço
   - Calcula: duracao × quantidade
   - Soma todas as durações
   ↓
4. Exibe na interface:
   - Duração individual: "⏱️ 60 min" (30 × 2)
   - Duração individual: "⏱️ 45 min" (45 × 1)
   - Duração total: "⏱️ Duração total: 105 minutos"
```

## 🔄 Exemplos

### Exemplo 1: Pacote Completo
```
Pacote: "Dia do Noivo"
├─ Serviços:
│  ├─ Corte de Cabelo (30 min) × 1 = 30 min
│  ├─ Barba (20 min) × 1 = 20 min
│  └─ Hidratação (45 min) × 1 = 45 min
└─ Duração Total: 95 minutos
```

### Exemplo 2: Pacote com Serviço Sem Duração
```
Pacote: "Especial Casal"
├─ Serviços:
│  ├─ Corte Feminino (60 min) × 1 = 60 min
│  ├─ Corte Masculino (30 min) × 1 = 30 min
│  └─ Maquiagem (SEM duração) × 1 = ignorado
└─ Duração Total: 90 minutos
```

### Exemplo 3: Pacote Só com Produtos
```
Pacote: "Kit Produtos"
├─ Produtos:
│  ├─ Shampoo × 2
│  └─ Condicionador × 2
└─ Duração Total: (não exibida - sem serviços)
```

## 📁 Arquivos Modificados

1. **`types/index.ts`**
   - Interface `Pacote`: campo `duracao_total?`
   - Interface `ServicoPacote`: campo `servico_duracao?`

2. **`app/(app)/pacotes.tsx`**
   - Types locais atualizados com duracao
   - Query Supabase incluindo duracao dos serviços
   - Função `calcularDuracaoTotal()`
   - Formatação de pacotes com cálculo de duração
   - UI: exibição de durações individuais e total
   - Estilos: novos estilos para durações

3. **`supabase/migrations/20260129_add_duracao_to_pacotes.sql`**
   - Nova migration criada
   - Coluna `duracao_total INTEGER` (nullable)

## 🧪 Testes Necessários

### Testes de Cálculo
- [ ] Pacote com 1 serviço com duração
- [ ] Pacote com múltiplos serviços com duração
- [ ] Pacote com serviço quantidade > 1
- [ ] Pacote com mix de serviços (com e sem duração)
- [ ] Pacote sem serviços
- [ ] Pacote só com produtos

### Testes de Interface
- [ ] Duração exibida corretamente no modal
- [ ] Duração exibida corretamente no card
- [ ] Duração total atualiza ao adicionar serviço
- [ ] Duração total atualiza ao remover serviço
- [ ] Duração total não aparece quando não aplicável

### Testes de Banco
- [ ] Migration executa sem erros
- [ ] Coluna é nullable
- [ ] Pacotes existentes não são afetados
- [ ] Pacotes novos podem ter duracao_total

## 📝 Próximos Passos

1. **Executar Migration**
   ```bash
   # No painel do Supabase ou via CLI
   psql -U postgres -d businessapp -f supabase/migrations/20260129_add_duracao_to_pacotes.sql
   ```

2. **Testar Fluxo Completo**
   - Criar serviços com duração
   - Criar pacote incluindo esses serviços
   - Verificar cálculo e exibição

3. **Persistir Duração Total (Opcional)**
   - Atualmente: calculado dinamicamente
   - Futuro: pode salvar no banco ao criar/editar pacote
   - Vantagem: performance em queries grandes

## 🎉 Conclusão

A implementação de duração nos pacotes está **COMPLETA** e segue o mesmo padrão dos serviços:
- ✅ Campo opcional
- ✅ Cálculo automático
- ✅ Interface clara
- ✅ Migration criada
- ✅ Documentação completa

O sistema agora calcula automaticamente a duração total dos pacotes baseado nas durações dos serviços incluídos, respeitando as quantidades configuradas.
