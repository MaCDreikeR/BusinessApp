# ✅ CHECKLIST: Tornar Despesas Visível no Menu

## 🔍 VERIFICAÇÃO RÁPIDA

### 1. Rota já está configurada ✅
Arquivo: `app/(app)/_layout.tsx`
```typescript
<Drawer.Screen
  name="despesas"
  options={{
    title: 'Despesas',
    drawerIcon: ({ color }) => (
      <FontAwesome5 name="wallet" size={20} color={color} />
    ),
    headerShown: false,
    drawerItemStyle: { display: permissions.pode_ver_despesas ? 'flex' : 'none' },
  }}
/>
```

### 2. Permissão já está no hook ✅
Arquivo: `hooks/usePermissions.ts`
```typescript
pode_ver_despesas: true, // Padrão ativado
pode_editar_despesas: true,
```

### 3. Executar SQL no Supabase 🔧

Copiar e executar no **Supabase Dashboard → SQL Editor**:

```sql
-- Adicionar colunas de permissão (se não existirem)
ALTER TABLE usuarios 
  ADD COLUMN IF NOT EXISTS pode_ver_despesas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_despesas BOOLEAN DEFAULT true;

-- Ativar permissão para todos os usuários existentes
UPDATE usuarios 
SET 
  pode_ver_despesas = true,
  pode_editar_despesas = CASE 
    WHEN role IN ('admin', 'super_admin') THEN true 
    ELSE false 
  END;

-- Verificar resultado
SELECT 
  id,
  nome_completo,
  role,
  pode_ver_despesas,
  pode_editar_despesas
FROM usuarios 
ORDER BY role, nome_completo;
```

### 4. Limpar cache do app 🔄

```bash
npx expo start --clear
```

### 5. Testar no app 📱

1. Fazer logout (se estiver logado)
2. Fazer login novamente
3. Abrir menu lateral
4. Verificar se "Despesas" aparece com ícone 💰

---

## 🐛 SE NÃO APARECER

### Opção A: Forçar permissão no código (temporário)

Editar `hooks/usePermissions.ts` linha ~76:
```typescript
pode_ver_despesas: true, // Já está true por padrão
```

### Opção B: Debug no console

Adicionar na tela de despesas:
```typescript
console.log('Permissões:', permissions);
console.log('pode_ver_despesas:', permissions.pode_ver_despesas);
```

### Opção C: Verificar no Supabase

```sql
-- Ver permissões do usuário logado
SELECT 
  u.email,
  u.role,
  u.pode_ver_despesas,
  u.pode_editar_despesas
FROM usuarios u
WHERE u.email = 'seu-email@exemplo.com';
```

---

## ✅ VERIFICAÇÃO FINAL

Depois de executar o SQL e limpar o cache:

- [ ] Menu lateral mostra "Despesas" 💰
- [ ] Ao clicar, abre a tela de despesas
- [ ] Cards de resumo aparecem
- [ ] Botão FAB (+) está visível
- [ ] Pode criar nova despesa

**Status:** Tudo configurado! Basta executar o SQL e recarregar o app. 🚀
