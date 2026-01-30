# 🧪 GUIA RÁPIDO DE TESTE - CORREÇÃO TIMEZONE

## ⚡ TESTE RÁPIDO (5 minutos)

### 1️⃣ **Preparar Ambiente**
```bash
cd /home/macdreiker/BusinessApp
npm start
# Em outro terminal:
npm run android  # ou ios
```

### 2️⃣ **Criar Agendamento de Teste**
1. Abrir app → Agenda → **"Novo Agendamento"**
2. Preencher dados:
   - Cliente: **"TESTE TIMEZONE"**
   - Data: **HOJE**
   - Hora: **19:00** ⏰
   - Serviço: Qualquer
3. Salvar ✅

### 3️⃣ **Verificar no App**
- Dashboard → **"Agendamentos de Hoje"**
- Agenda → Ver card do agendamento
- **DEVE MOSTRAR: 19:00** (não 16:00 ou 22:00)

### 4️⃣ **Verificar no Banco**
```sql
-- Copie e cole no Supabase SQL Editor
SELECT 
  cliente,
  data_hora,
  EXTRACT(HOUR FROM data_hora) as hora
FROM agendamentos
WHERE cliente = 'TESTE TIMEZONE'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado:**
```
cliente          | data_hora                      | hora
TESTE TIMEZONE   | 2026-01-29 19:00:00-03        | 19
```

---

## ✅ CHECKLIST DE SUCESSO

- [ ] App não crashou ao criar agendamento
- [ ] Dashboard mostra "19:00" (não 16:00)
- [ ] Agenda mostra "19:00" (não 16:00)
- [ ] Banco mostra `19:00:00-03` (não `22:00:00+00`)
- [ ] Hora local = 19 (não 22)

Se **TODOS** marcados → **🎉 CORREÇÃO FUNCIONANDO!**

---

## ❌ SE ALGO DEU ERRADO

### Problema: App mostra 16:00
**Causa**: Bug de renderização (ainda usa `new Date()` direto)
**Verificar**: `app/(app)/agenda.tsx` → função `parseDataHoraLocal()`

### Problema: Banco mostra 22:00
**Causa**: Bug de salvamento (ainda usa `.toISOString()`)
**Verificar**: `app/(app)/agenda/novo.tsx` → linha ~762

### Problema: App crashou
**Causa**: Erro de import
**Solução**: 
```bash
# Limpar cache
rm -rf node_modules/.cache
npm start -- --clear
```

---

## 🔍 TESTE COMPLETO (15 minutos)

### 1. **Criar Múltiplos Agendamentos**
- 08:00 → deve mostrar 08:00
- 12:00 → deve mostrar 12:00
- 15:30 → deve mostrar 15:30
- 19:00 → deve mostrar 19:00

### 2. **Testar Filtros**
- Dashboard → "Agendamentos de Hoje" → deve mostrar TODOS
- Agenda → Calendário → clicar em HOJE → deve mostrar TODOS

### 3. **Testar Notificações** (se app nativo)
- Criar agendamento para AGORA + 3 minutos
- Aguardar notificação
- Verificar se horário está correto

### 4. **Executar Script SQL Completo**
```bash
# Copiar conteúdo de: verificar-correcao-timezone.sql
# Colar no Supabase SQL Editor
# Analisar resultados
```

---

## 📊 INTERPRETANDO OS RESULTADOS

### ✅ **TUDO CERTO** se:
```
Hora criada:  19:00
Banco salva:  19:00:00-03
App exibe:    19:00
Dashboard:    19:00
Notificação:  19:00
```

### ❌ **AINDA COM BUG** se:
```
Hora criada:  19:00
Banco salva:  22:00:00+00  ← PROBLEMA: Salvando em UTC
App exibe:    16:00         ← PROBLEMA: Renderizando com conversão
```

### ⚠️ **BUG PARCIAL** se:
```
Hora criada:  19:00
Banco salva:  19:00:00-03  ← OK
App exibe:    16:00         ← PROBLEMA: Só renderização
```

---

## 🚀 COMANDOS ÚTEIS

### Limpar Cache Completo
```bash
rm -rf node_modules/.cache
rm -rf .expo
npm start -- --clear
```

### Recompilar App Nativo
```bash
npm run android  # Force reinstall
# ou
eas build --platform android --profile development
```

### Ver Logs em Tempo Real
```bash
npx react-native log-android
# ou
npx react-native log-ios
```

### Verificar Imports
```bash
grep -r "toISOString()" app/ --include="*.tsx" --include="*.ts"
# Deve retornar APENAS arquivos que NÃO lidam com data_hora
```

---

## 📱 TESTE EM PRODUÇÃO

⚠️ **ANTES DE FAZER DEPLOY**:
1. ✅ Todos os testes acima passaram
2. ✅ Criar 5 agendamentos diferentes
3. ✅ Verificar Dashboard por 10 minutos
4. ✅ Verificar Agenda por 10 minutos
5. ✅ Executar SQL de verificação

### Fazer Build de Produção
```bash
eas build --platform android --profile production
```

### Monitorar Logs (após deploy)
```bash
# Ver logs do Supabase
# Dashboard → Logs → Filtrar por "agendamentos"

# Ver erros do Sentry (se configurado)
# sentry.io → Errors → Filtrar por "timezone"
```

---

## 💡 DICAS FINAIS

1. **Sempre teste com horários variados**: 8h, 12h, 15h30, 19h, 20h30
2. **Teste mudança de dia**: Criar às 23:50, ver se aparece no dia certo
3. **Teste filtros de mês**: Verificar se agendamentos aparecem no mês correto
4. **Monitore por 24h**: Às vezes bugs aparecem só no dia seguinte

---

**Data**: 29 de Janeiro de 2026  
**Tempo estimado**: 5-15 minutos  
**Dificuldade**: ⭐⭐☆☆☆ (Fácil)
