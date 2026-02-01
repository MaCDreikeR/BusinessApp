#!/usr/bin/env node

/**
 * Script para aplicar migration no Supabase
 * Uso: node scripts/apply-migration.js <arquivo-migration.sql>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase (usa service role para operações admin)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente EXPO_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
  try {
    console.log(`🔄 Aplicando migration: ${migrationFile}`);
    
    // Ler o arquivo SQL
    const migrationPath = path.resolve(process.cwd(), migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Arquivo não encontrado: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migration via RPC ou SQL direto
    // Nota: O Supabase não tem um endpoint direto para executar SQL arbitrário
    // via API por questões de segurança. Você precisa usar o dashboard ou CLI.
    
    console.log('\n📝 Conteúdo da migration:');
    console.log('━'.repeat(80));
    console.log(sql);
    console.log('━'.repeat(80));
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('Para aplicar esta migration, você tem duas opções:\n');
    console.log('1. Via Dashboard do Supabase:');
    console.log('   - Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql');
    console.log('   - Cole o SQL acima e execute\n');
    console.log('2. Via Supabase CLI:');
    console.log('   - Instale: npm install -g supabase');
    console.log('   - Execute: supabase db push');
    console.log('   - Ou: supabase db execute --file ' + migrationFile);
    
  } catch (error) {
    console.error('❌ Erro ao processar migration:', error);
    process.exit(1);
  }
}

// Obter o arquivo de migration dos argumentos
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Uso: node scripts/apply-migration.js <arquivo-migration.sql>');
  console.error('   Exemplo: node scripts/apply-migration.js supabase/migrations/20260201_update_configuracoes_estabelecimento.sql');
  process.exit(1);
}

applyMigration(migrationFile);
