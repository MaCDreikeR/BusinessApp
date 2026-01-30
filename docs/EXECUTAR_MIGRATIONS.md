# Instruções para Executar Migrations

## Migration: 20251210_add_last_activity.sql

Esta migration adiciona o rastreamento de atividade de usuários.

### O que faz:
1. Adiciona coluna `last_activity_at` para rastrear quando o usuário esteve ativo pela última vez
2. Adiciona coluna `dispositivo` para armazenar informações do dispositivo do usuário
3. Atualiza `last_activity_at` dos usuários existentes com base no `updated_at`
4. Cria índices para otimizar queries de usuários online

### Como executar:

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New query**
5. Copie e cole todo o conteúdo do arquivo `20251210_add_last_activity.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`

### Verificar se foi executada com sucesso:

Execute esta query no SQL Editor:

```sql
-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name IN ('last_activity_at', 'dispositivo');

-- Verificar se os índices foram criados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'usuarios' 
AND indexname IN ('idx_usuarios_last_activity', 'idx_usuarios_dispositivo');
```

### Resultado esperado:

Você deve ver:
- 2 colunas: `last_activity_at` (timestamptz) e `dispositivo` (text)
- 2 índices: `idx_usuarios_last_activity` e `idx_usuarios_dispositivo`

### Após executar:

O app começará automaticamente a:
- Atualizar `last_activity_at` a cada 2 minutos enquanto o usuário estiver no app
- Registrar informações do dispositivo (modelo, sistema operacional)
- Mostrar usuários online em tempo real na aba "Atividades"
- Exibir histórico de dispositivos dos últimos 30 dias

---

## Troubleshooting

### Erro: "column already exists"
- Não é um problema! A migration usa `IF NOT EXISTS` para evitar duplicação
- A migration pode ser executada múltiplas vezes sem problemas

### Erro de permissão
- Certifique-se de estar usando uma conta com permissões de administrador no Supabase

### Dados não aparecem no app
1. Verifique se a migration foi executada com sucesso
2. Faça logout e login novamente no app
3. Aguarde 2 minutos para o heartbeat atualizar
4. Puxe a tela para baixo para atualizar (pull-to-refresh)
