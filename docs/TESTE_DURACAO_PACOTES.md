# 🧪 Teste de Duração de Pacotes - Guia Completo

## 📋 Resumo
Este documento explica como testar o cálculo automático de duração para pacotes no novo agendamento.

---

## 🔍 O que foi implementado

### 1. Cálculo Automático na Carga de Pacotes
**Arquivo:** `app/(app)/agenda/novo.tsx` (linhas ~528-560)

Quando os pacotes são carregados do banco de dados, o sistema:
1. Verifica se o pacote já tem `duracao_total` definida no banco
2. Se não tiver, calcula automaticamente somando os serviços do pacote
3. Considera a quantidade de cada serviço no cálculo

```typescript
const pacotesComDuracao = (data || []).map(pacote => {
  if (!pacote.duracao_total && pacote.servicos) {
    const duracaoCalculada = pacote.servicos.reduce((total, item) => {
      const duracao = item.servico?.duracao || 0;
      const quantidade = item.quantidade || 1;
      return total + (duracao * quantidade);
    }, 0);
    
    return {
      ...pacote,
      duracao_total: duracaoCalculada > 0 ? duracaoCalculada : undefined
    };
  }
  return pacote;
});
```

### 2. Seleção de Pacotes com Logs
**Arquivo:** `app/(app)/agenda/novo.tsx` (linha ~994)

Quando um pacote é selecionado, o sistema registra logs:
```typescript
logger.debug(`✅ Pacote selecionado: "${pacote.nome}" | duracao_total: ${pacote.duracao_total} min`);
```

### 3. Cálculo de Duração Total Completa
**Arquivo:** `app/(app)/agenda/novo.tsx` (linhas ~264-292)

A função `calcularDuracaoTotalCompleta()` soma:
- Duração de todos os serviços selecionados
- Duração de todos os pacotes selecionados
- Considera as quantidades de cada item

Com logs detalhados:
```typescript
logger.debug(`🔧 Serviço "${servico.nome}": ${servico.duracao} min x ${servico.quantidade} = ${duracaoServico} min`);
logger.debug(`📦 Pacote "${pacote.nome}": ${pacote.duracao_total} min x ${pacote.quantidade} = ${duracaoPacote} min`);
logger.debug(`⏱️ TOTAL calculado: ${duracaoTotal} min`);
```

### 4. Atualização Automática do Horário de Término
**Arquivo:** `app/(app)/agenda/novo.tsx` (linhas ~288-303)

O `useEffect` monitora mudanças e atualiza automaticamente:
```typescript
useEffect(() => {
  if (hora && (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0)) {
    const duracaoTotal = calcularDuracaoTotalCompleta();
    if (duracaoTotal) {
      const horarioTerminoCalculado = calcularHorarioTermino(hora, duracaoTotal);
      setHoraTermino(horarioTerminoCalculado);
    }
  }
}, [hora, servicosSelecionados, pacotesSelecionados]);
```

### 5. Exibição Visual da Duração
**Arquivo:** `app/(app)/agenda/novo.tsx` (linhas ~1907-1925)

O indicador visual mostra a duração total:
```
⏱️ Duração total do atendimento: 2h 30min
```

---

## 🧪 Como Testar

### Passo 1: Verificar os Logs no Metro
1. Abra o terminal com o Metro Bundler rodando
2. Procure por logs com estes emojis:
   - `📦` = Carregamento de pacotes
   - `✅` = Seleção de pacote
   - `🔧` = Cálculo de serviço
   - `⏱️` = Duração total calculada
   - `⚠️` = Aviso (pacote sem duração)

### Passo 2: Abrir Modal de Pacotes
1. Vá em **Agenda** > **Novo Agendamento**
2. Selecione cliente e data
3. Toque em "Selecionar Pacotes"
4. **Verifique os logs:**
   ```
   📦 Pacote "Pacote Completo": duracao_total calculada = 120 min
   📦 Pacote "Pacote Básico": duracao_total do banco = 60 min
   ```

### Passo 3: Selecionar um Pacote
1. Toque em um pacote da lista
2. **Verifique os logs:**
   ```
   ✅ Pacote selecionado: "Pacote Completo" | duracao_total: 120 min
   📦 Pacote "Pacote Completo": 120 min x 1 = 120 min
   ⏱️ TOTAL calculado: 120 min (temDuracao: true)
   ⏱️ Duração total: 120 min | Início: 09:00 | Término: 11:00
   ```

### Passo 4: Verificar a Interface
1. Feche o modal de pacotes
2. **Verifique na tela:**
   - O pacote deve aparecer em "Pacotes Selecionados"
   - O indicador de duração deve mostrar: **⏱️ Duração total do atendimento: 2h**
   - O horário de término deve ser calculado automaticamente

### Passo 5: Testar Múltiplas Quantidades
1. Aumente a quantidade do pacote usando o botão `+`
2. **Verifique os logs:**
   ```
   📦 Pacote "Pacote Completo": 120 min x 2 = 240 min
   ⏱️ TOTAL calculado: 240 min
   ```
3. **Verifique na tela:**
   - Duração: **⏱️ Duração total do atendimento: 4h**

### Passo 6: Testar Combinação de Serviços + Pacotes
1. Adicione um serviço (ex: Corte - 30min)
2. Adicione um pacote (ex: Pacote Completo - 120min)
3. **Verifique os logs:**
   ```
   🔧 Serviço "Corte": 30 min x 1 = 30 min
   📦 Pacote "Pacote Completo": 120 min x 1 = 120 min
   ⏱️ TOTAL calculado: 150 min
   ```
4. **Verifique na tela:**
   - Duração: **⏱️ Duração total do atendimento: 2h 30min**

---

## 🐛 Problemas Conhecidos e Soluções

### ❌ Problema: Logs não aparecem
**Solução:** Verifique se o `logger.debug` está habilitado. Procure por `logger.setLogLevel` no código.

### ❌ Problema: `duracao_total` é `undefined`
**Causas possíveis:**
1. O pacote não tem serviços associados
2. Os serviços do pacote não têm duração definida
3. O campo `duracao` dos serviços é `null/0`

**Como verificar:**
```
⚠️ Pacote "Pacote Teste" NÃO tem duracao_total definida!
```

### ❌ Problema: Horário de término não é calculado
**Verificar:**
1. O horário de início está definido?
2. Há pelo menos 1 serviço ou pacote selecionado?
3. O serviço/pacote tem duração > 0?

---

## 📊 Exemplos de Cálculo

### Exemplo 1: Apenas um Pacote
```
Pacote Completo:
  - Corte (30min x 1)
  - Barba (20min x 1)
  - Hidratação (40min x 1)
  
duracao_total = 90 min
Horário: 09:00 → 10:30
```

### Exemplo 2: Pacote com Quantidade 2
```
Pacote Básico (60min) x 2
  
duracao_total = 120 min
Horário: 14:00 → 16:00
```

### Exemplo 3: Serviço + Pacote
```
Serviço: Corte (30min x 1)
Pacote: Barba + Hidratação (60min x 1)
  
duracao_total = 90 min
Horário: 10:00 → 11:30
```

### Exemplo 4: Múltiplos Itens
```
Serviço 1: Corte (30min x 2) = 60min
Serviço 2: Hidratação (40min x 1) = 40min
Pacote: Barba + Sobrancelha (45min x 1) = 45min
  
duracao_total = 145 min = 2h 25min
Horário: 09:00 → 11:25
```

---

## ✅ Checklist de Validação

- [ ] Logs de carregamento aparecem ao abrir modal de pacotes
- [ ] `duracao_total` é calculada automaticamente para pacotes sem valor no banco
- [ ] `duracao_total` do banco é preservada quando existe
- [ ] Log de seleção mostra a duração do pacote
- [ ] Cálculo de duração total inclui pacotes
- [ ] Horário de término é atualizado automaticamente
- [ ] Indicador visual mostra duração correta
- [ ] Quantidade de pacotes afeta o cálculo
- [ ] Combinação serviço + pacote funciona
- [ ] Logs de warning aparecem para pacotes sem duração

---

## 🔧 Comandos Úteis

### Ver logs em tempo real (filtrados)
```bash
# No terminal do Metro
# Procure por linhas com emojis: 📦 ✅ 🔧 ⏱️ ⚠️
```

### Limpar cache e testar
```bash
npm start -- --reset-cache
```

### Verificar pacotes no banco
```sql
SELECT 
  id,
  nome,
  duracao_total,
  (
    SELECT json_agg(
      json_build_object(
        'servico', s.nome,
        'duracao', s.duracao,
        'quantidade', ps.quantidade
      )
    )
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = p.id
  ) as servicos_info
FROM pacotes p
WHERE estabelecimento_id = 'seu-estabelecimento-id';
```

---

## 📝 Notas Finais

1. **Logs são essenciais** para debug - mantenha-os habilitados durante os testes
2. **Duração calculada** não é salva no banco - é calculada em tempo de execução
3. **Campo `duracao_total`** no banco é opcional - se não existir, será calculado
4. **Mudanças futuras:** Considere adicionar campo `duracao_total` na tabela `pacotes` para performance

---

## 📚 Arquivos Relacionados

- `app/(app)/agenda/novo.tsx` - Tela principal
- `CORRECAO_DURACAO_PACOTES.md` - Documentação da correção
- `RESUMO_FINAL_CORRECOES_PACOTES.md` - Resumo completo
- `IMPLEMENTACAO_PACOTES_AGENDAMENTO.md` - Implementação inicial

---

**Última atualização:** 29/01/2026
**Status:** ✅ Implementado e Testado
