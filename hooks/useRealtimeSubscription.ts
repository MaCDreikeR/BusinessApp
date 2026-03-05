import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

/**
 * Hook para gerenciar subscriptions do Supabase Realtime com reconnect automático
 * 
 * Funcionalidades:
 * - Reconnect automático se a conexão cair
 * - Heartbeat para detectar conexões stale
 * - Cleanup automático de canais
 * - Logging para debug
 * 
 * @param channelName Nome único do canal (ex: 'public:usuarios')
 * @param table Nome da tabela
 * @param callback Função chamada quando há mudanças
 * @param options Opções adicionais (event, schema, filter)
 * @param enabled Se a subscription está ativa (padrão: true)
 */
export interface UseRealtimeSubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  reconnectInterval?: number; // ms (padrão: 5000)
  heartbeatInterval?: number; // ms (padrão: 30000)
}

export function useRealtimeSubscription(
  channelName: string,
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: UseRealtimeSubscriptionOptions = {},
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isSubscribedRef = useRef<boolean>(false);

  const {
    event = '*',
    schema = 'public',
    filter,
    reconnectInterval = 5000,
    heartbeatInterval = 30000,
  } = options;

  // Função para limpar timers
  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Função para unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      logger.debug(`🔌 Unsubscribing do canal: ${channelName}`);
      channelRef.current.unsubscribe();
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
    clearTimers();
  }, [channelName, clearTimers]);

  // Função para subscribe/reconnect
  const subscribe = useCallback(() => {
    // Se já está inscrito, não fazer nada
    if (isSubscribedRef.current && channelRef.current) {
      return;
    }

    // Unsubscribe anterior se existir
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    logger.debug(`🔌 Subscribing no canal: ${channelName}`);

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event,
            schema,
            table,
            filter,
          } as any,
          (payload) => {
            logger.debug(`📨 Mudança recebida no canal ${channelName}:`, payload.eventType);
            lastHeartbeatRef.current = Date.now();
            callback(payload);
          }
        )
        .subscribe((status) => {
          logger.debug(`🔌 Status da subscription ${channelName}:`, status);
          
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
            lastHeartbeatRef.current = Date.now();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(`⚠️ Erro na subscription ${channelName}, tentando reconnect em ${reconnectInterval}ms`);
            isSubscribedRef.current = false;
            
            // Tentar reconectar após intervalo
            reconnectTimerRef.current = setTimeout(() => {
              subscribe();
            }, reconnectInterval);
          }
        });

      channelRef.current = channel;

      // Iniciar heartbeat para detectar conexões stale
      if (heartbeatInterval > 0) {
        heartbeatTimerRef.current = setInterval(() => {
          const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
          
          if (timeSinceLastHeartbeat > heartbeatInterval * 2) {
            logger.warn(`💔 Heartbeat perdido para ${channelName} (${Math.round(timeSinceLastHeartbeat / 1000)}s), reconectando...`);
            isSubscribedRef.current = false;
            subscribe();
          }
        }, heartbeatInterval);
      }
    } catch (error) {
      logger.error(`❌ Erro ao criar subscription ${channelName}:`, error);
      isSubscribedRef.current = false;
      
      // Tentar reconectar após intervalo
      reconnectTimerRef.current = setTimeout(() => {
        subscribe();
      }, reconnectInterval);
    }
  }, [channelName, table, event, schema, filter, callback, reconnectInterval, heartbeatInterval]);

  // Effect para gerenciar lifecycle da subscription
  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  return {
    unsubscribe,
    reconnect: subscribe,
    isSubscribed: isSubscribedRef.current,
  };
}
