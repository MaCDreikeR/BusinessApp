/**
 * CacheManager - Sistema centralizado de cache com TTL e invalidação
 * 
 * Funcionalidades:
 * - Chaves padronizadas: @BusinessApp:namespace:key
 * - TTL (Time-to-Live) automático
 * - Invalidação por namespace
 * - Limpeza automática de dados expirados
 * - Tipo-seguro com generics
 * - Tratamento robusto de erros
 * 
 * Uso:
 * ```typescript
 * // Salvar com TTL de 5 minutos
 * await CacheManager.set('vendas', 'filtro1', data, 5 * 60 * 1000);
 * 
 * // Buscar (retorna null se expirado)
 * const data = await CacheManager.get<VendaData>('vendas', 'filtro1');
 * 
 * // Invalidar namespace inteiro
 * await CacheManager.clearNamespace('vendas');
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import LZString from 'lz-string';
import { logger } from './logger';

// Prefixo para todas as chaves do app
const APP_PREFIX = '@BusinessApp';

// Namespace para controle de metadados
const META_NAMESPACE = 'meta';
const KEYS_LIST_KEY = 'cached_keys';

// Limite de tamanho total do cache (50MB)
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

// Limite para comprimir automaticamente (50KB)
const COMPRESSION_THRESHOLD = 50 * 1024;

// Interface para dados cacheados com metadados
interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number | null; // null = sem expiração
  size: number; // bytes aproximados
  compressed?: boolean; // indica se está comprimido
}

// Interface para estatísticas do cache
interface CacheStats {
  totalKeys: number;
  totalSize: number;
  namespaces: Record<string, { keys: number; size: number }>;
}

export class CacheManager {
  /**
   * Gera chave padronizada
   */
  private static generateKey(namespace: string, key: string): string {
    return `${APP_PREFIX}:${namespace}:${key}`;
  }

  /**
   * Calcula tamanho aproximado em bytes
   */
  private static calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Salva dados no cache com TTL opcional
   * @param namespace - Categoria do cache (ex: 'vendas', 'servicos')
   * @param key - Identificador único dentro do namespace
   * @param data - Dados a serem cacheados
   * @param ttl - Time-to-live em milissegundos (opcional)
   */
  static async set<T>(
    namespace: string,
    key: string,
    data: T,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateKey(namespace, key);
      const now = Date.now();
      
      // Serializar dados
      const serialized = JSON.stringify(data);
      const size = this.calculateSize(data);
      
      // Comprimir se for maior que o threshold
      const shouldCompress = size > COMPRESSION_THRESHOLD;
      const finalData = shouldCompress ? LZString.compress(serialized) : serialized;
      
      const cachedData: CachedData<T> = {
        data: (shouldCompress ? finalData : data) as any,
        timestamp: now,
        expiresAt: ttl ? now + ttl : null,
        size,
        compressed: shouldCompress,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      // Registrar chave na lista de chaves cacheadas
      await this.registerKey(cacheKey, namespace);
      
      logger.debug(`✅ Cache SET: ${cacheKey} (TTL: ${ttl ? `${ttl}ms` : 'infinite'}, compressed: ${shouldCompress}, size: ${(size / 1024).toFixed(2)}KB)`);
      
      // Verificar limite de tamanho
      await this.checkCacheSize();
    } catch (error) {
      logger.error(`❌ Erro ao salvar cache [${namespace}:${key}]:`, error);
      throw error;
    }
  }

  /**
   * Busca dados do cache (retorna null se expirado ou não encontrado)
   * @param namespace - Categoria do cache
   * @param key - Identificador único
   * @returns Dados ou null
   */
  static async get<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(namespace, key);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        logger.debug(`ℹ️ Cache MISS: ${cacheKey}`);
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(cached);
      const now = Date.now();

      // Verificar expiração
      if (cachedData.expiresAt && now > cachedData.expiresAt) {
        logger.debug(`⏰ Cache EXPIRED: ${cacheKey}`);
        await this.remove(namespace, key);
        return null;
      }

      // Descomprimir se necessário
      let finalData: T;
      if (cachedData.compressed) {
        const decompressed = LZString.decompress(cachedData.data as any);
        if (!decompressed) {
          logger.error(`❌ Erro ao descomprimir cache: ${cacheKey}`);
          await this.remove(namespace, key);
          return null;
        }
        finalData = JSON.parse(decompressed);
      } else {
        finalData = cachedData.data;
      }

      logger.debug(`✅ Cache HIT: ${cacheKey} (age: ${now - cachedData.timestamp}ms, compressed: ${cachedData.compressed || false})`);
      return finalData;
    } catch (error) {
      logger.error(`❌ Erro ao buscar cache [${namespace}:${key}]:`, error);
      return null;
    }
  }

  /**
   * Remove item específico do cache
   */
  static async remove(namespace: string, key: string): Promise<void> {
    try {
      const cacheKey = this.generateKey(namespace, key);
      await AsyncStorage.removeItem(cacheKey);
      await this.unregisterKey(cacheKey);
      logger.debug(`🗑️ Cache REMOVED: ${cacheKey}`);
    } catch (error) {
      logger.error(`❌ Erro ao remover cache [${namespace}:${key}]:`, error);
    }
  }

  /**
   * Limpa todo o namespace (ex: limpar todas as vendas)
   */
  static async clearNamespace(namespace: string): Promise<void> {
    try {
      const keys = await this.getKeysByNamespace(namespace);
      await AsyncStorage.multiRemove(keys);
      
      // Atualizar lista de chaves
      const allKeys = await this.getAllCachedKeys();
      const remainingKeys = allKeys.filter(k => !keys.includes(k));
      await this.saveKeysList(remainingKeys);
      
      logger.debug(`🗑️ Namespace CLEARED: ${namespace} (${keys.length} keys)`);
    } catch (error) {
      logger.error(`❌ Erro ao limpar namespace [${namespace}]:`, error);
    }
  }

  /**
   * Limpa TODO o cache do app
   */
  static async clearAll(): Promise<void> {
    try {
      const keys = await this.getAllCachedKeys();
      await AsyncStorage.multiRemove(keys);
      await AsyncStorage.removeItem(this.generateKey(META_NAMESPACE, KEYS_LIST_KEY));
      logger.debug(`🗑️ ALL CACHE CLEARED (${keys.length} keys)`);
    } catch (error) {
      logger.error('❌ Erro ao limpar todo o cache:', error);
    }
  }

  /**
   * Remove dados expirados
   */
  static async clearExpired(): Promise<void> {
    try {
      const keys = await this.getAllCachedKeys();
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const key of keys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const cachedData: CachedData<any> = JSON.parse(cached);
            if (cachedData.expiresAt && now > cachedData.expiresAt) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // Se houver erro ao parsear, considerar como corrompido e remover
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        const remainingKeys = keys.filter(k => !expiredKeys.includes(k));
        await this.saveKeysList(remainingKeys);
        logger.debug(`🗑️ EXPIRED CACHE CLEARED (${expiredKeys.length} keys)`);
      }
    } catch (error) {
      logger.error('❌ Erro ao limpar cache expirado:', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  static async getStats(): Promise<CacheStats> {
    try {
      const keys = await this.getAllCachedKeys();
      const stats: CacheStats = {
        totalKeys: keys.length,
        totalSize: 0,
        namespaces: {},
      };

      for (const key of keys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const cachedData: CachedData<any> = JSON.parse(cached);
            const namespace = key.split(':')[1] || 'unknown';
            
            stats.totalSize += cachedData.size;
            
            if (!stats.namespaces[namespace]) {
              stats.namespaces[namespace] = { keys: 0, size: 0 };
            }
            stats.namespaces[namespace].keys += 1;
            stats.namespaces[namespace].size += cachedData.size;
          }
        } catch (error) {
          // Ignorar erros de parse individual
        }
      }

      return stats;
    } catch (error) {
      logger.error('❌ Erro ao obter estatísticas do cache:', error);
      return { totalKeys: 0, totalSize: 0, namespaces: {} };
    }
  }

  /**
   * Verifica tamanho do cache e limpa se necessário
   */
  private static async checkCacheSize(): Promise<void> {
    try {
      const stats = await this.getStats();
      
      if (stats.totalSize > MAX_CACHE_SIZE) {
        logger.warn(`⚠️ Cache excedeu limite (${stats.totalSize} bytes). Limpando dados antigos...`);
        
        // Primeiro limpar expirados
        await this.clearExpired();
        
        // Se ainda estiver grande, remover mais antigos
        const newStats = await this.getStats();
        if (newStats.totalSize > MAX_CACHE_SIZE) {
          await this.removeOldestEntries(MAX_CACHE_SIZE * 0.7); // Reduzir para 70%
        }
      }
    } catch (error) {
      logger.error('❌ Erro ao verificar tamanho do cache:', error);
    }
  }

  /**
   * Remove entradas mais antigas até atingir target size
   */
  private static async removeOldestEntries(targetSize: number): Promise<void> {
    try {
      const keys = await this.getAllCachedKeys();
      const entries: Array<{ key: string; timestamp: number; size: number }> = [];

      for (const key of keys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const cachedData: CachedData<any> = JSON.parse(cached);
            entries.push({
              key,
              timestamp: cachedData.timestamp,
              size: cachedData.size,
            });
          }
        } catch (error) {
          // Ignorar erros
        }
      }

      // Ordenar por timestamp (mais antigos primeiro)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      let currentSize = entries.reduce((sum, e) => sum + e.size, 0);
      const keysToRemove: string[] = [];

      for (const entry of entries) {
        if (currentSize <= targetSize) break;
        keysToRemove.push(entry.key);
        currentSize -= entry.size;
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        const remainingKeys = keys.filter(k => !keysToRemove.includes(k));
        await this.saveKeysList(remainingKeys);
        logger.debug(`🗑️ OLDEST CACHE REMOVED (${keysToRemove.length} keys)`);
      }
    } catch (error) {
      logger.error('❌ Erro ao remover entradas antigas:', error);
    }
  }

  /**
   * Registra chave na lista de chaves cacheadas
   */
  private static async registerKey(key: string, namespace: string): Promise<void> {
    try {
      const keys = await this.getAllCachedKeys();
      if (!keys.includes(key)) {
        keys.push(key);
        await this.saveKeysList(keys);
      }
    } catch (error) {
      logger.error('❌ Erro ao registrar chave:', error);
    }
  }

  /**
   * Remove chave da lista
   */
  private static async unregisterKey(key: string): Promise<void> {
    try {
      const keys = await this.getAllCachedKeys();
      const filtered = keys.filter(k => k !== key);
      await this.saveKeysList(filtered);
    } catch (error) {
      logger.error('❌ Erro ao desregistrar chave:', error);
    }
  }

  /**
   * Obtém todas as chaves cacheadas
   */
  private static async getAllCachedKeys(): Promise<string[]> {
    try {
      const metaKey = this.generateKey(META_NAMESPACE, KEYS_LIST_KEY);
      const stored = await AsyncStorage.getItem(metaKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('❌ Erro ao obter lista de chaves:', error);
      return [];
    }
  }

  /**
   * Salva lista de chaves
   */
  private static async saveKeysList(keys: string[]): Promise<void> {
    try {
      const metaKey = this.generateKey(META_NAMESPACE, KEYS_LIST_KEY);
      await AsyncStorage.setItem(metaKey, JSON.stringify(keys));
    } catch (error) {
      logger.error('❌ Erro ao salvar lista de chaves:', error);
    }
  }

  /**
   * Obtém chaves por namespace
   */
  private static async getKeysByNamespace(namespace: string): Promise<string[]> {
    const allKeys = await this.getAllCachedKeys();
    const prefix = `${APP_PREFIX}:${namespace}:`;
    return allKeys.filter(key => key.startsWith(prefix));
  }
}

// Export helper constants
export const CacheNamespaces = {
  VENDAS: 'vendas',
  SERVICOS: 'servicos',
  PRODUTOS: 'produtos',
  CLIENTES: 'clientes',
  AGENDAMENTOS: 'agendamentos',
  ESTOQUE: 'estoque',
  RELATORIOS: 'relatorios',
  USER_PREFS: 'user_prefs',
  AUTH: 'auth',
} as const;

export const CacheTTL = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
