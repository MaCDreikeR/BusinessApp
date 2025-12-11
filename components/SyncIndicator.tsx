/**
 * Indicador de Status de Sincronização
 * 
 * Mostra badge com número de operações pendentes e status de rede
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncService } from '../services/syncService';
import { syncQueue } from '../services/syncQueue';
import { networkMonitor } from '../services/networkMonitor';
import { useAuth } from '../contexts/AuthContext';

export const SyncIndicator = () => {
  const { estabelecimentoId } = useAuth();
  const [pendingOps, setPendingOps] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Carrega fila inicial
    const loadQueue = async () => {
      await syncQueue.loadQueue();
      setPendingOps(syncQueue.getQueueSize());
    };
    loadQueue();

    // Atualiza status de rede
    setIsOnline(networkMonitor.getStatus());

    // Listener de mudanças de rede
    const onNetworkChange = (online: boolean) => {
      setIsOnline(online);
    };
    networkMonitor.addListener(onNetworkChange);

    // Atualiza contador a cada 5 segundos
    const interval = setInterval(() => {
      setPendingOps(syncQueue.getQueueSize());
      setIsSyncing(syncService.isSyncInProgress());
    }, 5000);

    return () => {
      clearInterval(interval);
      networkMonitor.removeListener(onNetworkChange);
    };
  }, []);

  const handlePress = async () => {
    if (isSyncing || !estabelecimentoId) return;
    await syncService.sync(estabelecimentoId);
    setPendingOps(syncQueue.getQueueSize());
  };

  // Não mostra nada se não há operações pendentes e está online
  if (pendingOps === 0 && isOnline) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, !isOnline && styles.offline]}
      onPress={handlePress}
      disabled={isSyncing}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isSyncing ? 'sync' : isOnline ? 'cloud-upload-outline' : 'cloud-offline-outline'}
        size={16}
        color="#fff"
        style={isSyncing && styles.spinning}
      />
      
      {pendingOps > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingOps}</Text>
        </View>
      )}

      <Text style={styles.text}>
        {isSyncing
          ? 'Sincronizando...'
          : !isOnline
          ? 'Offline'
          : `${pendingOps} pendente${pendingOps > 1 ? 's' : ''}`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  spinning: {
    // Animação será adicionada via Animated API se necessário
  },
});
