/**
 * Serviço de Sincronização Bidirecional
 * 
 * Gerencia upload de dados locais e download de dados da nuvem
 */

import { syncQueue } from './syncQueue';
import { networkMonitor } from './networkMonitor';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../utils/cacheManager';
import { addMinutesLocal } from '../lib/timezone';

const LAST_SYNC_KEY = '@last_sync';

export interface SyncResult {
  success: boolean;
  uploadedOperations: number;
  downloadedRecords: number;
  errors: string[];
}

class SyncService {
  private isSyncing = false;
  private autoSyncEnabled = true;

  /**
   * Inicializa o serviço de sincronização
   */
  async initialize(): Promise<void> {
    // Carrega a fila de operações pendentes
    await syncQueue.loadQueue();

    // Inicia monitor de rede
    networkMonitor.start();

    // Adiciona listener para sincronizar quando voltar online
    networkMonitor.addListener(async (isOnline) => {
      if (isOnline && this.autoSyncEnabled) {
        logger.info('🌐 Conexão restaurada, iniciando sincronização automática...');
        setTimeout(() => this.sync(), 2000); // Aguarda 2s para estabilizar conexão
      }
    });

    logger.info('🔄 Serviço de sincronização inicializado');
  }

  /**
   * Executa sincronização completa (upload + download)
   */
  async sync(estabelecimentoId?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('Sincronização já em andamento');
      return {
        success: false,
        uploadedOperations: 0,
        downloadedRecords: 0,
        errors: ['Sincronização já em andamento'],
      };
    }

    // Verifica conectividade
    const isOnline = await networkMonitor.checkConnection();
    if (!isOnline) {
      logger.warn('Sem conexão com internet, sincronização abortada');
      return {
        success: false,
        uploadedOperations: 0,
        downloadedRecords: 0,
        errors: ['Sem conexão com internet'],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let uploadedOperations = 0;
    let downloadedRecords = 0;

    try {
      logger.info('🔄 Iniciando sincronização bidirecional...');

      // 1. UPLOAD: Processa fila de operações pendentes
      const uploadResult = await syncQueue.processQueue();
      uploadedOperations = uploadResult.success;

      if (uploadResult.failed > 0) {
        errors.push(`${uploadResult.failed} operações falharam no upload`);
      }

      // 2. DOWNLOAD: Busca dados novos do servidor (se estabelecimentoId fornecido)
      if (estabelecimentoId) {
        const downloadResult = await this.downloadData(estabelecimentoId);
        downloadedRecords = downloadResult.totalRecords;
        errors.push(...downloadResult.errors);
      }

      // 3. Atualiza timestamp de última sincronização
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      logger.info(`✅ Sincronização completa: ${uploadedOperations} uploads, ${downloadedRecords} downloads`);

      return {
        success: errors.length === 0,
        uploadedOperations,
        downloadedRecords,
        errors,
      };
    } catch (error) {
      logger.error('Erro na sincronização:', error);
      errors.push(error instanceof Error ? error.message : 'Erro desconhecido');

      return {
        success: false,
        uploadedOperations,
        downloadedRecords,
        errors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Baixa dados do servidor
   */
  private async downloadData(estabelecimentoId: string): Promise<{
    totalRecords: number;
    errors: string[];
  }> {
    let totalRecords = 0;
    const errors: string[] = [];

    try {
      // Busca dados das principais tabelas
      const [clientes, servicos, produtos, agendamentos, comandas, fornecedores, marcas, orcamentos, pacotes] =
        await Promise.all([
          supabase.from('clientes').select('*').eq('estabelecimento_id', estabelecimentoId).limit(100),

          supabase.from('servicos').select('*').eq('estabelecimento_id', estabelecimentoId),

          supabase.from('produtos').select('*').eq('estabelecimento_id', estabelecimentoId).limit(100),

          supabase
            .from('agendamentos')
            .select('*')
            .eq('estabelecimento_id', estabelecimentoId)
            .gte('data_hora', addMinutesLocal(new Date(), -30 * 24 * 60))
            .limit(100),

          supabase
            .from('comandas')
            .select('*')
            .eq('estabelecimento_id', estabelecimentoId)
            .eq('status', 'aberta')
            .limit(50),

          supabase.from('fornecedores').select('*').eq('estabelecimento_id', estabelecimentoId),

          supabase.from('marcas').select('*').eq('estabelecimento_id', estabelecimentoId),

          supabase
            .from('orcamentos')
            .select('*')
            .eq('estabelecimento_id', estabelecimentoId)
            .order('created_at', { ascending: false })
            .limit(50),

          supabase.from('pacotes').select('*').eq('estabelecimento_id', estabelecimentoId),
        ]);

      // Conta registros e verifica erros (ignora tabelas inexistentes)
      const results = [
        { name: 'clientes', result: clientes },
        { name: 'servicos', result: servicos },
        { name: 'produtos', result: produtos },
        { name: 'agendamentos', result: agendamentos },
        { name: 'comandas', result: comandas },
        { name: 'fornecedores', result: fornecedores },
        { name: 'marcas', result: marcas },
        { name: 'orcamentos', result: orcamentos },
        { name: 'pacotes', result: pacotes },
      ];

      results.forEach(({ name, result }) => {
        if (result.error) {
          const isTableNotFound = result.error.code === '42P01' || result.error.code === 'PGRST116';
          const isColumnNotFound = result.error.code === '42703';

          if (!isTableNotFound && !isColumnNotFound) {
            errors.push(`Erro ao baixar ${name}: ${result.error.message}`);
          }
        } else {
          totalRecords += result.data?.length || 0;
        }
      });

      // Limpa cache de relatórios para forçar recálculo com novos dados
      await CacheManager.clearNamespace('relatorios');

      logger.info(`📥 Download completo: ${totalRecords} registros baixados`);
    } catch (error) {
      logger.error('Erro no download de dados:', error);
      errors.push(error instanceof Error ? error.message : 'Erro no download');
    }

    return { totalRecords, errors };
  }

  /**
   * Retorna timestamp da última sincronização
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch {
      return null;
    }
  }

  /**
   * Retorna número de operações pendentes
   */
  getPendingOperationsCount(): number {
    return syncQueue.getQueueSize();
  }

  /**
   * Ativa/desativa sincronização automática
   */
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    logger.info(`Sincronização automática: ${enabled ? 'ATIVADA' : 'DESATIVADA'}`);
  }

  /**
   * Verifica se está sincronizando
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Para o serviço de sincronização
   */
  stop(): void {
    networkMonitor.stop();
    logger.info('🔄 Serviço de sincronização parado');
  }
}

// Exporta instância singleton
export const syncService = new SyncService();
