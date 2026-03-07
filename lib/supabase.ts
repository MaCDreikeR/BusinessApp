import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { logger } from '../utils/logger';
import { debugLogger } from '../utils/debugLogger';
import { withTimeout } from '../utils/withTimeout';

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
    // 🔥 NOVO: Configurações de refresh e timeout
    flowType: 'pkce', // Mais seguro para mobile
    debug: __DEV__, // Logs detalhados em desenvolvimento
  },
  global: {
    headers: {
      'x-application-name': 'business-app',
      'x-environment': isDevelopment && process.env.EXPO_PUBLIC_SUPABASE_URL_LOCAL ? 'local' : 'production',
    },
    // 🔥 Timeout global para requisições com tratamento adequado de erros
    fetch: async (url, options = {}) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const requestUrl = typeof url === 'string' ? url : url.toString();
      const shortUrl = requestUrl.replace(supabaseUrl, '').split('?')[0] || '/';

      debugLogger.debug('SupabaseFetch', `REQ ${requestId} ${shortUrl}`);
      console.info(`[SupabaseFetch] REQ ${requestId} ${shortUrl}`);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const elapsedMs = Date.now() - startedAt;
        debugLogger.info(
          'SupabaseFetch',
          `RES ${requestId} ${shortUrl} ${response.status} (${elapsedMs}ms)`
        );
        console.info(`[SupabaseFetch] RES ${requestId} ${shortUrl} ${response.status} (${elapsedMs}ms)`);

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        const elapsedMs = Date.now() - startedAt;

        debugLogger.error('SupabaseFetch', `ERR ${requestId} ${shortUrl} (${elapsedMs}ms)`, {
          name: (error as any)?.name,
          message: (error as any)?.message,
        });
        console.error(
          `[SupabaseFetch] ERR ${requestId} ${shortUrl} (${elapsedMs}ms)`,
          (error as any)?.name,
          (error as any)?.message
        );
        
        // Se foi abort por timeout, lança erro adequado sem tentar criar Response inválida
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`[SupabaseFetch] TIMEOUT ${requestId} ${shortUrl} (${elapsedMs}ms)`);
          throw new Error('Request timeout: A requisição excedeu o tempo limite de 30 segundos');
        }
        
        // Re-lança outros erros
        throw error;
      }
    },
  },
  // 🔥 NOVO: Opções do realtime (se usado)
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

let reconnectInProgress = false;
let reconnectAttemptSeq = 0;
const RECONNECT_STEP_TIMEOUT_MS = 12000;
const RECONNECT_LOCK_TIMEOUT_MS = 45000;

export async function forceSupabaseReconnect(reason: string = 'manual') {
  if (reconnectInProgress) {
    debugLogger.debug('SupabaseReconnect', 'Reconexão já em andamento - ignorado');
    console.info('[SupabaseReconnect] Reconexão já em andamento - ignorado');
    return;
  }

  reconnectInProgress = true;
  const attemptId = ++reconnectAttemptSeq;
  const startedAt = Date.now();

  const lockWatchdog = setTimeout(() => {
    if (!reconnectInProgress || attemptId !== reconnectAttemptSeq) return;

    reconnectInProgress = false;
    const elapsedMs = Date.now() - startedAt;
    debugLogger.error('SupabaseReconnect', 'Watchdog forçou liberação do lock de reconexão', {
      attemptId,
      elapsedMs,
    });
    console.error(`[SupabaseReconnect] WATCHDOG_UNLOCK attempt=${attemptId} (${elapsedMs}ms)`);
  }, RECONNECT_LOCK_TIMEOUT_MS);

  try {
    debugLogger.info('SupabaseReconnect', `Iniciando reconexão (${reason})`, { attemptId });
    console.info(`[SupabaseReconnect] Iniciando reconexão (${reason}) attempt=${attemptId}`);

    try {
      supabase.realtime.disconnect();
    } catch (disconnectError) {
      debugLogger.warn('SupabaseReconnect', 'Falha ao desconectar realtime (seguindo)', {
        error: String(disconnectError),
      });
      console.warn('[SupabaseReconnect] Falha ao desconectar realtime (seguindo)', String(disconnectError));
    }

    supabase.realtime.connect();

    const { data: { session }, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      RECONNECT_STEP_TIMEOUT_MS,
      'SupabaseReconnect: Timeout ao obter sessão'
    );
    
    if (sessionError) {
      debugLogger.error('SupabaseReconnect', 'Erro ao obter sessão na reconexão', {
        error: String(sessionError),
        attemptId,
      });
      console.error('[SupabaseReconnect] Erro ao obter sessão na reconexão', String(sessionError));
      // NÃO usar return aqui - deixa o finally limpar o lock
    } else if (!session?.user?.id) {
      debugLogger.warn('SupabaseReconnect', 'Sem sessão ativa durante reconexão');
      console.warn('[SupabaseReconnect] Sem sessão ativa durante reconexão');
      // NÃO usar return aqui - deixa o finally limpar o lock
    } else {
      // Health check simples para garantir HTTP ativo após retorno do app.
      const { error: pingError } = await withTimeout(
        supabase
          .from('usuarios')
          .select('id')
          .eq('id', session.user.id)
          .limit(1)
          .maybeSingle(),
        RECONNECT_STEP_TIMEOUT_MS,
        'SupabaseReconnect: Timeout no health check'
      );

      if (pingError) {
        debugLogger.error('SupabaseReconnect', 'Health check falhou após reconexão', {
          code: (pingError as any)?.code,
          message: (pingError as any)?.message,
          attemptId,
        });
        console.error(
          '[SupabaseReconnect] Health check falhou após reconexão',
          (pingError as any)?.code,
          (pingError as any)?.message
        );
      } else {
        debugLogger.info('SupabaseReconnect', 'Health check OK após reconexão');
        console.info('[SupabaseReconnect] Health check OK após reconexão');
      }
    }
  } catch (error) {
    debugLogger.error('SupabaseReconnect', 'Erro inesperado na reconexão', { error: String(error) });
    console.error('[SupabaseReconnect] Erro inesperado na reconexão', String(error));
  } finally {
    clearTimeout(lockWatchdog);
    reconnectInProgress = false;
    const elapsedMs = Date.now() - startedAt;
    console.info(`[SupabaseReconnect] Finalizou attempt=${attemptId} em ${elapsedMs}ms`);
  }
}

// Reconexão automática ao voltar para foreground.
AppState.addEventListener('change', async (state) => {
  if (state !== 'active') return;
  void forceSupabaseReconnect('AppState active');
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
// GERENCIAMENTO DE ESTADO DO APP (DOZE MODE / BACKGROUND)
// ============================================================================

AppState.addEventListener('change', async (state) => {
  if (state === 'active') {
    // App voltou para o primeiro plano (acordou)
    // 1. Retoma o ciclo de vida da sessão
    supabase.auth.startAutoRefresh();
    // 2. Executa a sua função de reconexão já existente
    void forceSupabaseReconnect('AppState active');
  } else if (state === 'background' || state === 'inactive') {
    // App foi minimizado ou a tela desligou (dormiu)
    // 1. Pausa a renovação de tokens para não falhar sem rede
    supabase.auth.stopAutoRefresh();
    
    // 2. Derruba o WebSocket ativamente antes que o Android o mate.
    // Isso evita que o Supabase fique esperando uma conexão zumbi.
    try {
      supabase.realtime.disconnect();
      debugLogger.info('SupabaseAppState', 'Realtime desconectado preventivamente no background');
    } catch (e) {
       // Ignora silenciosamente
    }
  }
});

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export default supabase;