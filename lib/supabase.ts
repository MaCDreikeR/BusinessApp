import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Implementação de armazenamento móvel (SecureStore + AsyncStorage)
const storage = {
  getItem: async (key: string) => {
    try {
      // Tenta primeiro obter do SecureStore
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue) return secureValue;

      // Se não encontrar, tenta do AsyncStorage
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Erro ao obter item do storage:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      // Se o valor for menor que 2048 bytes, armazena no SecureStore
      if (value.length <= 2048) {
        await SecureStore.setItemAsync(key, value);
      } else {
        // Se for maior, armazena no AsyncStorage
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

// Verifica se as variáveis de ambiente estão definidas
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Removendo o parâmetro de cache
// const supabaseUrlWithCache = `${supabaseUrl}?cache=${Date.now()}`;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão definidas!');
  throw new Error('Variáveis de ambiente do Supabase não estão definidas!');
}

console.log('Iniciando configuração do Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey.substring(0, 10) + '...');

// Criação do cliente Supabase com configurações adicionais
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
    },
  },
});

// Função para testar a conexão
export async function testConnection() {
  try {
    console.log('Testando conexão com Supabase...');
    const { data, error } = await supabase.from('test').select('*').limit(1);
    if (error) {
      console.error('Erro na conexão:', error);
      return false;
    }
    console.log('Conexão bem sucedida!');
    return true;
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return false;
  }
}

// Função auxiliar para verificar o estado da sessão
export async function checkSession() {
  try {
    console.log('Verificando estado da sessão...');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return null;
    }
    console.log('Estado da sessão:', session ? 'ativa' : 'não ativa');
    return session;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
}

// Função para verificar e criar a tabela de usuários
export async function verificarTabelaUsuarios() {
  try {
    // Verifica se a tabela existe
    const { data: tableExists, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    if (checkError) {
      // Se a tabela não existe, cria ela
      const { error: createError } = await supabase.rpc('create_usuarios_table');
      if (createError) throw createError;
    }

    // Verifica se existem usuários
    const { data: usuarios, error: selectError } = await supabase
      .from('usuarios')
      .select('*');

    if (selectError) throw selectError;

    // Se não houver usuários, cria um admin padrão
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
    console.error('Erro ao verificar tabela de usuários:', error);
    return false;
  }
}

export default supabase; 