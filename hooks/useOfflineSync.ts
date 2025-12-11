/**
 * Hook para adicionar operações à fila de sincronização
 * 
 * Facilita o uso da sincronização offline em qualquer tela
 */

import { useCallback } from 'react';
import { syncQueue, SyncOperation } from '../services/syncQueue';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

export const useOfflineSync = () => {
  const { estabelecimentoId } = useAuth();

  /**
   * Adiciona uma operação à fila de sincronização
   */
  const addToSyncQueue = useCallback(
    async (table: string, operation: SyncOperation, data: any, recordId?: string) => {
      if (!estabelecimentoId) {
        logger.warn('Sem estabelecimentoId, operação não será enfileirada');
        return false;
      }

      try {
        await syncQueue.enqueue({
          table,
          operation,
          data,
          recordId,
          estabelecimentoId,
        });

        logger.info(`✅ Operação ${operation} em ${table} adicionada à fila offline`);
        return true;
      } catch (error) {
        logger.error('Erro ao adicionar operação à fila:', error);
        return false;
      }
    },
    [estabelecimentoId]
  );

  /**
   * Atalho para criar registro
   */
  const createOffline = useCallback(
    async (table: string, data: any) => {
      return addToSyncQueue(table, 'insert', data);
    },
    [addToSyncQueue]
  );

  /**
   * Atalho para atualizar registro
   */
  const updateOffline = useCallback(
    async (table: string, recordId: string, data: any) => {
      return addToSyncQueue(table, 'update', data, recordId);
    },
    [addToSyncQueue]
  );

  /**
   * Atalho para deletar registro
   */
  const deleteOffline = useCallback(
    async (table: string, recordId: string) => {
      return addToSyncQueue(table, 'delete', {}, recordId);
    },
    [addToSyncQueue]
  );

  return {
    addToSyncQueue,
    createOffline,
    updateOffline,
    deleteOffline,
  };
};
