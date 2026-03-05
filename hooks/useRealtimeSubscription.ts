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
  const isSubscribingRef = useRef<boolean>(false);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 3;

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
    reconnectAttempts.current = 0; // Reset contador ao desconectar manualmente
  }, [channelName, clearTimers]);

  // Função para subscribe/reconnect
  const subscribe = useCallback(() => {
    // Prevenir chamadas concorrentes
    if (isSubscribingRef.current) {
      return;
    }

    // Se já está inscrito, não fazer nada
    if (isSubscribedRef.current && channelRef.current) {
      return;
    }

    isSubscribingRef.current = true;

    // Limpar timers existentes ANTES de criar nova subscription
    clearTimers();

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
            isSubscribingRef.current = false;
            lastHeartbeatRef.current = Date.now();
            reconnectAttempts.current = 0; // Reset contador ao conectar
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            isSubscribedRef.current = false;
            isSubscribingRef.current = false;
            
            // Incrementar contador de tentativas
            reconnectAttempts.current += 1;
            
            // Verificar se atingiu o máximo
            if (reconnectAttempts.current > maxReconnectAttempts) {
              logger.error(`❌ Máximo de tentativas de reconexão atingido para ${channelName}. Desistindo.`);
              return;
            }
            
            // Backoff exponencial: 5s, 10s, 20s...
            const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttempts.current - 1);
            logger.warn(`⚠️ Erro na subscription ${channelName} (${status}). Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts}. Reconnect em ${backoffDelay}ms`);
            
            // Tentar reconectar após intervalo com backoff
            reconnectTimerRef.current = setTimeout(() => {
              subscribe();
            }, backoffDelay);
          }
        });

      channelRef.current = channel;

      // Iniciar heartbeat para detectar conexões stale
      if (heartbeatInterval > 0) {
        heartbeatTimerRef.current = setInterval(() => {
          const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
          
          if (timeSinceLastHeartbeat > heartbeatInterval * 2) {
            isSubscribedRef.current = false;
            
            // Incrementar contador de tentativas
            reconnectAttempts.current += 1;
            
            // Verificar se atingiu o máximo
            if (reconnectAttempts.current > maxReconnectAttempts) {
              logger.error(`❌ Máximo de tentativas de reconexão atingido para ${channelName} (heartbeat). Desistindo.`);
              clearTimers();
              return;
            }
            
            const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttempts.current - 1);
            logger.warn(`💔 Heartbeat perdido para ${channelName} (${Math.round(timeSinceLastHeartbeat / 1000)}s). Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts}. Reconnect em ${backoffDelay}ms`);
            
            // Unsubscribe e agendar reconexão (evita múltiplas subscriptions simultâneas)
            if (channelRef.current) {
              channelRef.current.unsubscribe();
              channelRef.current = null;
            }
            
            clearTimers();
            
            reconnectTimerRef.current = setTimeout(() => {
              subscribe();
            }, backoffDelay);
          }
        }, heartbeatInterval);
      }
    } catch (error) {
      logger.error(`❌ Erro ao criar subscription ${channelName}:`, error);
      isSubscribedRef.current = false;
      isSubscribingRef.current = false;
      
      // Incrementar contador de tentativas
      reconnectAttempts.current += 1;
      
      // Verificar se atingiu o máximo
      if (reconnectAttempts.current > maxReconnectAttempts) {
        logger.error(`❌ Máximo de tentativas de reconexão atingido para ${channelName}. Desistindo.`);
        return;
      }
      
      // Backoff exponencial
      const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttempts.current - 1);
      logger.warn(`⚠️ Tentativa ${reconnectAttempts.current}/${maxReconnectAttempts}. Reconnect em ${backoffDelay}ms`);
      
      // Tentar reconectar após intervalo com backoff
      reconnectTimerRef.current = setTimeout(() => {
        subscribe();
      }, backoffDelay);
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
