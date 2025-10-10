import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

// Componente para os cartões de resumo
const SummaryCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
  <View style={styles.summaryCard}>
    <FontAwesome5 name={icon} size={24} color={color} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
  </View>
);

export default function AdminDashboardScreen() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States para os contadores
  const [totalContas, setTotalContas] = useState(0);
  const [contasAtivas, setContasAtivas] = useState(0);

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
      console.error("Erro ao buscar estabelecimentos:", error);
      Alert.alert("Erro", "Não foi possível buscar a lista de estabelecimentos.");
    } else {
      const fetchedData = data || [];
      setEstabelecimentos(fetchedData);
      // Calcula os totais
      setTotalContas(fetchedData.length);
      setContasAtivas(fetchedData.filter(e => e.status === 'ativa').length);
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

            if (error) Alert.alert("Erro", "Não foi possível atualizar o status.");
            else {
              Alert.alert("Sucesso", "Status atualizado com sucesso!");
              fetchAllEstabelecimentos();
            }
          },
          style: 'destructive'
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

  const renderItem = ({ item }: { item: Estabelecimento }) => {
    const principal = item.usuarios.find(u => u.is_principal);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.estabelecimentoNome}>{item.nome}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}><FontAwesome5 name="user-shield" size={14} color="#9CA3AF" /><Text style={styles.infoText}>{principal?.email || 'N/A'}</Text></View>
          <View style={styles.infoRow}><FontAwesome5 name="calendar-alt" size={14} color="#9CA3AF" /><Text style={styles.infoText}>Criado em: {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</Text></View>
          <View style={styles.infoRow}><FontAwesome5 name="users" size={14} color="#9CA3AF" /><Text style={styles.infoText}>Usuários: {item.usuarios.length}</Text></View>
        </View>
        <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleUpdateStatus(item.id, 'ativa')}><FontAwesome5 name="check-circle" size={16} color="#22c55e" /><Text style={[styles.actionText, { color: '#22c55e' }]}>Ativar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleUpdateStatus(item.id, 'suspensa')}><FontAwesome5 name="user-clock" size={16} color="#f59e0b" /><Text style={[styles.actionText, { color: '#f59e0b' }]}>Suspender</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleUpdateStatus(item.id, 'banida')}><FontAwesome5 name="user-slash" size={16} color="#ef4444" /><Text style={[styles.actionText, { color: '#ef4444' }]}>Banir</Text></TouchableOpacity>
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
      <FlatList
        data={estabelecimentos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            <Text style={styles.headerTitle}>Visão Geral</Text>
            <View style={styles.summaryContainer}>
              <SummaryCard title="Total de Contas" value={totalContas} icon="store" color="#a78bfa" />
              <SummaryCard title="Contas Ativas" value={contasAtivas} icon="check-circle" color="#4ade80" />
            </View>
            <Text style={styles.listHeader}>Todos os Estabelecimentos</Text>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16, },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 16, },
  summaryCard: { flex: 1, backgroundColor: '#1f2937', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#374151', },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginVertical: 8, },
  summaryTitle: { fontSize: 14, color: '#9CA3AF', },
  listHeader: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 16, },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#374151', },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, },
  estabelecimentoNome: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1, },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', },
  statusAtiva: { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderWidth:1, borderColor: '#22c55e' },
  statusSuspensa: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth:1, borderColor: '#f59e0b' },
  statusBanida: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth:1, borderColor: '#ef4444' },
  cardBody: { marginBottom: 16, },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  infoText: { color: '#d1d5db', fontSize: 14, marginLeft: 10, },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 16, },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, },
  actionText: { fontSize: 14, fontWeight: '500', },
});