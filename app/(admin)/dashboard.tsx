import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { logger } from '../../utils/logger';
import { Estabelecimento as EstabelecimentoBase } from '@types';

type EstabelecimentoSlim = Pick<EstabelecimentoBase, 'id' | 'status' | 'created_at'>;

interface GlobalMetrics {
  totalContas: number;
  contasAtivas: number;
  contasSuspensas: number;
  contasBloqueadas: number;
  totalUsuarios: number;
  totalClientes: number;
  totalAgendamentos: number;
  totalComandas: number;
  totalProdutos: number;
  totalServicos: number;
  receitaTotal: number;
  receitaMesAtual: number;
  agendamentosHoje: number;
  comandasAbertas: number;
}

// Componente para os cartões de resumo
const SummaryCard = ({ title, value, icon, color, subtitle }: { 
  title: string; 
  value: string | number; 
  icon: string; 
  color: string;
  subtitle?: string;
}) => (
  <View style={styles.summaryCard}>
    <FontAwesome5 name={icon} size={24} color={color} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
    {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
  </View>
);

export default function AdminDashboardScreen() {
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoSlim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalContas: 0,
    contasAtivas: 0,
    contasSuspensas: 0,
    contasBloqueadas: 0,
    totalUsuarios: 0,
    totalClientes: 0,
    totalAgendamentos: 0,
    totalComandas: 0,
    totalProdutos: 0,
    totalServicos: 0,
    receitaTotal: 0,
    receitaMesAtual: 0,
    agendamentosHoje: 0,
    comandasAbertas: 0,
  });

  const fetchGlobalMetrics = async () => {
    setLoading(true);
    
    try {
      // Buscar estabelecimentos
      const { data: estabs, error: estabError } = await supabase
        .from('estabelecimentos')
        .select('id, status, created_at')
        .order('created_at', { ascending: false });

      if (estabError) throw estabError;
      
      const estabelecimentosData = (estabs || []) as EstabelecimentoSlim[];
      setEstabelecimentos(estabelecimentosData);

      // Debug: Verificar sessão e role do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, email, role')
        .eq('id', sessionData.session?.user?.id)
        .single();
      
      logger.info('🔐 Autenticação:', {
        userId: sessionData.session?.user?.id,
        email: sessionData.session?.user?.email,
        role: usuarioData?.role,
      });

      // DEBUG: Testar query direta com clientes
      const { data: clientesTest, error: clientesTestError, count: clientesTestCount } = await supabase
        .from('clientes')
        .select('id, nome, estabelecimento_id', { count: 'exact' });
      
      logger.info('🧪 Teste direto tabela clientes:', {
        count: clientesTestCount,
        error: clientesTestError,
        amostra: clientesTest?.slice(0, 3).map(c => ({ id: c.id, nome: c.nome })),
      });

      // DEBUG: Testar query direta com agendamentos
      const { data: agendamentosTest, error: agendamentosTestError, count: agendamentosTestCount } = await supabase
        .from('agendamentos')
        .select('id, cliente, data_hora', { count: 'exact' });
      
      logger.info('🧪 Teste direto tabela agendamentos:', {
        count: agendamentosTestCount,
        error: agendamentosTestError,
        amostra: agendamentosTest?.slice(0, 3).map(a => ({ 
          id: a.id, 
          cliente: a.cliente,
          data: a.data_hora 
        })),
      });

      // Queries paralelas para métricas globais
      const [
        usuariosResult,
        clientesResult,
        agendamentosResult,
        comandasResult,
        produtosResult,
        servicosResult,
        comandasFinalizadas,
        comandasMesAtual,
        agendamentosHojeResult,
        comandasAbertasResult,
      ] = await Promise.all([
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }),
        supabase.from('comandas').select('id', { count: 'exact', head: true }),
        supabase.from('produtos').select('id', { count: 'exact', head: true }),
        supabase.from('servicos').select('id', { count: 'exact', head: true }),
        supabase.from('comandas').select('valor_total').eq('status', 'fechada'),
        supabase.from('comandas').select('valor_total').eq('status', 'fechada')
          .gte('data_fechamento', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('agendamentos').select('id', { count: 'exact', head: true })
          .gte('data_hora', new Date(new Date().setHours(0,0,0,0)).toISOString())
          .lte('data_hora', new Date(new Date().setHours(23,59,59,999)).toISOString()),
        supabase.from('comandas').select('id', { count: 'exact', head: true }).eq('status', 'aberta'),
      ]);

      // Debug logs para diagnóstico
      logger.info('📊 Resultados das Queries:', {
        usuarios: { count: usuariosResult.count, error: usuariosResult.error },
        clientes: { count: clientesResult.count, error: clientesResult.error },
        agendamentos: { count: agendamentosResult.count, error: agendamentosResult.error },
        comandas: { count: comandasResult.count, error: comandasResult.error },
        produtos: { count: produtosResult.count, error: produtosResult.error },
        servicos: { count: servicosResult.count, error: servicosResult.error },
      });

      // Verificar erros individuais
      if (clientesResult.error) {
        logger.error('❌ Erro ao buscar clientes:', clientesResult.error);
      }
      if (agendamentosResult.error) {
        logger.error('❌ Erro ao buscar agendamentos:', agendamentosResult.error);
      }
      if (agendamentosHojeResult.error) {
        logger.error('❌ Erro ao buscar agendamentos hoje:', agendamentosHojeResult.error);
      }

      const totalUsuarios = usuariosResult.count || 0;
      const totalClientes = clientesResult.count || 0;
      const totalAgendamentos = agendamentosResult.count || 0;
      const totalComandas = comandasResult.count || 0;
      const totalProdutos = produtosResult.count || 0;
      const totalServicos = servicosResult.count || 0;
      const agendamentosHoje = agendamentosHojeResult.count || 0;
      const comandasAbertas = comandasAbertasResult.count || 0;

      // Calcular receitas
      const receitaTotal = (comandasFinalizadas.data || []).reduce((sum, c) => 
        sum + (parseFloat(c.valor_total) || 0), 0
      );
      const receitaMesAtual = (comandasMesAtual.data || []).reduce((sum, c) => 
        sum + (parseFloat(c.valor_total) || 0), 0
      );

      setMetrics({
        totalContas: estabelecimentosData.length,
        contasAtivas: estabelecimentosData.filter(e => e.status === 'ativa').length,
        contasSuspensas: estabelecimentosData.filter(e => e.status === 'suspensa').length,
        contasBloqueadas: estabelecimentosData.filter(e => e.status === 'bloqueada').length,
        totalUsuarios: totalUsuarios || 0,
        totalClientes: totalClientes || 0,
        totalAgendamentos: totalAgendamentos || 0,
        totalComandas: totalComandas || 0,
        totalProdutos: totalProdutos || 0,
        totalServicos: totalServicos || 0,
        receitaTotal,
        receitaMesAtual,
        agendamentosHoje: agendamentosHoje || 0,
        comandasAbertas: comandasAbertas || 0,
      });

    } catch (error) {
      logger.error("Erro ao buscar métricas globais:", error);
      Alert.alert("Erro", "Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalMetrics();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGlobalMetrics();
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
      {/* Card de Contas */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="store" size={20} color="#a78bfa" />
          <Text style={styles.sectionTitle}>Contas</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.totalContas}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#4ade80' }]}>{metrics.contasAtivas}</Text>
            <Text style={styles.metricLabel}>Ativas</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{metrics.contasSuspensas}</Text>
            <Text style={styles.metricLabel}>Suspensas</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#ef4444' }]}>{metrics.contasBloqueadas}</Text>
            <Text style={styles.metricLabel}>Bloqueadas</Text>
          </View>
        </View>
      </View>

      {/* Card de Relatórios (Expansível) */}
      <TouchableOpacity 
        style={styles.reportCard}
        onPress={() => setShowReports(!showReports)}
        activeOpacity={0.7}
      >
        <View style={styles.reportHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="chart-bar" size={20} color="#8b5cf6" />
            <Text style={styles.reportTitle}>Relatórios</Text>
          </View>
          <FontAwesome5 
            name={showReports ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#9ca3af" 
          />
        </View>
        <Text style={styles.reportSubtitle}>
          {showReports ? 'Ocultar métricas detalhadas' : 'Ver métricas detalhadas'}
        </Text>
      </TouchableOpacity>

      {/* Métricas Detalhadas (Mostrar quando expandido) */}
      {showReports && (
        <>
          {/* Card de Usuários & Clientes */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="users" size={20} color="#60a5fa" />
          <Text style={styles.sectionTitle}>Usuários & Clientes</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <FontAwesome5 name="users" size={24} color="#60a5fa" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.totalUsuarios}</Text>
            <Text style={styles.metricLabel}>Usuários</Text>
          </View>
          <View style={styles.metricItem}>
            <FontAwesome5 name="user-friends" size={24} color="#34d399" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.totalClientes}</Text>
            <Text style={styles.metricLabel}>Clientes</Text>
          </View>
        </View>
      </View>

      {/* Card de Catálogo */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="box" size={20} color="#fbbf24" />
          <Text style={styles.sectionTitle}>Catálogo</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <FontAwesome5 name="box" size={24} color="#fbbf24" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.totalProdutos}</Text>
            <Text style={styles.metricLabel}>Produtos</Text>
          </View>
          <View style={styles.metricItem}>
            <FontAwesome5 name="concierge-bell" size={24} color="#f472b6" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.totalServicos}</Text>
            <Text style={styles.metricLabel}>Serviços</Text>
          </View>
        </View>
      </View>

      {/* Card de Totais Gerais */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="calendar-check" size={20} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>Totais Gerais</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <FontAwesome5 name="calendar-check" size={24} color="#8b5cf6" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.agendamentosHoje}</Text>
            <Text style={styles.metricLabel}>Agendamentos</Text>
            <Text style={styles.metricSubtitle}>hoje</Text>
          </View>
          <View style={styles.metricItem}>
            <FontAwesome5 name="receipt" size={24} color="#fb923c" style={{ marginBottom: 8 }} />
            <Text style={styles.metricValue}>{metrics.comandasAbertas}</Text>
            <Text style={styles.metricLabel}>Comandas Abertas</Text>
            <Text style={styles.metricSubtitle}>em aberto</Text>
          </View>
        </View>
      </View>

      {/* Card de Financeiro */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="money-bill-wave" size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Financeiro</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <FontAwesome5 name="money-bill-wave" size={24} color="#10b981" style={{ marginBottom: 8 }} />
            <Text style={[styles.metricValue, { fontSize: 18 }]}>
              R$ {metrics.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.metricLabel}>Receita Total</Text>
            <Text style={styles.metricSubtitle}>todas as contas</Text>
          </View>
          <View style={styles.metricItem}>
            <FontAwesome5 name="chart-line" size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
            <Text style={[styles.metricValue, { fontSize: 18 }]}>
              R$ {metrics.receitaMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.metricLabel}>Mês Atual</Text>
            <Text style={styles.metricSubtitle}>
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>
      </>)}

      {/* Gráfico de Cadastros */}
      <Text style={styles.sectionTitle}>Cadastros por Mês</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartRow}>
          {monthlySeries.map((m, idx) => {
            const height = (m.count / maxCount) * 120 + (m.count > 0 ? 4 : 0);
            return (
              <View key={idx} style={styles.chartBarContainer}>
                <Text style={styles.chartCount}>{m.count}</Text>
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
  
  // Novos estilos para cards agrupados
  sectionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  
  // Estilos do card expansível de relatórios
  reportCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  reportSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  
  // Estilos antigos mantidos para compatibilidade
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
  chartCount: { color: '#fff', fontSize: 12, marginBottom: 4, fontWeight: '600' },
});