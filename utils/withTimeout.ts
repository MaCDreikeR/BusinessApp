import { logger } from './logger';

/**
 * Encapsula uma Promise com timeout automático
 * Limpa o timer mesmo em caso de sucesso ou erro
 * 
 * @param promise - Promise a ser executada
 * @param timeoutMs - Tempo em milissegundos (padrão: 15s)
 * @param errorMessage - Mensagem de erro customizada
 * @returns Promise que rejeita com timeout ou resolve com o resultado
 * 
 * @example
 * const data = await withTimeout(
 *   supabase.from('table').select(),
 *   15000,
 *   'Timeout ao carregar dados'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Timeout ao executar operação'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new Error(errorMessage);
        logger.warn(`⏱️ ${errorMessage} (${timeoutMs}ms)`);
        reject(error);
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Versão de Array para múltiplas promises (útil para carregarDados com vários queries)
 * 
 * @param promises - Array de Promises
 * @param timeoutMs - Timeout compartilhado para todas
 * @param errorMessage - Mensagem de erro customizada
 * @returns Mesmo que Promise.all, mas com timeout centralizado
 * 
 * @example
 * const [data1, data2, data3] = await withTimeoutAll([
 *   query1,
 *   query2,
 *   query3
 * ], 15000);
 */
export async function withTimeoutAll<T extends readonly unknown[] | []>(
  promises: T,
  timeoutMs: number = 15000,
  errorMessage: string = 'Timeout ao ejecutar operações'
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new Error(errorMessage);
        logger.warn(`⏱️ ${errorMessage} (${timeoutMs}ms)`);
        reject(error);
      }, timeoutMs);
    });

    return await Promise.race([
      Promise.all(promises),
      timeoutPromise
    ]) as { -readonly [P in keyof T]: Awaited<T[P]> };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
