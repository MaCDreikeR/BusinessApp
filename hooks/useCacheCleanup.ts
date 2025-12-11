/**
 * Hook para limpeza automática de cache expirado
 * 
 * Uso:
 * ```typescript
 * // No _layout.tsx raiz
 * useCacheCleanup();
 * ```
 */

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CacheManager } from '../utils/cacheManager';
import { logger } from '../utils/logger';

export function useCacheCleanup() {
  useEffect(() => {
    // Limpar cache expirado ao montar
    const initialCleanup = async () => {
      try {
        await CacheManager.clearExpired();
        const stats = await CacheManager.getStats();
        logger.debug(`📊 Cache stats: ${stats.totalKeys} keys, ${(stats.totalSize / 1024).toFixed(2)} KB`);
      } catch (error) {
        logger.error('❌ Erro na limpeza inicial de cache:', error);
      }
    };

    initialCleanup();

    // Limpar cache quando app voltar do background
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        try {
          await CacheManager.clearExpired();
          logger.debug('🧹 Cache expirado limpo ao retornar para app');
        } catch (error) {
          logger.error('❌ Erro ao limpar cache expirado:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Limpeza periódica a cada 10 minutos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await CacheManager.clearExpired();
        logger.debug('🧹 Limpeza periódica de cache executada');
      } catch (error) {
        logger.error('❌ Erro na limpeza periódica:', error);
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, []);
}
