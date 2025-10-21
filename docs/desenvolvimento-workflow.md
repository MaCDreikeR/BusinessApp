# Guia de Desenvolvimento - Banco Local + Múltiplos Ambientes

## 🎯 Estratégia de Desenvolvimento

### Fluxo de Trabalho:
```
LOCAL (SQLite) → STAGING (Supabase) → PRODUÇÃO (Supabase)
    ↓               ↓                    ↓
 Desenvolvimento    Testes             Release
 Offline/Online     em Nuvem           Final
```

## 🏗️ Arquitetura dos Ambientes

### 1. **LOCAL** - Desenvolvimento Offline
- **Banco**: SQLite local
- **Vantagens**: 
  - ✅ Desenvolvimento completamente offline
  - ✅ Testes rápidos e isolados
  - ✅ Não consome quota do Supabase
  - ✅ Resetar banco facilmente
- **Uso**: Desenvolvimento diário, testes unitários

### 2. **STAGING** - Testes em Nuvem
- **Banco**: Supabase separado
- **Vantagens**:
  - ✅ Teste de integração com nuvem
  - ✅ Teste de autenticação
  - ✅ Simulação do ambiente real
- **Uso**: Testes antes do deploy, demos

### 3. **PRODUÇÃO** - Ambiente Real
- **Banco**: Supabase produção
- **Vantagens**:
  - ✅ Dados reais dos usuários
  - ✅ Performance otimizada
- **Uso**: App em produção

## 🚀 Configuração Inicial

### 1. Instalação
```bash
npm install
```

### 2. Configurar Banco Local
```bash
# Gerar migração inicial
npm run db:generate

# Executar migração
npm run db:migrate

# Inserir dados de exemplo
npm run db:seed
```

### 3. Configurar Ambientes
```bash
# Configurar arquivos de ambiente
npm run env:setup

# Ou use o script interativo
node scripts/setup-env.js
```

## 📝 Comandos de Desenvolvimento

### Desenvolvimento Local (Offline)
```bash
# Iniciar em modo local (SQLite)
npm run start:local

# Android local
npm run android:local

# iOS local
npm run ios:local

# Web local
npm run web:local
```

### Staging (Teste em Nuvem)
```bash
# Primeiro, sincronize dados locais para staging
npm run db:sync

# Iniciar em modo staging
npm run start:staging

# Android staging
npm run android:staging
```

### Produção
```bash
# Iniciar em modo produção
npm run start:prod

# Build de produção
npm run build:prod
```

## 🗄️ Comandos do Banco de Dados

### Desenvolvimento Local
```bash
# Gerar nova migração
npm run db:generate

# Executar migrações
npm run db:migrate

# Resetar banco (limpar tudo)
npm run db:reset

# Inserir dados de exemplo
npm run db:seed

# Sincronizar para staging
npm run db:sync
```

### Exemplo de Workflow
```bash
# 1. Desenvolver localmente
npm run start:local

# 2. Fazer mudanças no schema
npm run db:generate
npm run db:migrate

# 3. Testar em staging
npm run db:sync
npm run start:staging

# 4. Deploy para produção
npm run build:prod
```

## 🔄 Workflow Completo

### 1. Desenvolvimento de Nova Feature
```bash
# Criar branch
git checkout -b feature/nova-funcionalidade

# Desenvolver localmente
npm run start:local

# Testar mudanças no banco
npm run db:reset
npm run db:seed
```

### 2. Teste da Feature
```bash
# Sincronizar para staging
npm run db:sync

# Testar em staging
npm run start:staging

# Build de teste
npm run build:staging
```

### 3. Deploy para Produção
```bash
# Merge para master
git checkout master
git merge feature/nova-funcionalidade

# Deploy produção
npm run build:prod
```

## 📁 Estrutura dos Ambientes

### Local (.env.development)
```env
EXPO_PUBLIC_ENVIRONMENT=local
EXPO_PUBLIC_USE_LOCAL_DB=true
EXPO_PUBLIC_OFFLINE_MODE=true
```

### Staging (.env.staging)
```env
EXPO_PUBLIC_ENVIRONMENT=staging
EXPO_PUBLIC_SUPABASE_URL=https://staging.supabase.co
EXPO_PUBLIC_USE_LOCAL_DB=false
```

### Produção (.env.production)
```env
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_SUPABASE_URL=https://prod.supabase.co
EXPO_PUBLIC_USE_LOCAL_DB=false
```

## 🎯 Quando Usar Cada Ambiente

### Use LOCAL quando:
- ✅ Desenvolvendo novas funcionalidades
- ✅ Testando mudanças no banco
- ✅ Trabalhando offline
- ✅ Fazendo testes unitários
- ✅ Debugando problemas

### Use STAGING quando:
- ✅ Testando integração com APIs
- ✅ Validando autenticação
- ✅ Demonstrando para stakeholders
- ✅ Testes de performance
- ✅ Validando antes do deploy

### Use PRODUÇÃO quando:
- ✅ Deploy final
- ✅ Dados reais dos usuários
- ✅ Monitoramento de performance

## 🛠️ Ferramentas e Scripts

### Database Management
```bash
# Ver dados do banco local
npm run db:inspect

# Backup do banco local
npm run db:backup

# Restaurar backup
npm run db:restore

# Comparar schemas
npm run db:diff
```

### Sincronização
```bash
# Sincronizar local → staging
npm run db:sync

# Sincronizar staging → produção (cuidado!)
npm run db:sync-to-prod
```

## 🔒 Segurança e Boas Práticas

### Desenvolvimento Local
- ✅ Use dados fictícios/anonymizados
- ✅ Não armazene dados sensíveis no SQLite
- ✅ Reset frequente do banco local

### Staging
- ✅ Use dados de teste, não produção
- ✅ Configure RLS adequadamente
- ✅ Monitore uso da quota

### Produção
- ✅ Backup automático
- ✅ Monitoramento 24/7
- ✅ RLS rigoroso
- ✅ Logs de auditoria

## 🚨 Troubleshooting

### Problema: SQLite não funciona
```bash
# Reinstalar dependências
npm install better-sqlite3 --force

# Regenerar banco
npm run db:reset
```

### Problema: Sincronização falha
```bash
# Verificar conexão com staging
npm run start:staging

# Verificar credenciais
cat .env.staging
```

### Problema: Migration erro
```bash
# Resetar migrações
rm -rf drizzle/migrations
npm run db:generate
```

## 📊 Vantagens da Abordagem Híbrida

### Para o Desenvolvedor:
- 🚀 Desenvolvimento mais rápido (offline)
- 🧪 Testes isolados e repetíveis
- 💰 Economia de custos de nuvem
- 🔄 Facilidade para resetar dados

### Para o Projeto:
- 🛡️ Ambiente de produção protegido
- 🎯 Testes mais completos
- 📈 Melhor CI/CD
- 🐛 Bugs detectados antes da produção

### Para a Equipe:
- 👥 Desenvolvimento paralelo
- 🔄 Sincronização controlada
- 📝 Histórico de mudanças
- 🎨 Demonstrações flexíveis

## 🎉 Resumo dos Comandos Principais

```bash
# Desenvolvimento diário
npm run start:local          # Desenvolver offline
npm run db:reset            # Limpar banco local
npm run db:seed             # Dados de exemplo

# Teste e deploy
npm run db:sync             # Sincronizar para staging
npm run start:staging       # Testar em nuvem
npm run build:prod          # Deploy produção
```