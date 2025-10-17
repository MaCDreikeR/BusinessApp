# Edge Function: Verificar Agendamentos

Esta Edge Function verifica agendamentos que estão iniciando e cria comandas automaticamente.

## Funcionamento

1. **Executa a cada 5 minutos** via GitHub Actions
2. **Busca agendamentos** com data_hora entre -5min e +5min do horário atual
3. **Verifica se já existe comanda** aberta para o cliente no dia
4. **Cria comanda** se não existir, com todos os serviços do agendamento
5. **Calcula valor total** somando preços dos serviços

## Instalação

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Vincular projeto

```bash
supabase link --project-ref SEU_PROJECT_REF
```

Para encontrar o `project-ref`:
- Acesse o dashboard do Supabase
- Vá em Project Settings > General
- Copie o "Reference ID"

### 4. Deploy da função

```bash
supabase functions deploy verificar-agendamentos
```

### 5. Configurar secrets no GitHub

Acesse: `https://github.com/MaCDreikeR/BusinessApp/settings/secrets/actions`

Adicione os seguintes secrets:

- **SUPABASE_URL**: `https://seu-projeto.supabase.co`
- **SUPABASE_ANON_KEY**: Sua chave pública (anon/public)

Para encontrar essas chaves:
- Dashboard Supabase > Project Settings > API
- Copie "Project URL" e "anon/public key"

## Testar

### Testar localmente

```bash
# Servir função localmente
supabase functions serve verificar-agendamentos

# Em outro terminal, testar
curl -X POST http://localhost:54321/functions/v1/verificar-agendamentos
```

### Testar em produção

```bash
curl -X POST \
  'https://seu-projeto.supabase.co/functions/v1/verificar-agendamentos' \
  -H 'Authorization: Bearer SUA_ANON_KEY'
```

### Executar workflow manualmente

1. Acesse: `https://github.com/MaCDreikeR/BusinessApp/actions`
2. Selecione "Verificar Agendamentos"
3. Clique em "Run workflow"

## Logs

### Ver logs da Edge Function

```bash
supabase functions logs verificar-agendamentos
```

### Ver logs do GitHub Actions

- Acesse: `https://github.com/MaCDreikeR/BusinessApp/actions`
- Clique no workflow "Verificar Agendamentos"
- Veja os logs de cada execução

## Estrutura de resposta

```json
{
  "success": true,
  "timestamp": "2025-10-17T10:35:00.000Z",
  "estatisticas": {
    "agendamentos_encontrados": 3,
    "comandas_criadas": 2,
    "comandas_existentes": 1,
    "erros": 0
  }
}
```

## Variáveis de ambiente (já configuradas automaticamente)

- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY`: Chave privada (service_role) - configurada automaticamente no deploy

## Custo

- **Edge Functions**: Ilimitadas no plano Pro do Supabase (incluídas)
- **GitHub Actions**: 2.000 minutos/mês grátis (esta action usa ~0.1min por execução)
- **Total mensal**: ~8.640 execuções (5min × 24h × 30 dias) = **R$ 0,00**

## Integração com o app

O hook `useAgendamentoNotificacao` continua funcionando para:
- ✅ Mostrar notificações no app quando aberto
- ✅ Criar comandas se a Edge Function falhar

A Edge Function garante que:
- ✅ Comandas são criadas mesmo com app fechado
- ✅ Funciona 24/7 independente do dispositivo
- ✅ Não depende de nenhum profissional ter o app aberto

## Troubleshooting

### Edge Function não está executando

```bash
# Ver logs
supabase functions logs verificar-agendamentos

# Re-deploy
supabase functions deploy verificar-agendamentos
```

### GitHub Actions não está rodando

- Verifique se os secrets estão configurados
- Vá em Actions > Enable workflows (se necessário)
- Execute manualmente para testar

### Comandas não estão sendo criadas

- Verifique os logs da Edge Function
- Confirme que há agendamentos com status 'agendado' ou 'confirmado'
- Verifique se os nomes dos clientes existem na tabela `clientes`
