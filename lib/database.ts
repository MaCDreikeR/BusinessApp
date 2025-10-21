import * as SQLite from 'expo-sqlite';
import { createClient } from '@supabase/supabase-js';

// Configuração do SQLite local (Expo SQLite)
const localDbName = 'businessapp.db';

// Configuração do Supabase (staging/produção)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Função para obter a conexão do banco local
export async function getLocalDatabase() {
  const db = await SQLite.openDatabaseAsync(localDbName);
  return db;
}

// Função para determinar qual banco usar
export function getDatabaseConfig() {
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'local';
  const useLocalDb = process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true';
  
  if (environment === 'local' || useLocalDb) {
    return { type: 'local', config: { dbName: localDbName } };
  } else {
    return { type: 'supabase', config: { client: supabase } };
  }
}

// Função para inicializar o banco local
export async function initLocalDatabase() {
  const db = await getLocalDatabase();
  
  try {
    // Criar tabela de usuários
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nome_completo TEXT NOT NULL,
        telefone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        estabelecimento_id TEXT,
        is_ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de estabelecimentos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS estabelecimentos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cnpj TEXT,
        telefone TEXT,
        email TEXT,
        endereco TEXT,
        status TEXT NOT NULL DEFAULT 'ativa',
        plano TEXT DEFAULT 'basico',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de clientes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        cpf TEXT,
        data_nascimento TEXT,
        endereco TEXT,
        observacoes TEXT,
        estabelecimento_id TEXT NOT NULL,
        is_ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de agendamentos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL,
        servico_id TEXT,
        data_hora TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'agendado',
        observacoes TEXT,
        valor INTEGER,
        estabelecimento_id TEXT NOT NULL,
        usuario_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de serviços
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS servicos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco INTEGER NOT NULL,
        duracao INTEGER NOT NULL,
        categoria TEXT,
        estabelecimento_id TEXT NOT NULL,
        is_ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Banco local inicializado com sucesso');
    return db;
  } catch (error) {
    console.error('❌ Erro ao inicializar banco local:', error);
    throw error;
  }
}

// Função para resetar o banco local
export async function resetLocalDatabase() {
  const db = await getLocalDatabase();
  
  try {
    await db.execAsync(`DROP TABLE IF EXISTS usuarios;`);
    await db.execAsync(`DROP TABLE IF EXISTS estabelecimentos;`);
    await db.execAsync(`DROP TABLE IF EXISTS clientes;`);
    await db.execAsync(`DROP TABLE IF EXISTS agendamentos;`);
    await db.execAsync(`DROP TABLE IF EXISTS servicos;`);
    
    console.log('✅ Banco local resetado');
    return await initLocalDatabase();
  } catch (error) {
    console.error('❌ Erro ao resetar banco local:', error);
    throw error;
  }
}

// Função para inserir dados de exemplo
export async function seedLocalDatabase() {
  const db = await getLocalDatabase();
  
  try {
    // Estabelecimento de exemplo
    await db.runAsync(`
      INSERT OR REPLACE INTO estabelecimentos (id, nome, cnpj, telefone, email, endereco, status, plano)
      VALUES ('est-1', 'Salão Exemplo', '12.345.678/0001-90', '(11) 99999-9999', 'contato@salaoexemplo.com', 'Rua das Flores, 123', 'ativa', 'premium');
    `);

    // Usuário de exemplo
    await db.runAsync(`
      INSERT OR REPLACE INTO usuarios (id, email, nome_completo, telefone, role, estabelecimento_id, is_ativo)
      VALUES ('user-1', 'admin@salaoexemplo.com', 'Administrador do Salão', '(11) 98888-8888', 'admin', 'est-1', 1);
    `);

    // Clientes de exemplo
    await db.runAsync(`
      INSERT OR REPLACE INTO clientes (id, nome, email, telefone, cpf, estabelecimento_id, is_ativo)
      VALUES 
        ('cli-1', 'Maria Silva', 'maria@email.com', '(11) 97777-7777', '123.456.789-00', 'est-1', 1),
        ('cli-2', 'João Santos', 'joao@email.com', '(11) 96666-6666', '987.654.321-00', 'est-1', 1);
    `);

    // Serviços de exemplo
    await db.runAsync(`
      INSERT OR REPLACE INTO servicos (id, nome, descricao, preco, duracao, categoria, estabelecimento_id, is_ativo)
      VALUES 
        ('serv-1', 'Corte de Cabelo', 'Corte masculino tradicional', 3000, 30, 'Cabelo', 'est-1', 1),
        ('serv-2', 'Escova e Hidratação', 'Escova + tratamento hidratante', 5000, 60, 'Cabelo', 'est-1', 1),
        ('serv-3', 'Manicure', 'Cuidados com as unhas das mãos', 2500, 45, 'Unhas', 'est-1', 1);
    `);

    // Agendamentos de exemplo
    const hoje = new Date().toISOString().split('T')[0];
    await db.runAsync(`
      INSERT OR REPLACE INTO agendamentos (id, cliente_id, servico_id, data_hora, status, valor, estabelecimento_id, usuario_id)
      VALUES 
        ('ag-1', 'cli-1', 'serv-1', '${hoje} 10:00:00', 'agendado', 3000, 'est-1', 'user-1'),
        ('ag-2', 'cli-2', 'serv-2', '${hoje} 14:00:00', 'agendado', 5000, 'est-1', 'user-1');
    `);

    console.log('✅ Dados de exemplo inseridos com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inserir dados de exemplo:', error);
    throw error;
  }
}

export { supabase };
export default { getLocalDatabase, getDatabaseConfig, initLocalDatabase, resetLocalDatabase, seedLocalDatabase, supabase };