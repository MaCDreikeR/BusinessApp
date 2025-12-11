/**
 * Helpers para invalidação de cache em mutações
 * 
 * Use estes helpers para garantir que o cache seja invalidado
 * automaticamente após operações de create/update/delete
 */

import { CacheManager, CacheNamespaces } from './cacheManager';
import { logger } from './logger';

/**
 * Invalida cache após criar/editar/deletar vendas
 */
export async function invalidarCacheVendas(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.VENDAS);
    logger.debug('🗑️ Cache de vendas invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de vendas:', error);
  }
}

/**
 * Invalida cache após criar/editar/deletar serviços
 */
export async function invalidarCacheServicos(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.SERVICOS);
    logger.debug('🗑️ Cache de serviços invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de serviços:', error);
  }
}

/**
 * Invalida cache após criar/editar/deletar produtos
 */
export async function invalidarCacheProdutos(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.PRODUTOS);
    await CacheManager.clearNamespace(CacheNamespaces.ESTOQUE);
    logger.debug('🗑️ Cache de produtos/estoque invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de produtos:', error);
  }
}

/**
 * Invalida cache após criar/editar/deletar clientes
 */
export async function invalidarCacheClientes(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.CLIENTES);
    logger.debug('🗑️ Cache de clientes invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de clientes:', error);
  }
}

/**
 * Invalida cache após criar/editar/deletar agendamentos
 */
export async function invalidarCacheAgendamentos(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
    logger.debug('🗑️ Cache de agendamentos invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de agendamentos:', error);
  }
}

/**
 * Invalida cache após criar/editar/deletar orçamentos
 */
export async function invalidarCacheOrcamentos(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.RELATORIOS);
    logger.debug('🗑️ Cache de orçamentos invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache de orçamentos:', error);
  }
}

/**
 * Invalida cache do dashboard
 */
export async function invalidarCacheDashboard(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.RELATORIOS);
    logger.debug('🗑️ Cache do dashboard invalidado');
  } catch (error) {
    logger.error('Erro ao invalidar cache do dashboard:', error);
  }
}

/**
 * Invalida todos os caches de dados do usuário
 * Use com moderação - apenas em casos como logout ou mudança de estabelecimento
 */
export async function invalidarTodosCaches(): Promise<void> {
  try {
    await CacheManager.clearNamespace(CacheNamespaces.VENDAS);
    await CacheManager.clearNamespace(CacheNamespaces.SERVICOS);
    await CacheManager.clearNamespace(CacheNamespaces.PRODUTOS);
    await CacheManager.clearNamespace(CacheNamespaces.CLIENTES);
    await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
    await CacheManager.clearNamespace(CacheNamespaces.ESTOQUE);
    await CacheManager.clearNamespace(CacheNamespaces.RELATORIOS);
    logger.debug('🗑️ Todos os caches invalidados');
  } catch (error) {
    logger.error('Erro ao invalidar todos os caches:', error);
  }
}

/**
 * Exemplo de uso em uma mutação:
 * 
 * ```typescript
 * import { invalidarCacheVendas } from '@utils/cacheHelpers';
 * 
 * const criarVenda = async (dados: Venda) => {
 *   const { error } = await supabase
 *     .from('vendas')
 *     .insert(dados);
 *   
 *   if (!error) {
 *     await invalidarCacheVendas(); // Limpa cache para forçar reload
 *   }
 * };
 * ```
 */
