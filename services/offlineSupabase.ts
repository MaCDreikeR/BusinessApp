/**
 * Wrapper do Supabase com Sincronização Offline Automática
 * 
 * Intercepta operações insert/update/delete e adiciona à fila quando offline
 */

import { supabase as supabaseClient } from '../lib/supabase';
import { syncQueue } from './syncQueue';
import { networkMonitor } from './networkMonitor';
import { logger } from '../utils/logger';

type SupabaseTable = ReturnType<typeof supabaseClient.from>;

/**
 * Wrapper para operações de INSERT com suporte offline
 */
export async function offlineInsert<T = any>(
  tableName: string,
  data: any | any[],
  estabelecimentoId: string
): Promise<{ data: T[] | null; error: any | null; fromCache: boolean }> {
  const isOnline = networkMonitor.getStatus();

  if (isOnline) {
    // ONLINE: executa normalmente
    try {
      const { data: result, error } = await supabaseClient
        .from(tableName)
        .insert(data)
        .select();

      return { data: result as T[], error, fromCache: false };
    } catch (error) {
      logger.error(`Erro ao inserir em ${tableName}:`, error);
      return { data: null, error, fromCache: false };
    }
  } else {
    // OFFLINE: adiciona à fila
    try {
      const records = Array.isArray(data) ? data : [data];
      
      for (const record of records) {
        await syncQueue.enqueue({
          table: tableName,
          operation: 'insert',
          data: record,
          estabelecimentoId,
        });
      }

      logger.info(`📥 ${records.length} registro(s) adicionado(s) à fila offline: ${tableName}`);
      
      // Retorna os dados como se tivesse sido inserido (modo otimista)
      return { 
        data: records as T[], 
        error: null, 
        fromCache: true 
      };
    } catch (error) {
      logger.error(`Erro ao adicionar à fila offline:`, error);
      return { data: null, error, fromCache: false };
    }
  }
}

/**
 * Wrapper para operações de UPDATE com suporte offline
 */
export async function offlineUpdate<T = any>(
  tableName: string,
  recordId: string,
  updates: any,
  estabelecimentoId: string
): Promise<{ data: T[] | null; error: any | null; fromCache: boolean }> {
  const isOnline = networkMonitor.getStatus();

  if (isOnline) {
    // ONLINE: executa normalmente
    try {
      const { data, error } = await supabaseClient
        .from(tableName)
        .update(updates)
        .eq('id', recordId)
        .eq('estabelecimento_id', estabelecimentoId)
        .select();

      return { data: data as T[], error, fromCache: false };
    } catch (error) {
      logger.error(`Erro ao atualizar ${tableName}:`, error);
      return { data: null, error, fromCache: false };
    }
  } else {
    // OFFLINE: adiciona à fila
    try {
      await syncQueue.enqueue({
        table: tableName,
        operation: 'update',
        data: updates,
        recordId,
        estabelecimentoId,
      });

      logger.info(`📝 Atualização adicionada à fila offline: ${tableName}/${recordId}`);
      
      // Retorna sucesso otimista
      return { 
        data: [{ id: recordId, ...updates }] as T[], 
        error: null, 
        fromCache: true 
      };
    } catch (error) {
      logger.error(`Erro ao adicionar atualização à fila:`, error);
      return { data: null, error, fromCache: false };
    }
  }
}

/**
 * Wrapper para operações de DELETE com suporte offline
 */
export async function offlineDelete(
  tableName: string,
  recordId: string,
  estabelecimentoId: string
): Promise<{ error: any | null; fromCache: boolean }> {
  const isOnline = networkMonitor.getStatus();

  if (isOnline) {
    // ONLINE: executa normalmente
    try {
      const { error } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('id', recordId)
        .eq('estabelecimento_id', estabelecimentoId);

      return { error, fromCache: false };
    } catch (error) {
      logger.error(`Erro ao deletar de ${tableName}:`, error);
      return { error, fromCache: false };
    }
  } else {
    // OFFLINE: adiciona à fila
    try {
      await syncQueue.enqueue({
        table: tableName,
        operation: 'delete',
        data: {},
        recordId,
        estabelecimentoId,
      });

      logger.info(`🗑️ Exclusão adicionada à fila offline: ${tableName}/${recordId}`);
      
      return { error: null, fromCache: true };
    } catch (error) {
      logger.error(`Erro ao adicionar exclusão à fila:`, error);
      return { error, fromCache: false };
    }
  }
}

/**
 * Helper para mostrar feedback apropriado ao usuário
 */
export function getOfflineFeedback(fromCache: boolean, operation: 'create' | 'update' | 'delete'): {
  title: string;
  message: string;
} {
  if (!fromCache) {
    // Operação online
    const titles = {
      create: 'Sucesso',
      update: 'Atualizado',
      delete: 'Excluído',
    };
    
    const messages = {
      create: 'Registro criado com sucesso!',
      update: 'Registro atualizado com sucesso!',
      delete: 'Registro excluído com sucesso!',
    };

    return {
      title: titles[operation],
      message: messages[operation],
    };
  } else {
    // Operação offline
    return {
      title: 'Salvo Localmente',
      message: 'Sem conexão. Dados serão sincronizados quando conectar à internet.',
    };
  }
}

/**
 * Verifica se está online
 */
export function isOnline(): boolean {
  return networkMonitor.getStatus();
}
