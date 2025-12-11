/**
 * Sistema de Fila de Sincronização Offline
 * 
 * Guarda operações (create, update, delete) feitas offline
 * e executa quando a conexão voltar
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

const QUEUE_KEY = '@sync_queue';

export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string; // UUID da operação
  table: string; // Nome da tabela
  operation: SyncOperation;
  data: any; // Dados a serem sincronizados
  recordId?: string; // ID do registro (para update/delete)
  timestamp: number; // Timestamp da operação
  retries: number; // Número de tentativas
  estabelecimentoId: string; // ID do estabelecimento
}

class SyncQueueManager {
  private queue: SyncQueueItem[] = [];
  private processing = false;

  /**
   * Carrega a fila do AsyncStorage
   */
  async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
        logger.debug(`📥 Fila carregada: ${this.queue.length} operações pendentes`);
      }
    } catch (error) {
      logger.error('Erro ao carregar fila de sync:', error);
      this.queue = [];
    }
  }

  /**
   * Salva a fila no AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Erro ao salvar fila de sync:', error);
    }
  }

  /**
   * Adiciona uma operação à fila
   */
  async enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const MAX_QUEUE_SIZE = 500;

    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queueItem);

    // Limita tamanho da fila (mantém últimas 500 operações)
    if (this.queue.length > MAX_QUEUE_SIZE) {
      const removed = this.queue.length - MAX_QUEUE_SIZE;
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
      logger.warn(`⚠️ Fila excedeu ${MAX_QUEUE_SIZE} operações. ${removed} operações antigas removidas.`);
    }

    await this.saveQueue();
    
    logger.debug(`➕ Operação adicionada à fila: ${item.operation} em ${item.table} (${this.queue.length}/${MAX_QUEUE_SIZE})`);
  }

  /**
   * Remove uma operação da fila
   */
  private async dequeue(itemId: string): Promise<void> {
    this.queue = this.queue.filter(item => item.id !== itemId);
    await this.saveQueue();
  }

  /**
   * Retorna o tamanho da fila
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Retorna todas as operações pendentes
   */
  getPendingOperations(): SyncQueueItem[] {
    return [...this.queue];
  }

  /**
   * Processa a fila de sincronização
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.processing) {
      logger.warn('Processamento de fila já em andamento');
      return { success: 0, failed: 0 };
    }

    if (this.queue.length === 0) {
      logger.debug('Fila vazia, nada a processar');
      return { success: 0, failed: 0 };
    }

    this.processing = true;
    let successCount = 0;
    let failedCount = 0;

    logger.info(`🔄 Processando ${this.queue.length} operações pendentes...`);

    // Processa operações em ordem (FIFO)
    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        await this.executeOperation(item);
        await this.dequeue(item.id);
        successCount++;
        logger.debug(`✅ Operação processada: ${item.operation} em ${item.table}`);
      } catch (error) {
        logger.error(`❌ Falha ao processar operação ${item.id}:`, error);
        
        // Incrementa contador de tentativas
        item.retries++;
        
        // Remove da fila se excedeu 3 tentativas
        if (item.retries >= 3) {
          logger.warn(`🗑️ Operação ${item.id} removida após 3 tentativas falhas`);
          await this.dequeue(item.id);
          failedCount++;
        } else {
          await this.saveQueue();
        }
      }
    }

    this.processing = false;
    logger.info(`✅ Sincronização completa: ${successCount} sucesso, ${failedCount} falhas`);

    return { success: successCount, failed: failedCount };
  }

  /**
   * Executa uma operação específica no Supabase
   */
  private async executeOperation(item: SyncQueueItem): Promise<void> {
    const { table, operation, data, recordId, estabelecimentoId } = item;

    switch (operation) {
      case 'insert':
        const insertResult = await supabase
          .from(table)
          .insert({ ...data, estabelecimento_id: estabelecimentoId });
        
        if (insertResult.error) throw insertResult.error;
        break;

      case 'update':
        if (!recordId) throw new Error('recordId é obrigatório para update');
        
        const updateResult = await supabase
          .from(table)
          .update(data)
          .eq('id', recordId)
          .eq('estabelecimento_id', estabelecimentoId);
        
        if (updateResult.error) throw updateResult.error;
        break;

      case 'delete':
        if (!recordId) throw new Error('recordId é obrigatório para delete');
        
        const deleteResult = await supabase
          .from(table)
          .delete()
          .eq('id', recordId)
          .eq('estabelecimento_id', estabelecimentoId);
        
        if (deleteResult.error) throw deleteResult.error;
        break;

      default:
        throw new Error(`Operação desconhecida: ${operation}`);
    }
  }

  /**
   * Limpa toda a fila (usar com cuidado!)
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
    logger.info('🗑️ Fila de sincronização limpa');
  }

  /**
   * Gera UUID simples (sem dependências externas)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Exporta instância singleton
export const syncQueue = new SyncQueueManager();
