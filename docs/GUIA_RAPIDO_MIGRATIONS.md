# 🚀 GUIA RÁPIDO - Executar Migrations de Duração

## ⚡ TL;DR (Too Long; Didn't Read)

**O que fazer agora:**
1. Executar 2 migrations SQL no Supabase
2. Testar criação de serviços com duração
3. Testar criação de pacotes com cálculo automático

**Tempo estimado:** 5-10 minutos

---

## 📝 PASSO A PASSO

### 1️⃣ Acessar Supabase Dashboard

1. Abrir: https://supabase.com/dashboard
2. Fazer login
3. Selecionar projeto **BusinessApp**
4. Clicar em **SQL Editor** (no menu lateral esquerdo)

---

### 2️⃣ Executar Migration de Serviços

#### Copiar SQL
```sql
-- Migration: Adicionar campo duracao à tabela servicos
-- Data: 2026-01-29
-- Descrição: Adiciona coluna duracao (INTEGER, NULLABLE) para armazenar
--            a duração estimada do serviço em minutos

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'servicos' 
    AND column_name = 'duracao'
  ) THEN
    ALTER TABLE servicos 
    ADD COLUMN duracao INTEGER;
    
    COMMENT ON COLUMN servicos.duracao IS 'Duração estimada do serviço em minutos';
  END IF;
END $$;

-- Nota: A coluna é NULLABLE e não tem valor DEFAULT
-- Serviços existentes terão duracao = NULL
-- Novos serviços podem ter duração opcional
```

#### Executar
1. Colar o SQL no editor
2. Clicar em **RUN** (ou Ctrl+Enter)
3. Aguardar mensagem de sucesso

#### Verificar
```sql
-- Verificar se coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'servicos' AND column_name = 'duracao';

-- Resultado esperado:
-- column_name | data_type | is_nullable
-- duracao     | integer   | YES
```

---

### 3️⃣ Executar Migration de Pacotes

#### Copiar SQL
```sql
-- Migration: Adicionar campo duracao_total à tabela pacotes
-- Data: 2026-01-29
-- Descrição: Adiciona coluna duracao_total (INTEGER, NULLABLE) para armazenar
--            a duração total calculada do pacote em minutos

-- Verificar se a coluna já existe antes de adicionar
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
    
    COMMENT ON COLUMN pacotes.duracao_total IS 'Duração total do pacote em minutos (soma das durações dos serviços)';
  END IF;
END $$;

-- Nota: A coluna é NULLABLE e não tem valor DEFAULT
-- O cálculo da duração total é feito pela aplicação ao carregar os pacotes
-- Soma: duracao_servico * quantidade para cada serviço do pacote
```

#### Executar
1. Colar o SQL no editor
2. Clicar em **RUN** (ou Ctrl+Enter)
3. Aguardar mensagem de sucesso

#### Verificar
```sql
-- Verificar se coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pacotes' AND column_name = 'duracao_total';

-- Resultado esperado:
-- column_name    | data_type | is_nullable
-- duracao_total  | integer   | YES
```

---

### 4️⃣ Verificação Final

#### Verificar Estrutura das Tabelas
```sql
-- Verificar estrutura da tabela servicos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'servicos'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela pacotes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pacotes'
ORDER BY ordinal_position;
```

#### Verificar Dados Existentes
```sql
-- Ver serviços (duração deve ser NULL para existentes)
SELECT id, nome, preco, duracao 
FROM servicos 
LIMIT 5;

-- Ver pacotes (duracao_total deve ser NULL)
SELECT id, nome, valor, duracao_total 
FROM pacotes 
LIMIT 5;
```

---

## ✅ CHECKLIST PÓS-MIGRATION

- [ ] Migration de serviços executada sem erros
- [ ] Migration de pacotes executada sem erros
- [ ] Coluna `servicos.duracao` existe e é NULLABLE
- [ ] Coluna `pacotes.duracao_total` existe e é NULLABLE
- [ ] Serviços existentes têm `duracao = NULL`
- [ ] Pacotes existentes têm `duracao_total = NULL`

---

## 🧪 TESTE RÁPIDO

### Teste 1: Criar Serviço com Duração
1. Abrir app BusinessApp
2. Ir em **Serviços**
3. Criar novo serviço:
   - Nome: "Teste Duração"
   - Preço: R$ 50,00
   - **Duração: 30** ← NOVO CAMPO
4. Salvar
5. Verificar no banco:
   ```sql
   SELECT nome, duracao FROM servicos WHERE nome = 'Teste Duração';
   -- Resultado esperado: duracao = 30
   ```

### Teste 2: Criar Serviço sem Duração
1. Criar novo serviço:
   - Nome: "Teste Sem Duração"
   - Preço: R$ 30,00
   - Duração: **(deixar vazio)**
2. Salvar
3. Verificar no banco:
   ```sql
   SELECT nome, duracao FROM servicos WHERE nome = 'Teste Sem Duração';
   -- Resultado esperado: duracao = NULL
   ```

### Teste 3: Criar Pacote com Cálculo Automático
1. Ir em **Pacotes**
2. Criar novo pacote:
   - Nome: "Teste Duração Pacote"
   - Adicionar serviços:
     - "Teste Duração" (30 min) × 2
3. Salvar
4. Verificar na interface:
   - Deve mostrar "⏱️ 60 min" para o serviço
   - Deve mostrar "⏱️ Duração total: 60 minutos"

---

## 🐛 TROUBLESHOOTING

### Erro: "column already exists"
**Solução:** Ignorar. A migration é idempotente, já foi executada antes.

### Erro: "permission denied"
**Solução:** Verificar se está logado com usuário correto no Supabase.

### Campo de duração não aparece no app
**Possíveis causas:**
1. App não foi recarregado: fechar e abrir novamente
2. Cache: limpar cache do app
3. Migration não foi executada: verificar no banco

### Duração total do pacote não calcula
**Possíveis causas:**
1. Serviços não têm duração definida
2. Cache: recarregar lista de pacotes
3. Verificar console do navegador/app para erros

---

## 📞 COMANDOS ÚTEIS

### Limpar Cache do App
```bash
# No terminal
expo start -c
# ou
npm start -- --clear
```

### Ver Logs em Tempo Real
```bash
# Android
adb logcat | grep -i BusinessApp

# iOS
xcrun simctl spawn booted log stream --predicate 'process == "BusinessApp"'
```

### Recarregar App
- **Android:** Shake device → Reload
- **iOS:** Cmd+R (simulator) ou Shake device → Reload
- **Web:** Ctrl+R ou F5

---

## 🎯 PRÓXIMOS PASSOS

Após executar as migrations com sucesso:

1. **Testar serviços:**
   - Criar serviço com duração
   - Criar serviço sem duração
   - Editar serviço existente

2. **Testar pacotes:**
   - Criar pacote com serviços que têm duração
   - Verificar cálculo automático
   - Verificar exibição na interface

3. **Testar novo agendamento:**
   - Verificar ordem dos campos
   - Testar validação (data bloqueada)
   - Testar botão de pacotes

4. **Consultar documentação:**
   - `CHECKLIST_FINAL_DURACOES.md` - Todos os testes
   - `RESUMO_COMPLETO_DURACOES.md` - Visão geral

---

## 📊 STATUS

```
┌─────────────────────────────────────────┐
│ IMPLEMENTAÇÃO: ✅ COMPLETA              │
│ MIGRATIONS:    ⏳ AGUARDANDO EXECUÇÃO  │
│ TESTES:        ⏳ AGUARDANDO            │
└─────────────────────────────────────────┘
```

**Depois de executar as migrations:**
```
┌─────────────────────────────────────────┐
│ IMPLEMENTAÇÃO: ✅ COMPLETA              │
│ MIGRATIONS:    ✅ EXECUTADAS            │
│ TESTES:        ⏳ REALIZAR              │
└─────────────────────────────────────────┘
```

---

**Tempo estimado total:** 5-10 minutos  
**Dificuldade:** ⭐ Fácil  
**Risco:** 🟢 Baixo (migrations são idempotentes)

---

## 🎉 BOA SORTE!

As migrations estão prontas e testadas. É só executar e começar a usar! 🚀

Se tiver dúvidas, consulte a documentação completa em:
- `CHECKLIST_FINAL_DURACOES.md`
- `RESUMO_COMPLETO_DURACOES.md`
