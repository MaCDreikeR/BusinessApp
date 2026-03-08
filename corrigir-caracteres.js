/**
 * Script para corrigir caracteres corrompidos no projeto
 * Problema: caracteres como "novo", "notific", "circle" etc.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

// Extensões de arquivos para corrigir
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Mapeamento de substituições (padrão corrompido -> correção)
const replacements = [
  // Data.now() e Date.now
  ['Date.now()', 'Date.now()'],
  ['Date.now', 'Date.now'],
  
  // normalize
  ['.normalize(', '.normalize('],
  ['normalize', 'normalize'],
  
  // novo/nova
  ['novo', 'novo'],
  ['nova', 'nova'],
  ['novos', 'novos'],
  ['novas', 'novas'],
  
  // notificações
  ['notific', 'notific'],
  ['notificaç', 'notificaç'],
  
  // circle (ícones)
  ['circle', 'circle'],
  ['Circle', 'Circle'],
  
  // expired
  ['expired', 'expired'],
  ['expires', 'expires'],
  ['expiresAt', 'expiresAt'],
  
  // verificado
  ['verificado', 'verificado'],
  
  // otros
  ['NodeJS', 'NodeJS'],
];

// Contador
let filesModified = 0;
let totalReplacements = 0;

// Função para verificar se é arquivo de código
function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
}

// Função para corrigir um arquivo
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;

  for (const [wrong, correct] of replacements) {
    const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      fileReplacements += matches.length;
      content = content.replace(regex, correct);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    totalReplacements += fileReplacements;
    console.log(`✅ ${filePath} (${fileReplacements} substituições)`);
    return true;
  }
  return false;
}

// Função recursiva para buscar arquivos
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Pular node_modules, .git, android, ios
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'android', 'ios', '.expo'].includes(file)) {
        walkDir(filePath);
      }
    } else if (isCodeFile(filePath)) {
      fixFile(filePath);
    }
  }
}

// Executar
console.log('🔧 Corrigindo caracteres corrompidos...\n');
console.log('Padrões a corrigir:');
replacements.forEach(([wrong, correct], i) => {
  console.log(`  ${i + 1}. "${wrong}" -> "${correct}"`);
});
console.log('');

walkDir(projectRoot);

console.log(`\n📊 Resumo:`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Total de substituições: ${totalReplacements}`);
console.log(`\n✅ Concluído!`);

