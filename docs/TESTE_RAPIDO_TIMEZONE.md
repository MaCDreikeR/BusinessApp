# ⚡ GUIA RÁPIDO - TESTAR CORREÇÃO DE TIMEZONE

## 🎯 O QUE FOI CORRIGIDO
Agendamentos agora salvam e exibem no horário local (BRT) sem conversão UTC.

---

## ✅ TESTE RÁPIDO (5 minutos)

### 1. Criar Agendamento
```
1. Abrir app → Agenda → Novo Agendamento
2. Cliente: "Teste Timezone"
3. Data: 29/01/2026
4. Hora: 19:00
5. Salvar
```

### 2. Verificar no App
```
✅ Card deve mostrar: 19:00
✅ Lista deve mostrar: 19:00 às 19:45
✅ Dashboard deve mostrar: 19:00
```

### 3. Verificar no Banco
```sql
SELECT 
    cliente,
    data_hora::text,
    TO_CHAR(data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora_brt
FROM agendamentos
WHERE cliente = 'Teste Timezone'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
cliente        | data_hora                      | hora_brt
---------------|--------------------------------|----------
Teste Timezone | 2026-01-29 19:00:00-03        | 19:00
```

---

## 🔍 VERIFICAÇÃO AUTOMÁTICA

```bash
# Executar script de testes
bash testar-correcao-timezone.sh
```

**Resultado esperado:** ✅ 10/10 testes passando

---

## 📚 DOCUMENTAÇÃO COMPLETA

1. **CORRECAO_CONCLUIDA.md** - Resumo executivo
2. **ANTES_DEPOIS_TIMEZONE_VISUAL.md** - Comparação visual
3. **CORRECAO_TIMEZONE_COMPLETA_FINAL.md** - Documentação técnica completa

---

## ⚠️ SE ALGO DER ERRADO

### Problema: Ainda mostra horário errado
```bash
# Limpar cache e reiniciar
./limpar-cache-app.sh
npx expo start --clear
```

### Problema: Erro ao salvar
```bash
# Verificar se imports estão corretos
grep -r "import.*timezone" app/
```

### Problema: Agendamentos antigos
```sql
-- Agendamentos antigos não têm offset
-- Mas parseISOStringLocal() já trata isso!
SELECT 
    data_hora::text,
    CASE 
        WHEN data_hora::text LIKE '%-%' THEN 'Novo formato ✅'
        ELSE 'Formato antigo (OK também!)'
    END as status
FROM agendamentos
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎉 RESULTADO ESPERADO

```
Criar às 19:00
    ↓
Banco: 19:00-03:00 ✅
    ↓
Exibe: 19:00 ✅
    ↓
CORRETO! 🎉
```

---

## 📞 SUPORTE

Se encontrar qualquer problema:
1. Ver logs: `npx expo start`
2. Verificar imports: `grep -r "timezone" app/`
3. Testar query SQL acima
4. Revisar documentação completa

---

**Última atualização:** 29/01/2026 15:50 BRT
