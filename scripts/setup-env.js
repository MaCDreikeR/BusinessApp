#!/usr/bin/env node

/**
 * Script para configurar as variáveis de ambiente
 * Execute: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🚀 Configuração dos Ambientes BusinessApp\n');
  
  console.log('📝 Vamos configurar seus ambientes de desenvolvimento e produção.');
  console.log('Você precisará das informações do Supabase para ambos os projetos.\n');

  // Desenvolvimento
  console.log('🔧 AMBIENTE DE DESENVOLVIMENTO:');
  const devSupabaseUrl = await question('URL do Supabase (dev): ');
  const devSupabaseKey = await question('Anon Key do Supabase (dev): ');

  // Produção
  console.log('\n🏭 AMBIENTE DE PRODUÇÃO:');
  const prodSupabaseUrl = await question('URL do Supabase (prod): ');
  const prodSupabaseKey = await question('Anon Key do Supabase (prod): ');

  // Criar arquivos .env
  const devEnvContent = `# Configuração para ambiente de desenvolvimento
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_APP_NAME=BusinessApp Dev

# Supabase - Desenvolvimento
EXPO_PUBLIC_SUPABASE_URL=${devSupabaseUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${devSupabaseKey}

# Configurações específicas de desenvolvimento
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_API_TIMEOUT=10000`;

  const prodEnvContent = `# Configuração para ambiente de produção
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_NAME=BusinessApp

# Supabase - Produção
EXPO_PUBLIC_SUPABASE_URL=${prodSupabaseUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${prodSupabaseKey}

# Configurações específicas de produção
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_API_TIMEOUT=5000`;

  // Escrever arquivos
  fs.writeFileSync(path.join(__dirname, '..', '.env.development'), devEnvContent);
  fs.writeFileSync(path.join(__dirname, '..', '.env.production'), prodEnvContent);

  console.log('\n✅ Arquivos de ambiente criados com sucesso!');
  console.log('📁 .env.development');
  console.log('📁 .env.production');
  
  console.log('\n🔄 Próximos passos:');
  console.log('1. Copie o schema do seu banco de produção para o de desenvolvimento');
  console.log('2. Execute: npm install');
  console.log('3. Para desenvolvimento: npm run start:dev');
  console.log('4. Para produção: npm run start:prod');

  rl.close();
}

setupEnvironment().catch(console.error);