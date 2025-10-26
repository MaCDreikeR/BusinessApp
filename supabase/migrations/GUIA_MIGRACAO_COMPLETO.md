# 🚀 Guia Completo: Migração do Banco de Dados para Ambiente Local

## ✅ Status Atual
- [x] Backup do banco remoto criado com sucesso
- [x] Supabase local rodando em ambiente limpo
- [x] Supabase Studio acessível em http://127.0.0.1:54323
- [ ] Aplicação do backup no banco local

## 📁 Arquivos Criados
- **Backup Completo**: `supabase/backups/backup-completo-2025-10-21.sql`
- **Backup das Migrações**: `supabase/migrations-backup/` (arquivos originais preservados)

## 🎯 PRÓXIMO PASSO: Aplicar o Backup

### Método 1: Via Supabase Studio (Recomendado)

1. **Acesse o Supabase Studio**: http://127.0.0.1:54323
2. **Vá para "SQL Editor"** (ícone </> na barra lateral)
3. **Abra o arquivo de backup**:
   - Clique em "New query"
   - Abra o arquivo: `supabase/backups/backup-completo-2025-10-21.sql`
   - Copie todo o conteúdo
4. **Cole no editor SQL** do Supabase Studio
5. **Execute o script** clicando em "Run"

### Método 2: Via Terminal (Alternativo)

Se você tiver o PostgreSQL client instalado:

```bash
# Navegar para o diretório do projeto
cd C:\BusinessApp

# Aplicar o backup diretamente
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "supabase/backups/backup-completo-2025-10-21.sql"
```

### Método 3: Via Docker (Alternativo)

```bash
# Copiar o arquivo para o container
docker cp "supabase/backups/backup-completo-2025-10-21.sql" supabase_db_BusinessApp:/tmp/backup.sql

# Aplicar via Docker
docker exec supabase_db_BusinessApp psql -U postgres -d postgres -f /tmp/backup.sql
```

## 🔍 Verificação da Migração

Após aplicar o backup, verifique se funcionou:

1. **No Supabase Studio** (http://127.0.0.1:54323):
   - Vá em "Table Editor"
   - Verifique se as tabelas foram criadas:
     - usuarios
     - clientes
     - agendamentos
     - servicos
     - vendas
     - comissoes
     - etc.

2. **Verificar dados**:
   - Clique em cada tabela
   - Confirme se os dados foram importados

## 🔧 Configuração da Aplicação

Após a migração bem-sucedida:

### 1. Configure o ambiente local
```bash
# Use as variáveis de ambiente locais
cp .env.development .env.local
```

### 2. Atualize seu código para usar o ambiente local
```javascript
// lib/supabase.ts - Use as configurações locais
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
```

### 3. Teste a aplicação
```bash
npm run start
```

## 📊 URLs do Ambiente Local

- **API URL**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Mailpit (Emails)**: http://127.0.0.1:54324
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## 🛠️ Scripts Úteis

```bash
# Verificar status
npm run supabase:status

# Parar ambiente
npm run supabase:stop

# Reiniciar ambiente
npm run supabase:start

# Ver logs
npm run supabase:logs

# Abrir Studio
npm run supabase:studio
```

## ⚠️ Solução de Problemas

### Se a aplicação do backup falhar:
1. Verifique se o arquivo existe: `supabase/backups/backup-completo-2025-10-21.sql`
2. Tente aplicar em partes menores (divida o arquivo)
3. Use o método alternativo via Docker

### Se algumas tabelas não aparecerem:
1. Verifique se há erros no console do Studio
2. Tente executar apenas as queries de CREATE TABLE primeiro
3. Depois execute as queries de INSERT

### Se houver erro de permissões:
1. Verifique se o Supabase local está rodando
2. Confirme as URLs locais
3. Reinicie o ambiente: `supabase stop && supabase start`

## 🎉 Próximos Passos

1. ✅ Aplicar o backup via Studio
2. ✅ Verificar se os dados foram importados
3. ✅ Configurar a aplicação para usar o ambiente local
4. ✅ Testar funcionalidades principais
5. ✅ Desenvolver com dados reais localmente!

---

**💡 Lembre-se**: Seus dados de produção estão agora disponíveis localmente. Tenha cuidado ao fazer alterações experimentais.