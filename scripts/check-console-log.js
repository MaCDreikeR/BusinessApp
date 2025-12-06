#!/usr/bin/env node

/**
 * Script de verificação de console.log em produção
 * 
 * Este script verifica se há console.log, console.warn ou console.error
 * no código de produção (excluindo utils/logger.ts onde é esperado).
 * 
 * Uso:
 * - npm run check:console (adicionar ao package.json)
 * - Como pre-commit hook
 * - Em pipelines CI/CD
 */

const { execSync } = require('child_process');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const DIRS_TO_CHECK = [
  'app',
  'contexts',
  'hooks',
  'lib',
  'services',
  'components',
];

const EXCLUDE_FILES = [
  'utils/logger.ts', // Logger precisa usar console internamente
];

console.log(`${COLORS.blue}🔍 Verificando console.log em produção...${COLORS.reset}\n`);

try {
  const dirsToCheckPaths = DIRS_TO_CHECK.map(dir => path.join(process.cwd(), dir));
  
  // Construir comando grep
  const grepCommand = `grep -r "console\\.(log|warn|error)" --include="*.ts" --include="*.tsx" ${dirsToCheckPaths.join(' ')} 2>/dev/null | grep -v node_modules || true`;
  
  const result = execSync(grepCommand, { encoding: 'utf-8' });
  
  if (!result.trim()) {
    console.log(`${COLORS.green}✅ Nenhum console.log encontrado no código de produção!${COLORS.reset}`);
    console.log(`${COLORS.green}✨ Todos os logs estão usando o sistema logger.${COLORS.reset}\n`);
    process.exit(0);
  }
  
  // Filtrar resultados excluindo arquivos permitidos
  const lines = result.trim().split('\n');
  const violations = lines.filter(line => {
    return !EXCLUDE_FILES.some(excluded => line.includes(excluded));
  });
  
  if (violations.length === 0) {
    console.log(`${COLORS.green}✅ Nenhum console.log encontrado no código de produção!${COLORS.reset}`);
    console.log(`${COLORS.green}✨ Todos os logs estão usando o sistema logger.${COLORS.reset}\n`);
    process.exit(0);
  }
  
  // Encontrou console.log em produção
  console.log(`${COLORS.red}❌ Encontrados ${violations.length} console.log em produção:${COLORS.reset}\n`);
  
  violations.forEach(line => {
    const [file, ...rest] = line.split(':');
    const code = rest.join(':');
    console.log(`${COLORS.yellow}📁 ${file}${COLORS.reset}`);
    console.log(`   ${code.trim()}\n`);
  });
  
  console.log(`${COLORS.red}💡 Use o sistema logger ao invés de console:${COLORS.reset}`);
  console.log(`   ${COLORS.blue}import { logger } from '@utils/logger';${COLORS.reset}`);
  console.log(`   ${COLORS.blue}logger.debug()  // Para desenvolvimento${COLORS.reset}`);
  console.log(`   ${COLORS.blue}logger.error()  // Para erros${COLORS.reset}`);
  console.log(`   ${COLORS.blue}logger.warn()   // Para avisos${COLORS.reset}`);
  console.log(`   ${COLORS.blue}logger.info()   // Para informações${COLORS.reset}\n`);
  
  process.exit(1);
  
} catch (error) {
  console.error(`${COLORS.red}❌ Erro ao executar verificação:${COLORS.reset}`, error.message);
  process.exit(1);
}
