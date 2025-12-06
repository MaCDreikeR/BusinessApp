import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { logger } from '../../utils/logger';
import { Estabelecimento as EstabelecimentoBase } from '@types';

type EstabelecimentoSlim = Pick<EstabelecimentoBase, 'id' | 'status' | 'created_at'>;

// Componente para os cartões de resumo
const SummaryCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
  <View style={styles.summaryCard}>
    <FontAwesome5 name={icon} size={24} color={color} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
  </View>
);

export default function AdminDashboardScreen() {
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoSlim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States para os contadores
  const [totalContas, setTotalContas] = useState(0);
  const [contasAtivas, setContasAtivas] = useState(0);
  const [contasSuspensas, setContasSuspensas] = useState(0);

  const fetchAllEstabelecimentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('id, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error("Erro ao buscar estabelecimentos:", error);
      Alert.alert("Erro", "Não foi possível buscar a lista de estabelecimentos.");
    } else {
      const fetchedData = (data || []) as EstabelecimentoSlim[];
      setEstabelecimentos(fetchedData);
      // Calcula os totais
      setTotalContas(fetchedData.length);
      setContasAtivas(fetchedData.filter(e => e.status === 'ativa').length);
      setContasSuspensas(fetchedData.filter(e => e.status === 'suspensa').length);
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
  // Calcula séries dos últimos 6 meses
  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const count = estabelecimentos.filter(e => {
        const created = new Date(e.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      months.push({ label, count });
    }
    return months;
  }, [estabelecimentos]);

  const maxCount = useMemo(() => Math.max(1, ...monthlySeries.map(m => m.count)), [monthlySeries]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
  <Text style={{ marginTop: 10, color: '#fff' }}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.listContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <Text style={styles.headerTitle}>Visão Geral</Text>
      <View style={styles.summaryContainer}>
        <SummaryCard title="Total de Contas" value={totalContas} icon="store" color="#a78bfa" />
        <SummaryCard title="Ativas" value={contasAtivas} icon="check-circle" color="#4ade80" />
      </View>
      <View style={styles.summaryContainer}>
        <SummaryCard title="Suspensas" value={contasSuspensas} icon="pause-circle" color="#f59e0b" />
      </View>

      <Text style={styles.listHeader}>Cadastros por Mês</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartRow}>
          {monthlySeries.map((m, idx) => {
            const height = (m.count / maxCount) * 120 + (m.count > 0 ? 4 : 0);
            return (
              <View key={idx} style={styles.chartBarContainer}>
                <View style={[styles.chartBar, { height }]} />
                <Text style={styles.chartLabel}>{m.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
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
  chartCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#374151' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartBar: { width: 20, backgroundColor: '#60a5fa', borderTopLeftRadius: 6, borderTopRightRadius: 6, marginHorizontal: 6 },
  chartLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
});