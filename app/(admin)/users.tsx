import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

interface Estabelecimento {
  id: string;
  nome: string;
  status: 'ativa' | 'suspensa' | 'banida';
  created_at: string;
  usuarios: {
    email: string;
    is_principal: boolean;
  }[];
}

export default function UsersScreen() {
  const router = useRouter();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ativa' | 'suspensa' | 'banida'>('todas');

  const fetchAllEstabelecimentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select(`
        id, nome, status, created_at,
        usuarios ( email, is_principal )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
      Alert.alert('Erro', 'Não foi possível buscar a lista de estabelecimentos.');
    } else {
      setEstabelecimentos(data || []);
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
      const matchText = !query || e.nome.toLowerCase().includes(query) || principal.includes(query);
      const matchStatus = statusFilter === 'todas' || e.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [estabelecimentos, search, statusFilter]);

  const renderItem = ({ item }: { item: Estabelecimento }) => {
    const principal = item.usuarios.find((u) => u.is_principal);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.estabelecimentoNome}>{item.nome}</Text>
            <Text style={styles.emailText}>{principal?.email || 'N/A'}</Text>
            <Text style={styles.dateText}>{format(new Date(item.created_at), 'dd/MM/yyyy')}</Text>
          </View>
          <View style={[styles.statusDot, getStatusStyle(item.status)]} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: '#3b82f6' }]} onPress={() => router.push({ pathname: '/(admin)/conta-detalhes/[id]', params: { id: item.id } })}> 
            <FontAwesome5 name="eye" size={16} color="#fff" />
          </TouchableOpacity>
          {item.status !== 'suspensa' ? (
            <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: '#f59e0b' }]} onPress={() => handleUpdateStatus(item.id, 'suspensa')}>
              <FontAwesome5 name="pause" size={16} color="#111827" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: '#22c55e' }]} onPress={() => handleUpdateStatus(item.id, 'ativa')}>
              <FontAwesome5 name="play" size={16} color="#111827" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: '#ef4444' }]} onPress={() => handleUpdateStatus(item.id, 'banida')}>
            <FontAwesome5 name="user-slash" size={16} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Contas</Text>
        <View style={styles.searchBox}>
          <FontAwesome5 name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar contas..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {([
            { k: 'todas', label: 'Todas', color: '#60a5fa' },
            { k: 'ativa', label: 'Ativas', color: '#22c55e' },
            { k: 'suspensa', label: 'Suspensas', color: '#f59e0b' },
            { k: 'banida', label: 'Bloqueadas', color: '#ef4444' },
          ] as const).map(({ k, label, color }) => (
            <TouchableOpacity
              key={k}
              onPress={() => setStatusFilter(k)}
              style={[styles.filterChip, statusFilter === k && styles.filterChipActive]}
            >
              <View style={[styles.filterDot, { backgroundColor: color }]} />
              <Text style={[styles.filterText, statusFilter === k && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#374151', marginBottom: 10 },
  searchInput: { flex: 1, color: '#fff' },
  filtersRow: { gap: 8, paddingBottom: 8 },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#374151' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  estabelecimentoNome: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1 },
  emailText: { color: '#9CA3AF', marginTop: 2 },
  dateText: { color: '#9CA3AF', marginTop: 2, fontSize: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  statusAtiva: { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderWidth: 1, borderColor: '#22c55e' },
  statusSuspensa: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#f59e0b' },
  statusBanida: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: '#ef4444' },
  cardBody: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: '#d1d5db', fontSize: 14 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 },
  actionIconButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#374151' },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#a78bfa' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { color: '#9CA3AF' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
});