import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, RefreshControl, ActivityIndicator, Animated, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

interface VendaItem {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  data: Date;
  comanda_id: number;
  vendedor: string;
  cliente_nome: string;
  tipo: 'produto' | 'servico' | 'pacote';
}

interface Cliente {
  id: number;
  nome: string;
}

interface Comanda {
  id: number;
  created_at: string;
  data_fechamento: string;
  status: string;
  valor_total: number;
  created_by_user_nome: string;
  cliente_id: number;
  clientes: Cliente;
}

interface ComandaItem {
  id: number;
  quantidade: number;
  preco: number;
  nome: string;
  tipo: string;
  created_at: string;
  comanda_id: number;
  comandas: Comanda;
}

interface Resumo {
  totalVendas: number;
  quantidadeItens: number;
  valorTotal: number;
  produtos: VendaItem[];
  servicos: VendaItem[];
  pacotes: VendaItem[];
}

const VendasScreen = () => {
  const [vendas, setVendas] = useState<Resumo>({
    totalVendas: 0,
    quantidadeItens: 0,
    valorTotal: 0,
    produtos: [],
    servicos: [],
    pacotes: []
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    comandaId: '',
    tipo: 'todos' as 'todos' | 'produtos' | 'servicos' | 'pacotes'
  });
  const [debouncedFiltros, setDebouncedFiltros] = useState(filtros);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const [showCalendarInicio, setShowCalendarInicio] = useState(false);
  const [showCalendarFim, setShowCalendarFim] = useState(false);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setDebouncedFiltros(filtros);
    }, 500);
  }, [filtros]);

  useEffect(() => {
    setPage(1);
    carregarVendas(1, true);
  }, [debouncedFiltros]);

  const carregarVendas = async (pagina: number, refresh = false) => {
    try {
      setLoading(true);
      const cacheKey = `vendas_${JSON.stringify(debouncedFiltros)}_${pagina}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData && !refresh) {
        const parsedData = JSON.parse(cachedData);
        setVendas(prev => refresh ? parsedData : {
          ...prev,
          ...parsedData
        });
        setHasMore(parsedData.hasMore);
        return;
      }

      let query = supabase
        .from('comandas_itens')
        .select(`
          id,
          quantidade,
          preco,
          nome,
          tipo,
          created_at,
          comanda_id,
          comandas!inner (
            id,
            created_at,
            data_fechamento,
            status,
            valor_total,
            created_by_user_nome,
            cliente_id,
            clientes!inner (
              id,
              nome
            )
          )
        `)
        .eq('comandas.status', 'fechada')
        .order('created_at', { ascending: false });

      if (debouncedFiltros.tipo === 'produtos') {
        query = query.eq('tipo', 'produto');
      } else if (debouncedFiltros.tipo === 'servicos') {
        query = query.eq('tipo', 'servico');
      } else if (debouncedFiltros.tipo === 'pacotes') {
        query = query.eq('tipo', 'pacote');
      }

      if (debouncedFiltros.dataInicio) {
        query = query.gte('created_at', debouncedFiltros.dataInicio.toISOString());
      }
      if (debouncedFiltros.dataFim) {
        query = query.lte('created_at', debouncedFiltros.dataFim.toISOString());
      }
      if (debouncedFiltros.comandaId) {
        query = query.eq('comanda_id', parseInt(debouncedFiltros.comandaId));
      }

      query = query.range((pagina - 1) * 20, pagina * 20 - 1);

      const { data, error } = await query;

      if (error) throw error;

      const vendasFormatadas = (data as unknown as ComandaItem[]).map(item => ({
        id: item.id,
        nome: item.nome,
        quantidade: item.quantidade,
        preco: item.preco,
        data: new Date(item.created_at),
        comanda_id: item.comanda_id,
        vendedor: item.comandas.created_by_user_nome,
        cliente_nome: item.comandas.clientes?.nome || 'Cliente não encontrado',
        tipo: item.tipo as 'produto' | 'servico' | 'pacote'
      }));

      let produtos = [], servicos = [], pacotes = [];
      if (debouncedFiltros.tipo === 'todos') {
        produtos = vendasFormatadas.filter(item => item.tipo === 'produto');
        servicos = vendasFormatadas.filter(item => item.tipo === 'servico');
        pacotes = vendasFormatadas.filter(item => item.tipo === 'pacote');
      } else if (debouncedFiltros.tipo === 'produtos') {
        produtos = vendasFormatadas;
      } else if (debouncedFiltros.tipo === 'servicos') {
        servicos = vendasFormatadas;
      } else if (debouncedFiltros.tipo === 'pacotes') {
        pacotes = vendasFormatadas;
      }

      const comandasUnicas = new Set(vendasFormatadas.map(item => item.comanda_id));
      const totalVendas = comandasUnicas.size;
      const quantidadeItens = vendasFormatadas.reduce((acc, item) => acc + item.quantidade, 0);
      const valorTotal = vendasFormatadas.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);

      const newData: Resumo = {
        totalVendas,
        quantidadeItens,
        valorTotal,
        produtos,
        servicos,
        pacotes
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify({ ...newData, hasMore: data.length === 20 }));

      setVendas(prev => refresh ? newData : {
        totalVendas: prev.totalVendas + totalVendas,
        quantidadeItens: prev.quantidadeItens + quantidadeItens,
        valorTotal: prev.valorTotal + valorTotal,
        produtos: refresh ? produtos : [...prev.produtos, ...produtos],
        servicos: refresh ? servicos : [...prev.servicos, ...servicos],
        pacotes: refresh ? pacotes : [...prev.pacotes, ...pacotes]
      });
      setHasMore(data.length === 20);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as vendas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    carregarVendas(1, true);
  }, []);

  const renderSecao = useCallback((titulo: string, itens: VendaItem[]) => {
    if (itens.length === 0) return null;
    return (
      <View key={titulo} style={styles.secaoContainer}>
        <Text style={styles.secaoTitulo}>{titulo}</Text>
        {itens.map((item, index) => (
          <Animated.View 
            key={`${item.id}-${item.comanda_id}`}
            style={[
              styles.itemContainer,
              {
                opacity: scrollY.interpolate({
                  inputRange: [(index - 1) * 100, index * 100],
                  outputRange: [1, 1],
                  extrapolate: 'clamp',
                })
              },
            ]}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.nome}</Text>
              <Text style={styles.itemDate}>
                {format(item.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Text>
            </View>
            
            <View style={styles.itemDetails}>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemLabel}>Quantidade:</Text>
                <Text style={styles.itemValue}>{item.quantidade}</Text>
              </View>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemLabel}>Preço Unitário:</Text>
                <Text style={styles.itemValue}>
                  R$ {item.preco.toFixed(2)}
                </Text>
              </View>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemLabel}>Total:</Text>
                <Text style={styles.itemValue}>
                  R$ {(item.quantidade * item.preco).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.itemFooter}>
              <Text style={styles.itemInfo}>Comanda: #{item.comanda_id}</Text>
              <Text style={styles.itemInfo}>Vendedor: {item.vendedor}</Text>
              <Text style={styles.itemInfo}>Cliente: {item.cliente_nome}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }, [scrollY]);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }, [loading]);

  const handleDateSelect = (date: any, isInicio: boolean) => {
    const [year, month, day] = date.dateString.split('-').map(Number);
    const novaData = new Date(year, month - 1, day);
    setFiltros(prev => ({
      ...prev,
      [isInicio ? 'dataInicio' : 'dataFim']: novaData
    }));
    if (isInicio) {
      setShowCalendarInicio(false);
    } else {
      setShowCalendarFim(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.title}>Relatório de Vendas</Text>
      </Animated.View>

      <View style={styles.resumoContainer}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Total de Vendas</Text>
          <Text style={styles.resumoValue}>{vendas.totalVendas}</Text>
        </View>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Qtd. Itens</Text>
          <Text style={styles.resumoValue}>{vendas.quantidadeItens}</Text>
        </View>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Valor Total</Text>
          <Text style={styles.resumoValue}>R$ {vendas.valorTotal.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filtroRow}>
          <TouchableOpacity 
            style={styles.filtroButton}
            onPress={() => setShowCalendarInicio(true)}
          >
            <Text style={styles.filtroButtonText}>
              {filtros.dataInicio 
                ? format(filtros.dataInicio, 'dd/MM/yyyy')
                : 'Data Início'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filtroButton}
            onPress={() => setShowCalendarFim(true)}
          >
            <Text style={styles.filtroButtonText}>
              {filtros.dataFim 
                ? format(filtros.dataFim, 'dd/MM/yyyy')
                : 'Data Fim'}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Número da Comanda"
          value={filtros.comandaId}
          onChangeText={text => setFiltros(prev => ({ ...prev, comandaId: text }))}
          keyboardType="numeric"
        />
        <View style={styles.tiposFiltroContainer}>
          {['todos', 'produtos', 'servicos', 'pacotes'].map(tipo => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.tipoFiltroButton,
                filtros.tipo === tipo && styles.tipoFiltroButtonAtivo
              ]}
              onPress={() => setFiltros(prev => ({ ...prev, tipo: tipo as any }))}
            >
              <Text style={[
                styles.tipoFiltroText,
                filtros.tipo === tipo && styles.tipoFiltroTextAtivo
              ]}>
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendário para Data Início */}
        <Modal
          visible={showCalendarInicio}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCalendarInicio(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCalendarInicio(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.calendarContainer}
            >
              <Calendar
                onDayPress={(date) => handleDateSelect(date, true)}
                markedDates={{
                  [format(filtros.dataInicio || new Date(), 'yyyy-MM-dd')]: {
                    selected: true,
                    selectedColor: '#4CAF50'
                  }
                }}
                theme={{
                  selectedDayBackgroundColor: '#4CAF50',
                  todayTextColor: '#4CAF50',
                  arrowColor: '#4CAF50',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14,
                }}
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendarInicio(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Calendário para Data Fim */}
        <Modal
          visible={showCalendarFim}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCalendarFim(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCalendarFim(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.calendarContainer}
            >
              <Calendar
                onDayPress={(date) => handleDateSelect(date, false)}
                markedDates={{
                  [format(filtros.dataFim || new Date(), 'yyyy-MM-dd')]: {
                    selected: true,
                    selectedColor: '#4CAF50'
                  }
                }}
                theme={{
                  selectedDayBackgroundColor: '#4CAF50',
                  todayTextColor: '#4CAF50',
                  arrowColor: '#4CAF50',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14,
                }}
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendarFim(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setIsScrolling(true)}
        onScrollEndDrag={() => setIsScrolling(false)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onMomentumScrollEnd={() => {
          if (hasMore && !loading) {
            carregarVendas(page + 1);
          }
        }}
      >
        {renderSecao('Produtos', vendas.produtos)}
        {renderSecao('Serviços', vendas.servicos)}
        {renderSecao('Pacotes', vendas.pacotes)}
        {renderFooter()}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  resumoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 16,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  resumoLabel: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
  },
  resumoValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filtroButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  filtroButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  tiposFiltroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  tipoFiltroButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  tipoFiltroButtonAtivo: {
    backgroundColor: '#4CAF50',
  },
  tipoFiltroText: {
    color: '#666',
    fontWeight: 'bold',
  },
  tipoFiltroTextAtivo: {
    color: '#fff',
  },
  secaoContainer: {
    marginBottom: 20,
    padding: 16,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  itemDate: {
    fontSize: 14,
    color: '#666666',
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: 14,
    color: '#666666',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  itemInfo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default VendasScreen; 