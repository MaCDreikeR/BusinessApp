/**
 * Sistema de Logging Condicional para BusinessApp
 * 
 * Este módulo fornece funções de logging que só executam em modo de desenvolvimento,
 * evitando logs desnecessários em produção e melhorando a performance.
 * 
 * @module utils/logger
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/**
 * Determina se estamos em ambiente de desenvolvimento
 */
const isDevelopment = __DEV__;

/**
 * Configurações de logging
 */
const config = {
  // Habilita/desabilita logs por tipo
  enableLog: isDevelopment,
  enableWarn: isDevelopment,
  enableError: true, // Erros sempre habilitados
  enableDebug: isDevelopment,
  enableInfo: isDevelopment,
  
  // Prefixos para identificação visual
  prefix: {
    log: '📝',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    info: 'ℹ️',
    success: '✅',
  },
  
  // Cores (para terminais que suportam)
  colors: {
    log: '\x1b[0m',      // Reset
    warn: '\x1b[33m',    // Amarelo
    error: '\x1b[31m',   // Vermelho
    debug: '\x1b[36m',   // Ciano
    info: '\x1b[34m',    // Azul
    success: '\x1b[32m', // Verde
    reset: '\x1b[0m',
  },
};

// ============================================================================
// FUNÇÕES DE LOGGING
// ============================================================================

/**
 * Log normal - apenas em desenvolvimento
 * @param args - Argumentos a serem logados
 */
const log = (...args: any[]) => {
  if (config.enableLog) {
    console.log(config.prefix.log, ...args);
  }
};

/**
 * Warning - apenas em desenvolvimento
 * @param args - Argumentos a serem logados
 */
const warn = (...args: any[]) => {
  if (config.enableWarn) {
    console.warn(config.prefix.warn, ...args);
  }
};

/**
 * Error - sempre habilitado (importante para debug em produção)
 * @param args - Argumentos a serem logados
 */
const error = (...args: any[]) => {
  if (config.enableError) {
    console.error(config.prefix.error, ...args);
  }
};

/**
 * Debug - apenas em desenvolvimento
 * Útil para logs mais verbosos durante desenvolvimento
 * @param args - Argumentos a serem logados
 */
const debug = (...args: any[]) => {
  if (config.enableDebug) {
    console.log(config.prefix.debug, '[DEBUG]', ...args);
  }
};

/**
 * Info - apenas em desenvolvimento
 * Para informações importantes mas não críticas
 * @param args - Argumentos a serem logados
 */
const info = (...args: any[]) => {
  if (config.enableInfo) {
    console.log(config.prefix.info, '[INFO]', ...args);
  }
};

/**
 * Success - apenas em desenvolvimento
 * Para indicar operações bem-sucedidas
 * @param args - Argumentos a serem logados
 */
const success = (...args: any[]) => {
  if (config.enableLog) {
    console.log(config.prefix.success, '[SUCCESS]', ...args);
  }
};

/**
 * Group - agrupa logs relacionados
 * @param label - Rótulo do grupo
 * @param collapsed - Se o grupo deve iniciar colapsado
 */
const group = (label: string, collapsed: boolean = false) => {
  if (isDevelopment) {
    if (collapsed) {
      console.groupCollapsed(config.prefix.log, label);
    } else {
      console.group(config.prefix.log, label);
    }
  }
};

/**
 * GroupEnd - finaliza um grupo de logs
 */
const groupEnd = () => {
  if (isDevelopment) {
    console.groupEnd();
  }
};

/**
 * Table - exibe dados em formato de tabela
 * @param data - Dados a serem exibidos
 */
const table = (data: any) => {
  if (isDevelopment) {
    console.table(data);
  }
};

/**
 * Time - inicia um timer
 * @param label - Rótulo do timer
 */
const time = (label: string) => {
  if (isDevelopment) {
    console.time(label);
  }
};

/**
 * TimeEnd - finaliza um timer e exibe o tempo decorrido
 * @param label - Rótulo do timer
 */
const timeEnd = (label: string) => {
  if (isDevelopment) {
    console.timeEnd(label);
  }
};

// ============================================================================
// HELPERS ESPECÍFICOS DO APP
// ============================================================================

/**
 * Log de navegação/rota
 * @param from - Rota de origem
 * @param to - Rota de destino
 */
const navigation = (from: string, to: string) => {
  if (isDevelopment) {
    console.log('🧭', `[NAVIGATION] ${from} → ${to}`);
  }
};

/**
 * Log de API/Network
 * @param method - Método HTTP
 * @param endpoint - Endpoint da API
 * @param status - Status da resposta (opcional)
 */
const api = (method: string, endpoint: string, status?: number) => {
  if (isDevelopment) {
    const statusIcon = status && status >= 200 && status < 300 ? '✅' : '❌';
    console.log('🌐', `[API] ${method} ${endpoint}`, status ? `${statusIcon} ${status}` : '');
  }
};

/**
 * Log de autenticação
 * @param event - Evento de autenticação
 * @param details - Detalhes adicionais
 */
const auth = (event: string, details?: any) => {
  if (isDevelopment) {
    console.log('🔐', `[AUTH] ${event}`, details || '');
  }
};

/**
 * Log de banco de dados
 * @param operation - Operação realizada (SELECT, INSERT, etc)
 * @param table - Tabela afetada
 * @param details - Detalhes adicionais
 */
const database = (operation: string, table: string, details?: any) => {
  if (isDevelopment) {
    console.log('💾', `[DB] ${operation} ${table}`, details || '');
  }
};

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

/**
 * Logger - Sistema de logging condicional
 * 
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 * 
 * // Logs básicos (apenas em dev)
 * logger.log('Informação geral');
 * logger.warn('Aviso');
 * logger.error('Erro'); // Este aparece em produção também
 * 
 * // Logs específicos
 * logger.debug('Detalhes técnicos');
 * logger.info('Informação importante');
 * logger.success('Operação bem-sucedida');
 * 
 * // Logs especializados
 * logger.navigation('/login', '/dashboard');
 * logger.api('GET', '/api/users', 200);
 * logger.auth('login', { userId: '123' });
 * logger.database('SELECT', 'usuarios', { count: 10 });
 * 
 * // Agrupamento
 * logger.group('Detalhes do Usuário');
 * logger.log('Nome:', user.name);
 * logger.log('Email:', user.email);
 * logger.groupEnd();
 * 
 * // Performance
 * logger.time('fetchData');
 * await fetchData();
 * logger.timeEnd('fetchData');
 * ```
 */
export const logger = {
  log,
  warn,
  error,
  debug,
  info,
  success,
  group,
  groupEnd,
  table,
  time,
  timeEnd,
  
  // Helpers específicos
  navigation,
  api,
  auth,
  database,
  
  // Acesso à configuração (para testes)
  config,
  isDevelopment,
};

export default logger;
