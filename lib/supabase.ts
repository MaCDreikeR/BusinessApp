import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================================================
// Detecta automaticamente se está em desenvolvimento local ou produção
// Para forçar ambiente local, defina EXPO_PUBLIC_SUPABASE_URL_LOCAL no .env

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// URLs e chaves baseadas no ambiente
const supabaseUrl = isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey = isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================================================
// STORAGE HÍBRIDO (SecureStore + AsyncStorage)
// ============================================================================
// Usa SecureStore para tokens pequenos (mais seguro)
// Usa AsyncStorage para dados maiores (sem limite de 2KB)

const storage = {
  getItem: async (key: string) => {
    try {
      // Tenta primeiro obter do SecureStore
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue) return secureValue;

      // Se não encontrar, tenta do AsyncStorage
      return await AsyncStorage.getItem(key);
    } catch (error) {
      logger.error('Erro ao obter item do storage:', error);
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
      logger.error('Erro ao armazenar item:', error);
    }
  },

  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('Erro ao remover item:', error);
    }
  }
};

// ============================================================================
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// ============================================================================

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `
    ❌ ERRO: Variáveis de ambiente do Supabase não estão definidas!
    
    Por favor, configure:
    ${isDevelopment ? '- EXPO_PUBLIC_SUPABASE_URL_LOCAL (ou EXPO_PUBLIC_SUPABASE_URL)' : '- EXPO_PUBLIC_SUPABASE_URL'}
    ${isDevelopment ? '- EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL (ou EXPO_PUBLIC_SUPABASE_ANON_KEY)' : '- EXPO_PUBLIC_SUPABASE_ANON_KEY'}
    
    Veja o arquivo .env.example para mais informações.
  `;
  logger.error(errorMsg);
  throw new Error('Variáveis de ambiente do Supabase não estão definidas!');
}

// Log de inicialização
if (__DEV__) {
  logger.group('Supabase Configuração');
  logger.info(`Ambiente: ${isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL ? 'DESENVOLVIMENTO LOCAL' : 'PRODUÇÃO'}`);
  logger.info(`URL: ${supabaseUrl}`);
  logger.info(`Key: ${supabaseAnonKey.substring(0, 10)}...`);
  logger.groupEnd();
}

// ============================================================================
// CLIENTE SUPABASE
// ============================================================================

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
      'x-environment': isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL ? 'local' : 'production',
    },
  },
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Testa a conexão com o Supabase
 * @returns Promise<boolean> - true se conectado, false caso contrário
 */
export async function testConnection() {
  try {
    logger.debug('Testando conexão com Supabase...');
    
    const { data, error } = await supabase.from('usuarios').select('id').limit(1);
    
    // Ignora erro de tabela não existente (banco pode estar vazio)
    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      logger.error('Erro na conexão:', error);
      return false;
    }
    
    logger.success('Conexão bem sucedida!');
    return true;
  } catch (error) {
    logger.error('Erro ao testar conexão:', error);
    return false;
  }
}

/**
 * Verifica o estado da sessão atual
 * @returns Promise<Session | null> - sessão ativa ou null
 */
export async function checkSession() {
  try {
    logger.debug('Verificando estado da sessão...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Erro ao verificar sessão:', error);
      return null;
    }
    
    logger.info(`Estado da sessão: ${session ? 'ativa' : 'não ativa'}`);
    
    return session;
  } catch (error) {
    logger.error('Erro ao verificar sessão:', error);
    return null;
  }
}

/**
 * Verifica e cria a tabela de usuários se não existir
 * @deprecated Esta função pode não ser necessária com migrações adequadas
 * @returns Promise<boolean>
 */
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
    logger.error('Erro ao verificar tabela de usuários:', error);
    return false;
  }
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export default supabase; 