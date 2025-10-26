#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BusinessApp - Setup Supabase Local');
console.log('=====================================\n');

function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} - Concluído!\n`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar: ${description}`);
    console.error(`Comando: ${command}`);
    console.error(`Erro: ${error.message}\n`);
    return false;
  }
}

function checkDockerInstallation() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function checkSupabaseInstallation() {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Verificando pré-requisitos...\n');

  // Verificar Supabase CLI
  if (checkSupabaseInstallation()) {
    console.log('✅ Supabase CLI encontrado');
  } else {
    console.log('❌ Supabase CLI não encontrado');
    console.log('👉 Instale via: https://supabase.com/docs/guides/cli/getting-started#installing-the-supabase-cli\n');
    process.exit(1);
  }

  // Verificar Docker
  if (checkDockerInstallation()) {
    console.log('✅ Docker encontrado');
  } else {
    console.log('❌ Docker não encontrado');
    console.log('👉 Instale Docker Desktop: https://docs.docker.com/desktop/install/windows-install/');
    console.log('⚠️  Você pode continuar a configuração, mas precisará do Docker para rodar o ambiente local.\n');
  }

  console.log('\n🔧 Configurando ambiente...\n');

  // Verificar se já foi inicializado
  if (fs.existsSync('./supabase/config.toml')) {
    console.log('✅ Projeto Supabase já inicializado');
  } else {
    if (!runCommand('supabase init', 'Inicializando projeto Supabase')) {
      process.exit(1);
    }
  }

  // Verificar arquivos de ambiente
  const envDev = './.env.development';
  if (!fs.existsSync(envDev)) {
    console.log('📝 Criando arquivo .env.development...');
    fs.writeFileSync(envDev, `# Supabase Local Development Environment
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlN1cGFiYXNlTG9jYWwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTQzNzkwMCwiZXhwIjoxOTYwOTkzOTAwfQ.wNe5blfAa8_HlJLvOZjLy9lm1P7LcQQXcLpPPa_CJ9o
`);
    console.log('✅ Arquivo .env.development criado');
  } else {
    console.log('✅ Arquivo .env.development já existe');
  }

  console.log('\n🎯 Próximos passos:');
  console.log('===================');
  
  if (!checkDockerInstallation()) {
    console.log('1. 🐳 Instale o Docker Desktop');
    console.log('   https://docs.docker.com/desktop/install/windows-install/');
    console.log('');
  }
  
  console.log('2. 🚀 Inicie o ambiente local:');
  console.log('   npm run supabase:start');
  console.log('');
  console.log('3. 🎨 Acesse o Supabase Studio:');
  console.log('   npm run supabase:studio');
  console.log('   ou http://127.0.0.1:54323');
  console.log('');
  console.log('4. 🧪 Inicie o desenvolvimento:');
  console.log('   npm run dev:local');
  console.log('');
  console.log('5. 📧 Visualize emails de teste:');
  console.log('   npm run supabase:inbucket');
  console.log('   ou http://127.0.0.1:54324');
  console.log('');
  console.log('📚 Para mais informações, consulte: SETUP_SUPABASE_LOCAL.md');
  console.log('');
  console.log('🎉 Setup concluído com sucesso!');
}

main().catch(console.error);