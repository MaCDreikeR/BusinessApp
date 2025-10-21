#!/usr/bin/env node

/**
 * Script para gerenciamento do banco local (SQLite via Expo)
 * Usage: 
 * - node scripts/db-migrate.js init
 * - node scripts/db-migrate.js reset
 * - node scripts/db-migrate.js seed
 * - node scripts/db-migrate.js sync-to-staging
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const command = process.argv[2];

switch (command) {
  case 'init':
    console.log('🔄 Inicializando banco local...');
    initDatabase();
    break;

  case 'reset':
    console.log('�️ Resetando banco local...');
    resetLocalDatabase();
    break;

  case 'seed':
    console.log('🌱 Inserindo dados de exemplo...');
    seedDatabase();
    break;

  case 'sync-to-staging':
    console.log('� Sincronizando dados locais para staging...');
    syncToStaging();
    break;

  case 'test':
    console.log('🧪 Testando conexão com banco...');
    testDatabase();
    break;

  default:
    console.log('Comandos disponíveis:');
    console.log('  init         - Inicializa o banco local');
    console.log('  reset        - Reseta o banco local');
    console.log('  seed         - Insere dados de exemplo');
    console.log('  sync-to-staging - Sincroniza dados locais para staging');
    console.log('  test         - Testa conexão com banco');
}

function initDatabase() {
  console.log('✅ Banco será inicializado automaticamente no primeiro uso do app');
  console.log('📝 Para inserir dados de exemplo, execute: npm run db:seed');
}

function resetLocalDatabase() {
  console.log('✅ Use a função resetLocalDatabase() na aplicação');
  console.log('📝 Ou inicie o app em modo desenvolvimento para usar o banco limpo');
}

function seedDatabase() {
  console.log('✅ Use a função seedLocalDatabase() na aplicação');
  console.log('📝 Ou inicie o app em modo desenvolvimento que os dados serão inseridos automaticamente');
}

function testDatabase() {
  console.log('✅ Teste será feito automaticamente quando o app iniciar');
  console.log('📝 Execute: npm run start:local para testar o banco');
}

async function syncToStaging() {
  console.log('🔄 Funcionalidade de sincronização em desenvolvimento...');
  console.log('� Esta funcionalidade estará disponível na próxima versão');
}