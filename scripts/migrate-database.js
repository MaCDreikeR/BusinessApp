#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BusinessApp - Migração Completa do Banco de Dados');
console.log('====================================================\n');

const PROJECT_REF = 'oxakpxowhsldczxxtapi';
const BACKUP_DIR = './supabase/backups';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

function runCommand(command, description, allowError = false) {
  try {
    console.log(`📋 ${description}...`);
    const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    console.log(`✅ ${description} - Concluído!\n`);
    return result;
  } catch (error) {
    if (allowError) {
      console.log(`⚠️  ${description} - Aviso: ${error.message.split('\n')[0]}\n`);
      return null;
    }
    console.error(`❌ Erro ao executar: ${description}`);
    console.error(`Comando: ${command}`);
    console.error(`Erro: ${error.message}\n`);
    throw error;
  }
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Diretório de backup criado: ${BACKUP_DIR}\n`);
  }
}

async function main() {
  try {
    console.log('🔍 Verificando pré-requisitos...\n');

    // Verificar se está linkado ao projeto
    try {
      const projects = execSync('supabase projects list', { encoding: 'utf8' });
      if (!projects.includes(PROJECT_REF)) {
        throw new Error('Projeto não encontrado');
      }
      console.log('✅ Projeto encontrado no Supabase');
    } catch (error) {
      console.log('🔗 Fazendo link com o projeto remoto...');
      runCommand(`supabase link --project-ref ${PROJECT_REF}`, 'Linkando projeto');
    }

    // Criar diretório de backup
    ensureBackupDir();

    console.log('📦 ETAPA 1: Backup Completo do Banco Remoto\n');
    
    // Fazer backup completo (esquema + dados) do projeto linkado
    const backupFile = path.join(BACKUP_DIR, `backup-completo-${timestamp}.sql`);
    runCommand(
      `supabase db dump --linked -f "${backupFile}"`,
      'Fazendo backup completo do banco remoto'
    );

    console.log('🏠 ETAPA 2: Preparando Ambiente Local\n');
    
    // Verificar se Docker está rodando
    try {
      runCommand('docker ps', 'Verificando Docker');
    } catch (error) {
      console.log('❌ Docker não está rodando.');
      console.log('👉 Por favor, inicie o Docker Desktop e tente novamente.');
      console.log('   Ou execute: npm run supabase:start');
      process.exit(1);
    }

    // Parar Supabase local se estiver rodando
    runCommand('supabase stop', 'Parando Supabase local', true);

    // Iniciar Supabase local
    runCommand('supabase start', 'Iniciando Supabase local');

    console.log('📥 ETAPA 3: Aplicando Backup no Ambiente Local\n');

    // Resetar banco local completamente
    runCommand('supabase db reset', 'Resetando banco local');

    // Aplicar backup no banco local
    runCommand(
      `supabase db push --local --file "${backupFile}"`,
      'Aplicando backup no banco local',
      true // Permitir erro pois o comando pode não existir
    );

    // Método alternativo se o comando acima não funcionar
    try {
      const localDbUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
      
      // Tentar usar o docker para aplicar o SQL
      runCommand(
        `docker exec supabase_db_BusinessApp psql -U postgres -d postgres -f /tmp/backup.sql`,
        'Aplicando backup via Docker (método alternativo)',
        true
      );
    } catch (error) {
      console.log('⚠️  Método Docker também falhou. Tentando aplicação manual...');
      
      // Último recurso: mostrar instruções manuais
      console.log('\n📋 INSTRUÇÕES MANUAIS:');
      console.log('======================');
      console.log('1. Acesse o Supabase Studio local: http://127.0.0.1:54323');
      console.log('2. Vá para "SQL Editor"');
      console.log(`3. Copie o conteúdo do arquivo: ${backupFile}`);
      console.log('4. Cole no editor SQL e execute');
      console.log('\nOu use um cliente PostgreSQL externo:');
      console.log('- Host: 127.0.0.1');
      console.log('- Port: 54322');
      console.log('- Database: postgres');
      console.log('- Username: postgres');
      console.log('- Password: postgres');
    }

    console.log('� ETAPA 4: Verificação da Migração\n');

    // Verificar status do Supabase local
    const status = runCommand('supabase status', 'Verificando status do Supabase local');
    console.log(status);

    console.log('🎉 PROCESSO DE MIGRAÇÃO INICIADO!\n');
    console.log('📋 Próximos passos:');
    console.log('===================');
    console.log('1. 🚀 Acesse o Supabase Studio local: http://127.0.0.1:54323');
    console.log('2. 📊 Verifique se os dados foram importados corretamente');
    console.log('3. 🧪 Configure sua aplicação para usar o ambiente local');
    console.log('4. 📧 Acesse emails de teste: http://127.0.0.1:54324');
    console.log('');
    console.log(`📁 Backup salvo em: ${backupFile}`);
    console.log('');
    console.log('🔧 Configuração do app para ambiente local:');
    console.log('   - Use as variáveis do arquivo .env.development');
    console.log('   - URL local: http://127.0.0.1:54321');
    console.log('');
    console.log('⚠️  IMPORTANTE: Se a importação automática falhou,');
    console.log('   use as instruções manuais mostradas acima.');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    console.error('\n🔧 Possíveis soluções:');
    console.error('1. Verifique se o Docker Desktop está rodando');
    console.error('2. Verifique sua conexão com a internet');
    console.error('3. Faça login novamente: supabase login');
    console.error('4. Execute manualmente: npm run supabase:start');
    process.exit(1);
  }
}

main().catch(console.error);