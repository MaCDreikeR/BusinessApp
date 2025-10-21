# Guia de Desenvolvimento - Múltiplos Ambientes

## Configuração Inicial

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Configuração dos Ambientes
Execute o script de configuração para definir suas variáveis de ambiente:
```bash
node scripts/setup-env.js
```

Ou configure manualmente:
```bash
npm run env:setup
```
E depois edite os arquivos `.env.development` e `.env.production` com suas credenciais.

## Estrutura de Branches

- **`master`**: Código de produção (protegida)
- **`develop`**: Código de desenvolvimento (principal para novos recursos)
- **`feature/*`**: Branches para novos recursos
- **`hotfix/*`**: Correções urgentes para produção

## Comandos de Desenvolvimento

### Desenvolvimento Local
```bash
# Iniciar em modo desenvolvimento
npm run start:dev

# Android em desenvolvimento
npm run android:dev

# iOS em desenvolvimento  
npm run ios:dev

# Web em desenvolvimento
npm run web:dev
```

### Produção/Teste
```bash
# Iniciar em modo produção
npm run start:prod

# Android em produção
npm run android:prod

# iOS em produção
npm run ios:prod

# Web em produção
npm run web:prod
```

### Builds
```bash
# Build de desenvolvimento
npm run build:dev

# Build de preview/staging
npm run build:preview

# Build de produção
npm run build:prod
```

## Workflow de Desenvolvimento

### 1. Criando uma Nova Feature
```bash
# Mude para develop
git checkout develop
git pull origin develop

# Crie uma nova branch
git checkout -b feature/nome-da-feature

# Desenvolva usando ambiente de desenvolvimento
npm run start:dev
```

### 2. Testando
```bash
# Teste localmente
npm run test

# Teste em device de desenvolvimento
npm run build:dev
```

### 3. Enviando para Revisão
```bash
# Commit suas mudanças
git add .
git commit -m "feat: descrição da feature"

# Push da branch
git push origin feature/nome-da-feature

# Crie um Pull Request para develop
```

### 4. Deploy de Staging
```bash
# Merge em develop
git checkout develop
git merge feature/nome-da-feature

# Build de preview para testes
npm run build:preview
```

### 5. Deploy de Produção
```bash
# Merge develop em master
git checkout master
git merge develop

# Build de produção
npm run build:prod

# Tag da versão
git tag v1.0.1
git push origin master --tags
```

## Ambientes

### Desenvolvimento
- **Supabase**: Projeto separado para desenvolvimento
- **Bundle ID**: `com.seuapp.business.dev`
- **App Name**: `BusinessApp Dev`
- **Debug**: Habilitado
- **Logs**: Detalhados

### Produção
- **Supabase**: Projeto de produção
- **Bundle ID**: `com.seuapp.business`
- **App Name**: `BusinessApp`
- **Debug**: Desabilitado
- **Logs**: Apenas erros

## Configuração do Supabase

### Criando Projeto de Desenvolvimento

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Nome: `BusinessApp-Dev`
4. Copie URL e Anon Key
5. Configure no `.env.development`

### Migração do Schema

1. No projeto de produção, acesse SQL Editor
2. Execute o script em `supabase/schema-export.sql`
3. Copie o resultado para o projeto de desenvolvimento
4. Execute no SQL Editor do projeto de desenvolvimento

### RLS (Row Level Security)

Certifique-se de configurar as mesmas políticas de RLS no projeto de desenvolvimento:

```sql
-- Exemplo: política para tabela usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON usuarios  
FOR UPDATE USING (auth.uid() = id);
```

## Variáveis de Ambiente

### Desenvolvimento (`.env.development`)
```env
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_APP_NAME=BusinessApp Dev
EXPO_PUBLIC_SUPABASE_URL=https://dev-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-dev
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_API_TIMEOUT=10000
```

### Produção (`.env.production`)
```env
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_NAME=BusinessApp
EXPO_PUBLIC_SUPABASE_URL=https://prod-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-prod
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_API_TIMEOUT=5000
```

## Melhores Práticas

### Desenvolvimento
- ✅ Sempre trabalhe na branch `develop` ou em feature branches
- ✅ Use o ambiente de desenvolvimento para testes
- ✅ Teste em dispositivos reais quando possível
- ✅ Mantenha o banco de desenvolvimento atualizado com o schema de produção

### Commits
- ✅ Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- ✅ Seja descritivo nas mensagens
- ✅ Faça commits pequenos e frequentes

### Testes
- ✅ Teste em ambos os ambientes antes do merge para master
- ✅ Verifique se as variáveis de ambiente estão corretas
- ✅ Teste notificações push em Development Build

### Segurança
- ❌ NUNCA commite arquivos `.env.*`
- ❌ NUNCA exponha chaves privadas
- ✅ Use RLS no Supabase
- ✅ Valide dados no frontend E backend

## Troubleshooting

### Problema: App não conecta com Supabase
- Verifique se as variáveis de ambiente estão corretas
- Confirme que o projeto Supabase está ativo
- Verifique a conectividade de rede

### Problema: Build falha
- Limpe o cache: `expo start -c`
- Verifique se todas as dependências estão instaladas
- Confirme que o ambiente está configurado corretamente

### Problema: Push notifications não funcionam
- Use Development Build (`npm run build:dev`)
- Verifique as permissões no dispositivo
- Confirme a configuração no `app.config.js`

## Scripts Úteis

```bash
# Limpar cache
expo start -c

# Verificar dependências
npm ls

# Atualizar dependências
npx expo update

# Verificar configuração
npx expo config

# Login no EAS
npx eas login

# Status dos builds
npx eas build:list
```