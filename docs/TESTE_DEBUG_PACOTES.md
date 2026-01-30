# 🔍 TESTE DEBUG - Cálculo Automático de Horário para Pacotes

## Objetivo
Identificar porque o horário de término não está sendo calculado automaticamente quando um pacote é selecionado.

## 📋 Passos para Executar o Teste

### 1. Preparação
```bash
# Limpar cache
npm start -- --reset-cache

# Ou reiniciar o app
```

### 2. Teste Completo

#### Passo 1: Abrir Novo Agendamento
1. Vá para **Agenda** → **Botão +** (Novo Agendamento)

#### Passo 2: Preencher Dados Básicos
1. **Cliente**: Digite qualquer nome (ex: "Teste Pacote")
2. **Telefone**: Digite qualquer telefone (ex: "11999999999")
3. **Profissional**: Selecione um profissional

#### Passo 3: Selecionar Pacote
1. Clique no botão **"📦 Pacotes"**
2. Selecione um pacote (qualquer um)
3. Clique em **"Adicionar"**

#### Passo 4: Selecionar Data e Hora
1. **Data**: Selecione uma data
2. **Hora de início**: Selecione um horário (ex: "14:00")

#### Passo 5: Observar o Campo "Horário de Término"
- ✅ **ESPERADO**: Campo deve preencher automaticamente (ex: "15:30" se o pacote tem 90 min)
- ❌ **ATUAL**: Campo continua vazio ou não atualiza

## 📊 Logs a Serem Coletados

### Ao Carregar Pacotes (Modal)
Procure por:
```
🔍 Processando pacote: "<Nome do Pacote>"
   duracao_total do banco: <valor ou null>
   Tem servicos? true (X itens)
   - Serviço "<nome>": X min x Y = Z min
   ✅ Duração CALCULADA: <total> min
```

### Ao Selecionar Pacote
Procure por:
```
═══════════════════════════════════════════════════════
📦 PACOTE SELECIONADO: "<Nome do Pacote>"
📊 Dados do pacote: { ... }
⏱️  duracao_total: <valor> min
🔢 Quantidade: 1
🕐 Horário de início atual: <hora>
═══════════════════════════════════════════════════════
```

### Ao Calcular Duração (useEffect)
Procure por:
```
───────────────────────────────────────────────────────
🔄 useEffect DISPARADO - Verificando cálculo de término
📅 Hora início: <hora>
🔧 Serviços selecionados: X
📦 Pacotes selecionados: Y
✅ Condições atendidas - calculando duração...
⏱️  Duração total calculada: <total> min
🎯 Horário de término calculado: <horario>
📝 Atualizando estado horaTermino para: <horario>
✅ Estado horaTermino atualizado!
───────────────────────────────────────────────────────
```

### Cálculo Detalhado (dentro de calcularDuracaoTotalCompleta)
Procure por:
```
📦 Pacote "<nome>": <duracao> min x <qtd> = <total> min
⏱️ TOTAL calculado: <total> min (temDuracao: true)
```

## 🐛 Possíveis Problemas

### Problema 1: Pacote sem duracao_total
**Log esperado:**
```
⚠️ Pacote "<nome>" NÃO tem duracao_total definida!
```
**Solução:** O cálculo automático na função `carregarPacotes` deve estar falhando.

### Problema 2: useEffect não dispara
**Log esperado:** Nada é impresso quando você seleciona o horário de início.
**Solução:** Verificar dependências do useEffect.

### Problema 3: Ordem de seleção
**Teste:** 
1. Selecione pacote ANTES de selecionar horário de início
2. Depois selecione horário de início
3. Depois selecione pacote DEPOIS de ter horário de início

### Problema 4: Estado não atualiza
**Log esperado:**
```
📝 Atualizando estado horaTermino para: <horario>
✅ Estado horaTermino atualizado!
```
Mas o campo visual não atualiza.

## ✅ Checklist de Verificação

- [ ] Logs de carregamento de pacotes aparecem?
- [ ] Campo `duracao_total` está preenchido no log?
- [ ] Logs de seleção de pacote aparecem?
- [ ] useEffect é disparado após selecionar pacote?
- [ ] useEffect é disparado após selecionar horário de início?
- [ ] Duração total é calculada corretamente?
- [ ] Horário de término é calculado?
- [ ] Estado `horaTermino` é atualizado?
- [ ] Campo visual é atualizado na tela?

## 📝 Template de Relatório

Copie e preencha:

```
### Configuração do Teste
- Pacote selecionado: <nome>
- Duração esperada: <X> minutos
- Horário de início: <HH:MM>
- Horário de término esperado: <HH:MM>

### Logs Coletados
[Cole aqui todos os logs relevantes]

### Resultado
- [ ] Funcionou
- [ ] Não funcionou

### Observações
<Descreva o que aconteceu>
```

## 🔧 Comandos Úteis

Ver logs em tempo real:
```bash
# Se usando Expo
npx expo start

# Logs do Metro Bundler aparecem no terminal
```

Limpar tudo:
```bash
npm start -- --reset-cache
```
