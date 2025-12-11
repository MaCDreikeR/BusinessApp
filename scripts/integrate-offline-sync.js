#!/usr/bin/env node

/**
 * Script para Integrar Sincronização Offline em Todo o App
 * 
 * Adiciona imports e substitui operações do Supabase por versões offline-aware
 */

const fs = require('fs');
const path = require('path');

// Arquivos a serem modificados
const filesToUpdate = [
  'app/(app)/clientes/[id].tsx',
  'app/(app)/agenda/novo.tsx',
  'app/(app)/agenda/[id].tsx',
  'app/(app)/servicos.tsx',
  'app/(app)/produtos.tsx',
  'app/(app)/comandas.tsx',
  'app/(app)/vendas.tsx',
  'app/(app)/orcamentos/novo.tsx',
  'app/(app)/orcamentos/[id].tsx',
  'app/(app)/fornecedores.tsx',
  'app/(app)/pacotes.tsx',
];

// Import a ser adicionado
const importToAdd = "import { offlineInsert, offlineUpdate, offlineDelete, getOfflineFeedback } from '../../../services/offlineSupabase';";

function addImportIfNeeded(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Verifica se já tem o import
  if (content.includes('offlineSupabase')) {
    console.log(`✅ Já integrado: ${filePath}`);
    return;
  }

  // Adiciona import após outros imports
  const lastImportIndex = content.lastIndexOf("from '");
  if (lastImportIndex === -1) return;

  const endOfLineIndex = content.indexOf('\n', lastImportIndex);
  const beforeImport = content.substring(0, endOfLineIndex + 1);
  const afterImport = content.substring(endOfLineIndex + 1);

  const newContent = beforeImport + importToAdd + '\n' + afterImport;

  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`✏️  Import adicionado: ${filePath}`);
}

console.log('🚀 Iniciando integração offline em todos os arquivos...\n');

filesToUpdate.forEach(file => {
  try {
    addImportIfFound(file);
  } catch (error) {
    console.error(`❌ Erro em ${file}:`, error.message);
  }
});

console.log('\n✅ Integração completa!');
console.log('\n📝 PRÓXIMOS PASSOS MANUAIS:');
console.log('1. Substituir supabase.from().insert() por offlineInsert()');
console.log('2. Substituir supabase.from().update() por offlineUpdate()');
console.log('3. Substituir supabase.from().delete() por offlineDelete()');
console.log('4. Adicionar feedback com getOfflineFeedback()');
console.log('\nVer docs/sincronizacao-offline.md para exemplos');
