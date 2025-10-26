import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Função para verificar se estamos em ambiente de desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';

// URLs e chaves baseadas no ambiente
const supabaseUrl = isDevelopment 
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL || 'http://127.0.0.1:54321'
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey = isDevelopment
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlN1cGFiYXNlTG9jYWwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTQzNzkwMCwiZXhwIjoxOTYwOTkzOTAwfQ.wNe5blfAa8_HlJLvOZjLy9lm1P7LcQQXcLpPPa_CJ9o'
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Implementação de armazenamento híbrido (mantém a implementação existente)
const storage = {
  getItem: async (key: string) => {
    try {
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue) return secureValue;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Erro ao obter item do storage:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      if (value.length <= 2048) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Erro ao armazenar item:', error);
    }
  },

  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover item:', error);
    }
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não estão definidas!');
}

console.log(`🔧 Supabase configurado para: ${isDevelopment ? 'DESENVOLVIMENTO LOCAL' : 'PRODUÇÃO'}`);
console.log(`📡 URL: ${supabaseUrl}`);

// Criação do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'business-app',
      'x-environment': isDevelopment ? 'local' : 'production',
    },
  },
});

// Função para alternar entre ambiente local e remoto
export async function switchToLocal() {
  console.log('🔄 Alternando para ambiente local...');
  // Esta função pode ser útil para debug
  return createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlN1cGFiYXNlTG9jYWwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTQzNzkwMCwiZXhwIjoxOTYwOTkzOTAwfQ.wNe5blfAa8_HlJLvOZjLy9lm1P7LcQQXcLpPPa_CJ9o');
}

// Função para testar a conexão
export async function testConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    const { data, error } = await supabase.from('test').select('*').limit(1);
    if (error && !error.message.includes('relation "test" does not exist')) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }
    console.log('✅ Conexão bem sucedida!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    return false;
  }
}

// Função auxiliar para verificar o estado da sessão
export async function checkSession() {
  try {
    console.log('🔍 Verificando estado da sessão...');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Erro ao verificar sessão:', error);
      return null;
    }
    console.log(`📋 Estado da sessão: ${session ? '🟢 ativa' : '🔴 não ativa'}`);
    return session;
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    return null;
  }
}

// Função para verificar e criar a tabela de usuários
export async function verificarTabelaUsuarios() {
  try {
    const { data: tableExists, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    if (checkError) {
      const { error: createError } = await supabase.rpc('create_usuarios_table');
      if (createError) throw createError;
    }

    const { data: usuarios, error: selectError } = await supabase
      .from('usuarios')
      .select('*');

    if (selectError) throw selectError;

    if (!usuarios || usuarios.length === 0) {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([
          {
            nome_completo: 'Administrador',
            email: 'admin@businessapp.com',
            is_principal: true,
            nivel_acesso_id: '1',
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar tabela de usuários:', error);
    return false;
  }
}

export default supabase;