# Configuração do Supabase CLI Local - BusinessApp

## ✅ Status Atual
- [x] Supabase CLI instalado (v2.51.0)
- [x] Projeto Supabase inicializado
- [x] Configuração inicial criada em `/supabase/config.toml`
- [ ] Docker Desktop instalado e configurado
- [ ] Ambiente local rodando

## 🐳 Instalação do Docker Desktop

### Método 1: Download Direto (Recomendado)
1. Acesse: https://docs.docker.com/desktop/install/windows-install/
2. Baixe o "Docker Desktop for Windows"
3. Execute o instalador como administrador
4. Reinicie o computador quando solicitado
5. Após reiniciar, abra o Docker Desktop e aguarde a inicialização

### Método 2: Via Chocolatey (Alternativo)
```powershell
# Execute como administrador
choco install docker-desktop
```

### Método 3: Via Winget (Alternativo)
```powershell
# Execute como administrador
winget install Docker.DockerDesktop
```

## 🚀 Após instalar Docker

### 1. Verificar instalação
```powershell
docker --version
docker-compose --version
```

### 2. Iniciar Supabase Local
```powershell
# Na pasta do projeto BusinessApp
supabase start
```

### 3. Verificar status
```powershell
supabase status
```

## 🔧 URLs do Ambiente Local

Quando o Supabase local estiver rodando, você terá acesso a:

- **API URL**: http://127.0.0.1:54321
- **GraphQL URL**: http://127.0.0.1:54321/graphql/v1
- **S3 Storage URL**: http://127.0.0.1:54321/storage/v1/s3
- **DB URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio URL**: http://127.0.0.1:54323
- **Inbucket URL**: http://127.0.0.1:54324
- **JWT secret**: super-secret-jwt-token-with-at-least-32-characters-long
- **anon key**: [será gerada automaticamente]
- **service_role key**: [será gerada automaticamente]

## 📝 Scripts Úteis

Os seguintes scripts foram adicionados ao package.json:

```bash
npm run supabase:start    # Inicia o ambiente local
npm run supabase:stop     # Para o ambiente local
npm run supabase:status   # Verifica status dos serviços
npm run supabase:reset    # Reseta o banco de dados local
npm run supabase:logs     # Visualiza logs dos serviços
```

## 🔄 Workflow de Desenvolvimento

1. **Iniciar desenvolvimento**: `npm run supabase:start`
2. **Desenvolver e testar**: Use as URLs locais acima
3. **Visualizar banco**: Acesse http://127.0.0.1:54323 (Supabase Studio)
4. **Verificar emails**: Acesse http://127.0.0.1:54324 (Inbucket)
5. **Finalizar**: `npm run supabase:stop`

## 🔧 Migração de Esquema

Para sincronizar seu banco remoto com o local:

```powershell
# Fazer backup do esquema remoto
supabase db pull

# Aplicar mudanças locais
supabase db push
```

## ❗ Solução de Problemas

### Docker não inicia
- Certifique-se que a virtualização está habilitada no BIOS
- Execute Docker Desktop como administrador
- Reinicie o computador

### Portas ocupadas
O Supabase usa as portas 54321-54327. Se houver conflito:
- Pare outros serviços nessas portas
- Ou modifique as portas em `supabase/config.toml`

### Erro de permissões
```powershell
# Execute PowerShell como administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📋 Próximos Passos

1. Instale o Docker Desktop
2. Execute `supabase start`
3. Configure as variáveis de ambiente locais
4. Teste a aplicação com o ambiente local