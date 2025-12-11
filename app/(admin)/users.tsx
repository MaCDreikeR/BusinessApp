import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { logger } from '../../utils/logger';
import { Estabelecimento as EstabelecimentoBase } from '@types';

type EstabelecimentoAdmin = Pick<EstabelecimentoBase, 'id' | 'nome' | 'status' | 'created_at'> & {
  usuarios: {
    email: string;
    is_principal: boolean;
  }[];
  _count?: {
    total_usuarios: number;
    total_clientes: number;
    total_agendamentos: number;
    total_vendas: number;
  };
  _stats?: {
    receita_total: number;
    ultimo_acesso?: string;
  };
};

export default function UsersScreen() {
  const router = useRouter();
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ativa' | 'suspensa' | 'banida'>('todas');

  const fetchAllEstabelecimentos = async () => {
    setLoading(true);
    
    try {
      // Busca estabelecimentos com informações básicas
      const { data: estabelecimentosData, error } = await supabase
        .from('estabelecimentos')
        .select(`
          id, nome, status, created_at,
          usuarios ( email, is_principal )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Busca estatísticas para cada estabelecimento
      const estabelecimentosComStats = await Promise.all(
        (estabelecimentosData || []).map(async (est) => {
          try {
            // Conta usuários
            const { count: totalUsuarios } = await supabase
              .from('usuarios')
              .select('id', { count: 'exact', head: true })
              .eq('estabelecimento_id', est.id);

            // Conta clientes
            const { count: totalClientes } = await supabase
              .from('clientes')
              .select('id', { count: 'exact', head: true })
              .eq('estabelecimento_id', est.id);

            // Conta agendamentos
            const { count: totalAgendamentos } = await supabase
              .from('agendamentos')
              .select('id', { count: 'exact', head: true })
              .eq('estabelecimento_id', est.id);

            // Conta vendas e soma receita
            const { data: vendas, count: totalVendas } = await supabase
              .from('comandas')
              .select('valor_total', { count: 'exact' })
              .eq('estabelecimento_id', est.id)
              .eq('status', 'finalizada');

            const receitaTotal = vendas?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;

            // Último acesso (última atualização de qualquer registro)
            const { data: ultimaAtividade } = await supabase
              .from('usuarios')
              .select('updated_at')
              .eq('estabelecimento_id', est.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...est,
              _count: {
                total_usuarios: totalUsuarios || 0,
                total_clientes: totalClientes || 0,
                total_agendamentos: totalAgendamentos || 0,
                total_vendas: totalVendas || 0,
              },
              _stats: {
                receita_total: receitaTotal,
                ultimo_acesso: ultimaAtividade?.updated_at,
              },
            };
          } catch (err) {
            logger.error('Erro ao buscar stats do estabelecimento:', err);
            return {
              ...est,
              _count: {
                total_usuarios: 0,
                total_clientes: 0,
                total_agendamentos: 0,
                total_vendas: 0,
              },
              _stats: {
                receita_total: 0,
              },
            };
          }
        })
      );

      setEstabelecimentos(estabelecimentosComStats);
    } catch (error) {
      logger.error('Erro ao buscar estabelecimentos:', error);
      Alert.alert('Erro', 'Não foi possível buscar a lista de estabelecimentos.');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAllEstabelecimentos();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllEstabelecimentos();
    setRefreshing(false);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'ativa' | 'suspensa' | 'banida') => {
    Alert.alert(
      `Confirmar ${newStatus}`,
      `Tem certeza que deseja alterar o status deste estabelecimento para "${newStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('estabelecimentos')
              .update({ status: newStatus })
              .eq('id', id);

            if (error) Alert.alert('Erro', 'Não foi possível atualizar o status.');
            else {
              Alert.alert('Sucesso', 'Status atualizado com sucesso!');
              fetchAllEstabelecimentos();
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    if (status === 'ativa') return styles.statusAtiva;
    if (status === 'suspensa') return styles.statusSuspensa;
    if (status === 'banida') return styles.statusBanida;
    return {};
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return estabelecimentos.filter((e) => {
      const principal = e.usuarios.find((u) => u.is_principal)?.email?.toLowerCase() ?? '';
      const matchText = !query || 
        e.nome.toLowerCase().includes(query) || 
        principal.includes(query);
      const matchStatus = statusFilter === 'todas' || e.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [estabelecimentos, search, statusFilter]);

  const renderItem = ({ item }: { item: EstabelecimentoAdmin }) => {
    const principal = item.usuarios.find((u) => u.is_principal);
    const stats = item._count || { total_usuarios: 0, total_clientes: 0, total_agendamentos: 0, total_vendas: 0 };
    const receita = item._stats?.receita_total || 0;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({ pathname: '/(admin)/conta-detalhes/[id]', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.estabelecimentoNome}>{item.nome}</Text>
            <Text style={styles.emailText}>{principal?.email || 'N/A'}</Text>
            <Text style={styles.dateText}>
              Cadastrado em {format(new Date(item.created_at), 'dd/MM/yyyy')}
            </Text>
          </View>
          <View style={[styles.statusDot, getStatusStyle(item.status)]} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <FontAwesome5 name="users" size={14} color="#60a5fa" />
            <Text style={styles.statValue}>{stats.total_usuarios}</Text>
            <Text style={styles.statLabel}>Usuários</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="user-friends" size={14} color="#22c55e" />
            <Text style={styles.statValue}>{stats.total_clientes}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="calendar-check" size={14} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.total_agendamentos}</Text>
            <Text style={styles.statLabel}>Agend.</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="dollar-sign" size={14} color="#a78bfa" />
            <Text style={styles.statValue}>
              {receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '')}
            </Text>
            <Text style={styles.statLabel}>Receita</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {item.status !== 'suspensa' ? (
            <TouchableOpacity 
              style={[styles.actionIconButton, { backgroundColor: '#f59e0b' }]} 
              onPress={() => handleUpdateStatus(item.id, 'suspensa')}
            >
              <FontAwesome5 name="pause" size={16} color="#111827" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionIconButton, { backgroundColor: '#22c55e' }]} 
              onPress={() => handleUpdateStatus(item.id, 'ativa')}
            >
              <FontAwesome5 name="play" size={16} color="#111827" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionIconButton, { backgroundColor: '#ef4444' }]} 
            onPress={() => handleUpdateStatus(item.id, 'banida')}
          >
            <FontAwesome5 name="user-slash" size={16} color="#111827" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Carregando Contas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Contas</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length}</Text>
          </View>
        </View>
        
        <View style={styles.searchBox}>
          <FontAwesome5 name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por nome ou email..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <FontAwesome5 name="times-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {([
            { k: 'todas', label: 'Todas', color: '#60a5fa' },
            { k: 'ativa', label: 'Ativas', color: '#22c55e' },
            { k: 'suspensa', label: 'Suspensas', color: '#f59e0b' },
            { k: 'banida', label: 'Bloqueadas', color: '#ef4444' },
          ] as const).map(({ k, label, color }) => {
            const count = estabelecimentos.filter(e => k === 'todas' ? true : e.status === k).length;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setStatusFilter(k)}
                style={[styles.filterChip, statusFilter === k && styles.filterChipActive]}
              >
                <View style={[styles.filterDot, { backgroundColor: color }]} />
                <Text style={[styles.filterText, statusFilter === k && styles.filterTextActive]}>
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="inbox" size={48} color="#374151" />
            <Text style={styles.emptyText}>Nenhuma conta encontrada</Text>
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Limpar busca</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  countBadge: { backgroundColor: '#a78bfa', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  countText: { color: '#111827', fontWeight: 'bold', fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#374151', marginBottom: 10 },
  searchInput: { flex: 1, color: '#fff' },
  filtersRow: { gap: 8, paddingBottom: 8 },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#374151' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  estabelecimentoNome: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4 },
  emailText: { color: '#9CA3AF', fontSize: 13, marginBottom: 2 },
  locationText: { color: '#60a5fa', fontSize: 12, marginTop: 2 },
  dateText: { color: '#6B7280', marginTop: 4, fontSize: 11 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  statusAtiva: { backgroundColor: '#22c55e' },
  statusSuspensa: { backgroundColor: '#f59e0b' },
  statusBanida: { backgroundColor: '#ef4444' },
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#374151' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionIconButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#374151' },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#a78bfa' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { color: '#9CA3AF', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 16 },
  clearButton: { marginTop: 12, backgroundColor: '#1f2937', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  clearButtonText: { color: '#60a5fa', fontWeight: '600' },
});