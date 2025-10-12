import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated, ActivityIndicator, TextInput, ScrollView } from 'react-native';
// Filtros de status
const STATUS_FILTROS = [
  { label: 'Todos', value: null },
  { label: 'Aprovados', value: 'aprovado' },
  { label: 'Pendentes', value: 'pendente' },
  { label: 'Rejeitados', value: 'rejeitado' },
];
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { 
  Orcamento, 
  carregarOrcamentos, 
  formatarData, 
  formatarValor, 
  getStatusColor, 
  getStatusText 
} from './utils';

const SkeletonLoader = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.list}>
      {[1, 2, 3].map((index) => (
        <Animated.View 
          key={index}
          style={[
            styles.card,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.skeleton, { width: '60%', height: 20 }]} />
            <View style={[styles.skeleton, { width: '25%', height: 20 }]} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <View style={[styles.skeleton, { width: '40%', height: 16 }]} />
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.skeleton, { width: '30%', height: 16 }]} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

export default function OrcamentosScreen() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [orcamentosFiltrados, setOrcamentosFiltrados] = useState<Orcamento[]>([]);

  const [statusFiltro, setStatusFiltro] = useState<null | string>(null);

  useEffect(() => {
    carregarOrcamentosLista();
  }, []);

  useEffect(() => {
    let filtrados = orcamentos;
    if (statusFiltro) {
      filtrados = filtrados.filter(o => (o.status || '').toLowerCase() === statusFiltro);
    }
    if (busca.trim() !== '') {
      filtrados = filtrados.filter(orcamento => 
        orcamento.cliente.toLowerCase().includes(busca.toLowerCase())
      );
    }
    setOrcamentosFiltrados(filtrados);
  }, [busca, orcamentos, statusFiltro]);

  async function carregarOrcamentosLista() {
    try {
      setLoading(true);
      const data = await carregarOrcamentos();
      setOrcamentos(data);
      setOrcamentosFiltrados(data);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os orçamentos');
    } finally {
      setLoading(false);
    }
  }

  function handleNovoOrcamento() {
    router.push('/orcamentos/novo');
  }

  const renderItem = ({ item }: { item: Orcamento }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/orcamentos/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cliente}>{item.cliente}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{formatarData(item.data)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.valor}>{formatarValor(item.valor_total)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros de status */}
      <View style={styles.filtrosContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
          {STATUS_FILTROS.map(filtro => (
            <TouchableOpacity
              key={filtro.label}
              style={[styles.filtroButton, statusFiltro === filtro.value && styles.filtroButtonSelected]}
              onPress={() => setStatusFiltro(filtro.value)}
            >
              <Text style={[styles.filtroButtonText, statusFiltro === filtro.value && styles.filtroButtonTextSelected]}>{filtro.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente..."
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor="#6B7280"
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={orcamentosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busca.length > 0 
                ? 'Nenhum orçamento encontrado para esta busca'
                : 'Nenhum orçamento cadastrado'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  filtrosContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  filtrosScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filtroButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroButtonSelected: {
    backgroundColor: '#7C3AED',
  },
  filtroButtonText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 15,
  },
  filtroButtonTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cliente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 14,
  },
  valor: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
}); 