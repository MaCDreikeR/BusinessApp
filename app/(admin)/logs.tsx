import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogAtividade {
  id: string;
  user_id: string | null;
  estabelecimento_id: string | null;
  acao: string;
  detalhes: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  usuario: {
    nome_completo: string;
    email: string;
  } | null;
  estabelecimento: {
    nome: string;
  } | null;
}

export default function LogsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [search, setSearch] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  const fetchLogs = async (resetPage = false) => {
    if (!hasMore && !resetPage) return;
    
    setLoading(resetPage);
    try {
      const currentPage = resetPage ? 0 : page;
      let query = supabase
        .from('logs_atividades')
        .select(`
          *,
          usuario:user_id(nome_completo, email),
          estabelecimento:estabelecimento_id(nome)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (filtroAcao) {
        query = query.ilike('acao', `%${filtroAcao}%`);
      }

      if (search) {
        query = query.or(`acao.ilike.%${search}%,detalhes.cs.{"descricao":"${search}"}`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (resetPage) {
        setLogs(data || []);
        setPage(0);
      } else {
        setLogs([...logs, ...(data || [])]);
      }

      setHasMore(((currentPage + 1) * ITEMS_PER_PAGE) < (count || 0));
      if (!resetPage) setPage(currentPage + 1);
    } catch (error: any) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [filtroAcao, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await fetchLogs(true);
    setRefreshing(false);
  }, [filtroAcao, search]);

  const acaoIcon = (acao: string) => {
    if (acao.includes('login')) return 'sign-in-alt';
    if (acao.includes('logout')) return 'sign-out-alt';
    if (acao.includes('criar') || acao.includes('cadastr')) return 'plus-circle';
    if (acao.includes('atualiz') || acao.includes('edit')) return 'edit';
    if (acao.includes('delet') || acao.includes('exclu')) return 'trash';
    if (acao.includes('suspen')) return 'pause-circle';
    if (acao.includes('ativ')) return 'play-circle';
    if (acao.includes('pag')) return 'money-bill';
    return 'info-circle';
  };

  const acaoColor = (acao: string) => {
    if (acao.includes('login')) return '#4ade80';
    if (acao.includes('logout')) return '#6B7280';
    if (acao.includes('criar') || acao.includes('cadastr')) return '#60a5fa';
    if (acao.includes('atualiz') || acao.includes('edit')) return '#fbbf24';
    if (acao.includes('delet') || acao.includes('exclu')) return '#ef4444';
    if (acao.includes('suspen')) return '#f59e0b';
    if (acao.includes('ativ')) return '#10b981';
    if (acao.includes('pag')) return '#8b5cf6';
    return '#9CA3AF';
  };

  const renderLog = ({ item }: { item: LogAtividade }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={[styles.iconContainer, { backgroundColor: acaoColor(item.acao) + '20' }]}>
          <FontAwesome5 name={acaoIcon(item.acao)} size={18} color={acaoColor(item.acao)} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.logAcao}>{item.acao}</Text>
          <Text style={styles.logData}>
            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </Text>
        </View>
      </View>

      {item.usuario && (
        <View style={styles.logDetail}>
          <FontAwesome5 name="user" size={12} color="#9CA3AF" />
          <Text style={styles.logDetailText}>
            {item.usuario.nome_completo} ({item.usuario.email})
          </Text>
        </View>
      )}

      {item.estabelecimento && (
        <View style={styles.logDetail}>
          <FontAwesome5 name="building" size={12} color="#9CA3AF" />
          <Text style={styles.logDetailText}>{item.estabelecimento.nome}</Text>
        </View>
      )}

      {item.ip_address && (
        <View style={styles.logDetail}>
          <FontAwesome5 name="map-marker-alt" size={12} color="#9CA3AF" />
          <Text style={styles.logDetailText}>IP: {item.ip_address}</Text>
        </View>
      )}

      {item.detalhes && Object.keys(item.detalhes).length > 0 && (
        <View style={styles.detalhesContainer}>
          <Text style={styles.detalhesTitle}>Detalhes:</Text>
          <Text style={styles.detalhesText}>{JSON.stringify(item.detalhes, null, 2)}</Text>
        </View>
      )}
    </View>
  );

  const acoesComuns = [
    'login',
    'logout',
    'criar',
    'atualizar',
    'deletar',
    'suspender',
    'ativar',
    'pagamento',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Logs de Atividades</Text>
      </View>

      {/* Barra de Busca */}
      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar logs..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <FontAwesome5 name="times-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros por Ação */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filtroAcao && styles.filterButtonActive]}
          onPress={() => setFiltroAcao(null)}
        >
          <Text style={[styles.filterText, !filtroAcao && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
        {acoesComuns.map((acao) => (
          <TouchableOpacity
            key={acao}
            style={[styles.filterButton, filtroAcao === acao && styles.filterButtonActive]}
            onPress={() => setFiltroAcao(acao === filtroAcao ? null : acao)}
          >
            <Text style={[styles.filterText, filtroAcao === acao && styles.filterTextActive]}>
              {acao.charAt(0).toUpperCase() + acao.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing && logs.length === 0 ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={{ marginTop: 10, color: '#fff' }}>Carregando logs...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          onEndReached={() => fetchLogs(false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#a78bfa" />
                <Text style={styles.loadingMoreText}>Carregando mais...</Text>
              </View>
            ) : logs.length > 0 ? (
              <Text style={styles.endText}>Fim dos logs</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="inbox" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>Nenhum log encontrado</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#a78bfa',
  },
  filterText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: { padding: 16, paddingBottom: 32 },
  logCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logAcao: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  logData: { fontSize: 12, color: '#9CA3AF' },
  logDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logDetailText: { fontSize: 13, color: '#D1D5DB' },
  detalhesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  detalhesTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  detalhesText: { fontSize: 11, color: '#D1D5DB', fontFamily: 'monospace' },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: { fontSize: 14, color: '#9CA3AF' },
  endText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
});
