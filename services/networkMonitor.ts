/**
 * Monitor de Conectividade de Rede
 * 
 * Detecta quando o app fica online/offline e dispara callbacks
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

type NetworkCallback = (isOnline: boolean) => void;

class NetworkMonitor {
  private isOnline: boolean = true;
  private listeners: NetworkCallback[] = [];
  private unsubscribe: (() => void) | null = null;

  /**
   * Inicia o monitoramento de rede
   */
  start(): void {
    if (this.unsubscribe) {
      logger.warn('Monitor de rede já está ativo');
      return;
    }

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      logger.debug(`📡 Status de rede: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      // Notifica listeners apenas se houve mudança
      if (wasOnline !== this.isOnline) {
        logger.info(`🔄 Mudança de conectividade: ${wasOnline ? 'ONLINE' : 'OFFLINE'} → ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        this.notifyListeners();
      }
    });

    logger.info('📡 Monitor de rede iniciado');
  }

  /**
   * Para o monitoramento de rede
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      logger.info('📡 Monitor de rede parado');
    }
  }

  /**
   * Adiciona um listener para mudanças de conectividade
   */
  addListener(callback: NetworkCallback): void {
    this.listeners.push(callback);
    logger.debug(`➕ Listener adicionado (total: ${this.listeners.length})`);
  }

  /**
   * Remove um listener
   */
  removeListener(callback: NetworkCallback): void {
    this.listeners = this.listeners.filter(cb => cb !== callback);
    logger.debug(`➖ Listener removido (total: ${this.listeners.length})`);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        logger.error('Erro ao executar listener de rede:', error);
      }
    });
  }

  /**
   * Retorna o status atual de conectividade
   */
  getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Verifica conectividade atual (async)
   */
  async checkConnection(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
      return this.isOnline;
    } catch (error) {
      logger.error('Erro ao verificar conexão:', error);
      return false;
    }
  }
}

// Exporta instância singleton
export const networkMonitor = new NetworkMonitor();
