# Referência Visual - Sistema de Agendamentos Atualizado

## 📱 Tela de Novo Agendamento

```
┌─────────────────────────────────────┐
│  ← Novo Agendamento                 │
├─────────────────────────────────────┤
│                                     │
│  👤 Nome do Cliente *               │
│  ┌───────────────────────────────┐  │
│  │ 👤 João Silva              ✕ │  │
│  └───────────────────────────────┘  │
│                                     │
│  📞 Telefone *                      │
│  ┌───────────────────────────────┐  │
│  │ (11) 98765-4321              │  │
│  └───────────────────────────────┘  │
│                                     │
│  👨‍💼 Profissional *                  │
│  ┌───────────────────────────────┐  │
│  │ 👤 Maria Santos            ▼ │  │
│  └───────────────────────────────┘  │
│                                     │
│  📅 Data *                          │
│  ┌───────────────────────────────┐  │
│  │ 17/10/2025                   │  │
│  └───────────────────────────────┘  │
│                                     │
│  🕐 Horário de Início *             │
│  ┌───────────────────────────────┐  │
│  │ 09:00                        │  │
│  └───────────────────────────────┘  │
│                                     │
│  🕐 Horário de Término *            │
│  ┌───────────────────────────────┐  │
│  │ 10:30                        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ✂ Serviços                         │
│  ┌───────────────────────────────┐  │
│  │ Corte de Cabelo              │  │
│  │ R$ 50,00                     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📋 Criar comanda para o dia │   │
│  │    do agendamento?          │   │
│  │    Uma comanda será criada  │   │
│  │    automaticamente no dia   │   │
│  │    marcado          ⚪─────►│   │
│  └─────────────────────────────┘   │
│                                     │
│  📝 Observações                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      SALVAR AGENDAMENTO       │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 📅 Lista de Agendamentos

```
┌─────────────────────────────────────┐
│  17 de outubro de 2025  📅  🔔      │
├─────────────────────────────────────┤
│                                     │
│  Profissionais:                     │
│  👤 Maria  👤 José  👤 Carlos      │
│  ─────   ─────   ─────             │
│  (Todos selecionados)              │
│                                     │
├─────────────────────────────────────┤
│  08:00                              │
│  │                                  │
│  │                                  │
│  ├──────────────────────────────────│
│  09:00                              │
│  ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 09:00 - 10:30                 ┃  │
│  ┃ João Silva                    ┃  │
│  ┃ Corte de Cabelo              ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│  │  (Status: Agendado - Roxo)     │
│  ├──────────────────────────────────│
│  10:00                              │
│  │                                  │
│  │                                  │
│  ├──────────────────────────────────│
│  11:00                              │
│  ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 11:00 - 11:45                 ┃  │
│  ┃ Maria Santos                  ┃  │
│  ┃ Manicure                      ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│  │  (Status: Confirmado - Verde)  │
│  ├──────────────────────────────────│
│  12:00                              │
│  │                                  │
│                                     │
└─────────────────────────────────────┘

Legenda das Cores:
┃ Roxo    - Agendado
┃ Verde   - Confirmado
┃ Laranja - Em Atendimento
┃ Cinza   - Concluído
┃ Vermelho- Cancelado/Falta
```

---

## 🔍 Modal de Detalhes (Melhorado)

```
┌─────────────────────────────────────┐
│  Agendamento às 09:00          ✕    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ João Silva              1/1     ││
│  │                [🔵 Agendado]    ││
│  │                                 ││
│  │ 🕐 09:00 - 10:30                ││
│  │                                 ││
│  │ ╔═══════════════════════════╗   ││
│  │ ║ ✂ Serviços:              ║   ││
│  │ ║ • Corte de Cabelo - R$50 ║   ││
│  │ ╚═══════════════════════════╝   ││
│  │                                 ││
│  │ ╔═══════════════════════════╗   ││
│  │ ║ 📝 Observações:          ║   ││
│  │ ║ Cliente prefere tesoura  ║   ││
│  │ ╚═══════════════════════════╝   ││
│  │                                 ││
│  │ ┌───────────────────────────┐   ││
│  │ │ 🧾 Comanda será criada    │   ││
│  │ │    automaticamente        │   ││
│  │ └───────────────────────────┘   ││
│  │                                 ││
│  │ ─────────────────────────────   ││
│  │                                 ││
│  │ [✓ Confirmar] [▶ Iniciar]  🗑  ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘

---

### Quando Status = "Confirmado":

│  │ [✓ Confirmado]  [▶ Iniciar]  🗑 ││
                      ↑
              Botão disponível

---

### Quando Status = "Em Atendimento":

│  │ [🟠 Em Atendimento] [✓ Concluir] 🗑 ││
                           ↑
                   Botão disponível

---

### Quando Status = "Concluído":

│  │ [✓ Concluído]                  🗑 ││
                        ↑
              Apenas exclusão disponível
```

---

## 🎨 Paleta de Cores do Sistema

```
Status Colors:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟣 Agendado         #7C3AED (Roxo)
🟢 Confirmado       #10B981 (Verde)
🟠 Em Atendimento   #F59E0B (Laranja)
⚫ Concluído        #6B7280 (Cinza)
🔴 Cancelado        #EF4444 (Vermelho)
🔴 Falta            #DC2626 (Vermelho Escuro)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UI Elements:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Background:        #F3F4F6 (Cinza Claro)
Cards:             #FFFFFF (Branco)
Primary Action:    #7C3AED (Roxo)
Secondary Action:  #6B7280 (Cinza)
Danger:            #EF4444 (Vermelho)
Success:           #10B981 (Verde)
Warning:           #F59E0B (Laranja)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Fluxo de Interação do Usuário

```
┌───────────────────────────────────────────┐
│  NOVO AGENDAMENTO                         │
└───────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  1. Seleciona Cliente (aparece avatar)    │
│  2. Seleciona Profissional (aparece foto) │
│  3. Seleciona Data                        │
│  4. Seleciona Horário de Início           │
│  5. Seleciona Horário de Término          │
│     (validação: deve ser > início)        │
│  6. Adiciona Serviços (opcional)          │
│  7. Toggle Comanda Automática (Sim/Não)   │
│  8. Adiciona Observações (opcional)       │
└───────────────────────────────────────────┘
             │
             ▼ SALVAR
┌───────────────────────────────────────────┐
│  STATUS INICIAL: Agendado (Roxo)          │
└───────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  LISTAGEM - Aparece com:                  │
│  • Barra colorida lateral (status)        │
│  • Horário completo (09:00 - 10:30)       │
│  • Nome do cliente                        │
│  • Serviços                               │
└───────────────────────────────────────────┘
             │
             ▼ TOQUE NO CARD
┌───────────────────────────────────────────┐
│  MODAL DE DETALHES                        │
│  • Badge de status colorido               │
│  • Todas as informações                   │
│  • Botões de ação contextual              │
└───────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  AÇÕES DISPONÍVEIS (conforme status):     │
│  • Confirmar                              │
│  • Iniciar Atendimento                    │
│  • Concluir                               │
│  • Excluir                                │
└───────────────────────────────────────────┘
```

---

## ✅ Checklist de Funcionalidades

### Formulário:
- [x] Avatar do cliente exibido
- [x] Avatar do profissional exibido
- [x] Campo Horário de Início
- [x] Campo Horário de Término
- [x] Validação: término > início
- [x] Toggle "Criar Comanda Automaticamente"
- [x] Todos os campos salvos no banco

### Listagem:
- [x] Horário exibido como "HH:MM - HH:MM"
- [x] Barra colorida de status
- [x] Design responsivo

### Modal de Detalhes:
- [x] Badge de status colorido
- [x] Ícones informativos
- [x] Horário completo destacado
- [x] Info sobre comanda automática
- [x] Botões de ação contextual
- [x] Função de atualizar status
- [x] Feedback visual de sucesso

### Banco de Dados:
- [x] Migração criada
- [x] Campos adicionados
- [x] Índices criados
- [x] Compatibilidade com dados existentes

---

**Tudo pronto para uso! 🎉**
