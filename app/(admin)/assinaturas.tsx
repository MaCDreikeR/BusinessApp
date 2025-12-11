import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assinatura {
  id: string;
  estabelecimento_id: string;
  plano_id: string;
  status: string;
  tipo_pagamento: string;
  data_inicio: string;
  data_fim: string | null;
  data_proximo_pagamento: string | null;
  valor_pago: number | null;
  created_at: string;
  estabelecimento: {
    nome: string;
    status: string;
  };
  plano: {
    nome: string;
    preco_mensal: number;
    preco_anual: number | null;
  };
}

export default function AssinaturasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'ativa' | 'suspensa' | 'cancelada' | 'expirada'>('todas');

  const fetchAssinaturas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('assinaturas')
        .select(`
          *,
          estabelecimento:estabelecimentos(nome, status),
          plano:planos(nome, preco_mensal, preco_anual)
        `)
        .order('created_at', { ascending: false });

      if (filtro !== 'todas') {
        query = query.eq('status', filtro);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAssinaturas(data || []);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar as assinaturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssinaturas();
  }, [filtro]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssinaturas();
    setRefreshing(false);
  }, [filtro]);

  const handleAlterarStatus = async (assinatura: Assinatura, novoStatus: string) => {
    Alert.alert(
      'Confirmar Alteração',
      `Alterar status da assinatura para "${novoStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('assinaturas')
                .update({ status: novoStatus })
                .eq('id', assinatura.id);

              if (error) throw error;

              // Se cancelando ou suspendendo, também atualizar status do estabelecimento
              if (novoStatus === 'cancelada' || novoStatus === 'suspensa') {
                await supabase
                  .from('estabelecimentos')
                  .update({ status: 'suspensa' })
                  .eq('id', assinatura.estabelecimento_id);
              } else if (novoStatus === 'ativa') {
                await supabase
                  .from('estabelecimentos')
                  .update({ status: 'ativa' })
                  .eq('id', assinatura.estabelecimento_id);
              }

              Alert.alert('Sucesso', 'Status atualizado com sucesso!');
              fetchAssinaturas();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível alterar o status.');
            }
          },
        },
      ]
    );
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ativa': return '#4ade80';
      case 'suspensa': return '#f59e0b';
      case 'cancelada': return '#ef4444';
      case 'expirada': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const renderAssinatura = ({ item }: { item: Assinatura }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.estabelecimentoNome}>{item.estabelecimento.nome}</Text>
          <Text style={styles.planoNome}>{item.plano.nome}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <FontAwesome5 name="calendar-alt" size={14} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Tipo</Text>
          <Text style={styles.infoValue}>{item.tipo_pagamento}</Text>
        </View>
        <View style={styles.infoItem}>
          <FontAwesome5 name="money-bill" size={14} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Valor</Text>
          <Text style={styles.infoValue}>
            R$ {(item.tipo_pagamento === 'anual' ? item.plano.preco_anual : item.plano.preco_mensal)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <FontAwesome5 name="play-circle" size={14} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Início</Text>
          <Text style={styles.infoValue}>{format(new Date(item.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</Text>
        </View>
        {item.data_proximo_pagamento && (
          <View style={styles.infoItem}>
            <FontAwesome5 name="credit-card" size={14} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Próx. Pgto</Text>
            <Text style={styles.infoValue}>{format(new Date(item.data_proximo_pagamento), 'dd/MM/yyyy', { locale: ptBR })}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#60a5fa' }]}
          onPress={() => router.push(`/(admin)/conta-detalhes/${item.estabelecimento_id}`)}
        >
          <FontAwesome5 name="eye" size={14} color="#fff" />
          <Text style={styles.actionButtonText}>Ver Conta</Text>
        </TouchableOpacity>
        
        {item.status === 'ativa' ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => handleAlterarStatus(item, 'suspensa')}
            >
              <FontAwesome5 name="pause" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Suspender</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => handleAlterarStatus(item, 'cancelada')}
            >
              <FontAwesome5 name="times" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        ) : item.status === 'suspensa' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4ade80' }]}
            onPress={() => handleAlterarStatus(item, 'ativa')}
          >
            <FontAwesome5 name="play" size={14} color="#fff" />
            <Text style={styles.actionButtonText}>Reativar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Carregando assinaturas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assinaturas</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/planos')}>
          <FontAwesome5 name="cog" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {['todas', 'ativa', 'suspensa', 'cancelada', 'expirada'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filtro === f && styles.filterButtonActive]}
            onPress={() => setFiltro(f as any)}
          >
            <Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={assinaturas}
        renderItem={renderAssinatura}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="inbox" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>Nenhuma assinatura encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#1f2937',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#a78bfa',
  },
  filterText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  estabelecimentoNome: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  planoNome: { fontSize: 14, color: '#9CA3AF' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    width: '47%',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginVertical: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
});
