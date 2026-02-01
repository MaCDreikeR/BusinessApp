# 🚀 INSTALAÇÃO RÁPIDA - Módulo de Despesas

## ✅ CHECKLIST DE INSTALAÇÃO

### 1️⃣ Instalar Dependências

```bash
# Gesture Handler (para swipe actions)
npm install react-native-gesture-handler

# Date Picker (para seleção de datas)
npx expo install @react-native-community/datetimepicker
```

### 2️⃣ Configurar Gesture Handler

Adicionar no topo de `app/_layout.tsx` (se não existir):
```typescript
import 'react-native-gesture-handler';
```

### 3️⃣ Rodar Migração do Banco

No Supabase Dashboard → SQL Editor, executar:
```
database/migrations/create_expenses_tables.sql
```

Ou via CLI:
```bash
supabase db push
```

### 4️⃣ Adicionar Permissão (Opcional)

Se sua tabela `usuarios` não tiver a coluna `pode_ver_despesas`:

```sql
ALTER TABLE usuarios 
  ADD COLUMN pode_ver_despesas BOOLEAN DEFAULT true;

UPDATE usuarios 
  SET pode_ver_despesas = true 
  WHERE role IN ('admin', 'super_admin');
```

### 5️⃣ Limpar Cache e Testar

```bash
npx expo start --clear
```

---

## 📦 ARQUIVOS CRIADOS

```
✅ types/Expense.ts                      # Modelos TypeScript
✅ services/expensesService.ts           # Lógica de negócio
✅ hooks/useExpenses.ts                  # Hook reativo
✅ components/ExpenseCard.tsx            # Card swipeable
✅ components/ExpenseForm.tsx            # Modal de formulário
✅ components/ExpenseFilters.tsx         # Componente de filtros
✅ app/(app)/despesas.tsx                # Tela principal
✅ database/migrations/create_expenses_tables.sql
✅ docs/MODULO_DESPESAS.md               # Documentação completa
```

---

## 🎯 COMO TESTAR

1. Abrir o app e fazer login
2. Menu lateral → **Despesas**
3. Tocar em "Registrar Primeira Despesa"
4. Preencher:
   - Valor: `100,50`
   - Categoria: "Energia"
   - Descrição: "Conta de luz"
   - Data: hoje
   - Pagamento: "PIX"
5. Salvar
6. Verificar cards de resumo atualizados
7. Testar filtros (período, categoria)
8. Swipe no card → Editar/Excluir

---

## 🐛 TROUBLESHOOTING

### Erro: "react-native-gesture-handler not found"
```bash
npm install react-native-gesture-handler
npx expo start --clear
```

### Erro: "DateTimePicker not found"
```bash
npx expo install @react-native-community/datetimepicker
```

### Erro: "Table despesas does not exist"
- Rodar a migração SQL no Supabase

### Cards mostram R$ 0,00
- Cadastrar pelo menos uma despesa
- Verificar se o filtro de período está correto

### Swipe não funciona
- Confirmar que `react-native-gesture-handler` foi importado no `_layout.tsx` raiz

---

## 📚 DOCUMENTAÇÃO COMPLETA

Ver arquivo: `docs/MODULO_DESPESAS.md`

---

## ✨ FEATURES IMPLEMENTADAS

✅ Cards de resumo (total, maior categoria, comparativo)  
✅ Filtros por período, categoria e pagamento  
✅ Lista swipeable (editar/excluir)  
✅ Formulário completo com validação  
✅ Skeleton loading  
✅ Estados vazios e de erro  
✅ Pull-to-refresh  
✅ FAB animado  
✅ Máscaras e formatação de moeda  
✅ Suporte a despesas recorrentes (preparado)  
✅ 12 categorias padrão pré-configuradas  
✅ RLS (segurança por estabelecimento)  

---

## 🚀 PRONTO PARA PRODUÇÃO!

O módulo está completo, testado e pronto para uso. Qualquer dúvida, consulte a documentação completa em `docs/MODULO_DESPESAS.md`.
