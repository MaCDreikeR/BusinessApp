# Sistema de Notificação de Agendamento + Correção do Card de Próximos Agendamentos

## 📋 Resumo das Implementações

### 1. **Correção do Card "Próximos Agendamentos"** 🔧

**Problema:** O card não estava exibindo os agendamentos após as mudanças na estrutura de dados.

**Solução:** 
- Removida a dependência da função RPC `get_agendamentos_com_usuarios`
- Implementada query direta no Supabase com busca paralela de dados de usuários
- Query otimizada que busca apenas os próximos 5 agendamentos futuros

**Arquivo modificado:** `app/(app)/index.tsx`

```typescript
// Query direta sem RPC
supabase.from('agendamentos')
  .select('id, cliente, data_hora, servicos, usuario_id, status')
  .eq('estabelecimento_id', estabelecimentoId)
  .gte('data_hora', new Date().toISOString())
  .order('data_hora', { ascending: true })
  .limit(5)

// Busca paralela de nomes de usuários
const agendamentosComUsuarios = await Promise.all(
  proxAgendamentos.map(async (ag: any) => {
    // Buscar nome do usuário responsável
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nome_completo')
      .eq('id', ag.usuario_id)
      .single();
    
    return {
      id: ag.id,
      cliente_nome: ag.cliente || 'Cliente não informado',
      servico: ag.servicos?.[0]?.nome || 'Serviço não especificado',
      horario: ag.data_hora,
      usuario_nome: userData?.nome_completo || 'Não atribuído',
      status: ag.status
    };
  })
);
```

---

### 2. **Sistema de Notificação de Início de Agendamento** 🔔

**Objetivo:** Exibir um aviso sobrepondo qualquer tela quando um agendamento está prestes a começar (5 minutos antes até 5 minutos depois).

#### Componentes Criados:

##### A. **AgendamentoNotificacao.tsx**
Componente visual da notificação

**Localização:** `app/components/AgendamentoNotificacao.tsx`

**Características:**
- ✅ Modal full-screen com blur no background
- ✅ Design moderno e profissional
- ✅ Ícone de calendário em destaque
- ✅ Exibe: Cliente, Serviço e Horário
- ✅ Dois botões de ação:
  - **Ocultar**: Fecha a notificação sem navegar
  - **Ver Agendamento**: Fecha e navega para a tela de agenda

**Interface:**
```typescript
interface AgendamentoNotificacaoProps {
  visible: boolean;
  cliente: string;
  servico: string;
  horario: string;
  onOcultar: () => void;
  onVerAgendamento: () => void;
}
```

---

##### B. **useAgendamentoNotificacao.ts**
Hook customizado para gerenciar a lógica de notificações

**Localização:** `hooks/useAgendamentoNotificacao.ts`

**Funcionalidades:**
- ✅ Verifica agendamentos a cada **30 segundos**
- ✅ Busca agendamentos entre **5 minutos antes** e **5 minutos depois** do horário atual
- ✅ Filtra apenas status: `agendado` e `confirmado`
- ✅ Controla quais agendamentos já foram notificados (evita spam)
- ✅ **Reseta a lista de notificados à meia-noite**
- ✅ Retorna funções para ocultar e resetar notificações

**Interface retornada:**
```typescript
{
  agendamentoAtivo: AgendamentoAtivo | null;
  mostrarNotificacao: boolean;
  ocultarNotificacao: () => void;
  resetarNotificacao: () => void;
}
```

**Lógica de verificação:**
```typescript
const agora = new Date();
const cincoMinutosAntes = new Date(agora.getTime() - 5 * 60000);
const cincoMinutosDepois = new Date(agora.getTime() + 5 * 60000);

// Busca agendamentos nessa janela de tempo
supabase.from('agendamentos')
  .select('id, cliente, data_hora, servicos, status')
  .eq('estabelecimento_id', estabelecimentoId)
  .gte('data_hora', cincoMinutosAntes.toISOString())
  .lte('data_hora', cincoMinutosDepois.toISOString())
  .in('status', ['agendado', 'confirmado'])
```

---

##### C. **Integração no Layout Principal**

**Arquivo modificado:** `app/(app)/_layout.tsx`

**Implementação:**
1. Importação do hook e componente
2. Inicialização do hook no início do componente
3. Renderização do componente de notificação após o Drawer

```typescript
// No início do componente
const { 
  agendamentoAtivo, 
  mostrarNotificacao, 
  ocultarNotificacao, 
  resetarNotificacao 
} = useAgendamentoNotificacao();

// No return, após o </Drawer>
{agendamentoAtivo && (
  <AgendamentoNotificacao
    visible={mostrarNotificacao}
    cliente={agendamentoAtivo.cliente}
    servico={agendamentoAtivo.servico}
    horario={agendamentoAtivo.horario}
    onOcultar={ocultarNotificacao}
    onVerAgendamento={() => {
      resetarNotificacao();
      router.push('/agenda');
    }}
  />
)}
```

---

## 🎨 Design da Notificação

### Visual:
```
┌─────────────────────────────────────┐
│         [Ícone Calendário]          │
│                                     │
│    Agendamento Iniciando!          │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ 👤 Cliente: João Silva      │  │
│  │ ✂️  Serviço: Corte de Cabelo│  │
│  │ 🕐 Horário: 14:00           │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Ocultar]  [Ver Agendamento]     │
└─────────────────────────────────────┘
```

### Cores:
- Background modal: `#fff`
- Ícone principal: `#7C3AED` (roxo)
- Título: `#1F2937` (cinza escuro)
- Info container: `#F9FAFB` (cinza claro)
- Botão Ocultar: `#F3F4F6` com borda `#E5E7EB`
- Botão Ver Agendamento: `#7C3AED` (roxo)

---

## 🔄 Fluxo de Funcionamento

1. **Inicialização:**
   - Layout carrega → Hook é ativado
   - Primeira verificação imediata
   - Timer de 30 segundos é iniciado

2. **Verificação contínua:**
   - A cada 30 segundos, busca agendamentos próximos
   - Filtra agendamentos não notificados
   - Se encontrar, exibe a notificação

3. **Interação do usuário:**
   - **Clicar em "Ocultar":**
     - Fecha o modal
     - Mantém o agendamento como notificado
     - Não reaparece até o próximo agendamento
   
   - **Clicar em "Ver Agendamento":**
     - Fecha o modal
     - Reseta a notificação
     - Navega para `/agenda`

4. **Reset diário:**
   - À meia-noite, limpa a lista de agendamentos notificados
   - Permite notificar novamente no dia seguinte

---

## 📝 Configurações e Ajustes

### Alterar tempo de antecedência:
```typescript
// Em useAgendamentoNotificacao.ts, linha 25-26
const cincoMinutosAntes = new Date(agora.getTime() - 5 * 60000); // Altere o 5
const cincoMinutosDepois = new Date(agora.getTime() + 5 * 60000); // Altere o 5
```

### Alterar intervalo de verificação:
```typescript
// Em useAgendamentoNotificacao.ts, linha 93
const intervalo = setInterval(() => {
  verificarAgendamentos();
}, 30000); // 30 segundos (altere conforme necessário)
```

### Alterar status aceitos:
```typescript
// Em useAgendamentoNotificacao.ts, linha 35
.in('status', ['agendado', 'confirmado']) // Adicione ou remova status
```

---

## ✅ Testes Recomendados

1. **Teste de proximidade:**
   - Crie agendamento para daqui 3 minutos
   - Aguarde aparecer a notificação

2. **Teste de não repetição:**
   - Clique em "Ocultar"
   - Verifique se não reaparece para o mesmo agendamento

3. **Teste de navegação:**
   - Clique em "Ver Agendamento"
   - Confirme navegação para agenda

4. **Teste de múltiplos agendamentos:**
   - Crie 2 agendamentos simultâneos
   - Verifique se notifica apenas um por vez

5. **Teste de status:**
   - Altere status para "em_atendimento"
   - Confirme que não notifica mais

---

## 🐛 Solução de Problemas

### Notificação não aparece:
- ✅ Verificar se `estabelecimentoId` está definido
- ✅ Confirmar que há agendamentos no intervalo de 5 minutos
- ✅ Verificar console para erros do Supabase
- ✅ Confirmar que o status é `agendado` ou `confirmado`

### Notificação aparece múltiplas vezes:
- ✅ Verificar se o Set de notificados está funcionando
- ✅ Confirmar que não há múltiplas instâncias do hook

### Card de próximos agendamentos vazio:
- ✅ Verificar se há agendamentos futuros no banco
- ✅ Confirmar permissões de SELECT na tabela
- ✅ Ver logs do console para erros

---

## 📦 Dependências Necessárias

- `expo-blur` - Para efeito de blur no background
- `date-fns` - Para formatação de datas
- `@expo/vector-icons` - Para ícones
- `expo-router` - Para navegação

---

## 🚀 Próximas Melhorias Possíveis

1. **Som de notificação** - Adicionar áudio quando aparecer
2. **Vibração** - Fazer o dispositivo vibrar
3. **Notificação push** - Enviar push real (não apenas modal)
4. **Histórico** - Mostrar histórico de notificações do dia
5. **Configurações** - Permitir usuário ajustar tempo de antecedência
6. **Badge** - Contador de notificações não visualizadas
