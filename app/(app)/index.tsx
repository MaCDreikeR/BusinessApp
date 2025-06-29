import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';

interface Agendamento {
  id: string;
  cliente_nome: string;
  servico: string;
  horario: string;
}

interface Venda {
  id: string;
  cliente_nome: string;
  valor: number;
  data: string;
}

interface Produto {
  id: string;
  nome: string;
  quantidade: number;
  quantidade_minima: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<Venda[]>([]);
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<Produto[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.error('Usuário não autenticado');
        Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login novamente.');
        router.replace('/(auth)/login');
        return;
      }

      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3); // Ajuste para o fuso horário do Brasil
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      console.log('Buscando agendamentos entre:', inicioHoje.toISOString(), 'e', fimHoje.toISOString());

      // Carregar agendamentos de hoje
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data_hora', inicioHoje.toISOString())
        .lte('data_hora', fimHoje.toISOString())
        .order('data_hora');

      if (agendamentosError) {
        console.error('Erro ao carregar agendamentos:', agendamentosError);
      } else {
        console.log('Agendamentos encontrados:', agendamentos);
        setAgendamentosHoje(agendamentos?.length || 0);
      }

      // Carregar vendas de hoje
      const { data: vendasHojeData, error: vendasError } = await supabase
        .from('comandas_itens')
        .select(`
          preco_total,
          comandas (
            status
          )
        `)
        .eq('comandas.status', 'fechada')
        .gte('created_at', inicioHoje.toISOString())
        .lte('created_at', fimHoje.toISOString());

      if (vendasError) {
        console.error('Erro ao carregar vendas de hoje:', vendasError);
      } else {
        console.log('Vendas de hoje encontradas:', vendasHojeData);
        const totalVendas = vendasHojeData?.reduce((total, venda) => total + (venda.preco_total || 0), 0) || 0;
        setVendasHoje(totalVendas);
      }

      // Carregar clientes ativos
      const { count } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      setClientesAtivos(count || 0);

      // Carregar próximos agendamentos
      const { data: proxAgendamentos, error: proxError } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data_hora', new Date().toISOString())
        .order('data_hora')
        .limit(5);

      if (proxError) {
        console.error('Erro ao carregar próximos agendamentos:', proxError);
      } else {
        console.log('Próximos agendamentos encontrados:', proxAgendamentos);
        if (proxAgendamentos) {
          const agendamentosFormatados = proxAgendamentos.map(agendamento => ({
            ...agendamento,
            cliente_nome: agendamento.cliente || 'Cliente não informado',
            servico: Array.isArray(agendamento.servicos) && agendamento.servicos.length > 0 
              ? agendamento.servicos[0].nome 
              : 'Serviço não informado',
            horario: agendamento.data_hora
          }));
          setProximosAgendamentos(agendamentosFormatados);
        }
      }

      // Carregar vendas recentes
      const { data: vendasRecentesData, error: vendasRecentesError } = await supabase
        .from('comandas_itens')
        .select(`
          id,
          preco_total,
          created_at,
          comandas (
            cliente_nome
          )
        `)
        .eq('comandas.status', 'fechada')
        .order('created_at', { ascending: false })
        .limit(5);

      if (vendasRecentesError) {
        console.error('Erro ao carregar vendas recentes:', vendasRecentesError);
      } else {
        console.log('Vendas recentes encontradas:', vendasRecentesData);
        setVendasRecentes(vendasRecentesData?.map(venda => ({
          id: venda.id,
          cliente_nome: venda.comandas?.cliente_nome || 'Cliente não informado',
          valor: venda.preco_total,
          data: venda.created_at
        })) || []);
      }

      // Carregar produtos com baixo estoque
      await carregarProdutosBaixoEstoque();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    }
  };

  const carregarProdutosBaixoEstoque = async () => {
    try {
      console.log('Iniciando consulta de produtos com baixo estoque...');
      const { data: produtos, error } = await supabase
        .rpc('get_produtos_baixo_estoque')
        .limit(5);

      if (error) {
        console.error('Erro ao carregar produtos baixo estoque:', error.message);
        return;
      }

      console.log(`Encontrados ${produtos?.length || 0} produtos com baixo estoque:`, produtos);
      setProdutosBaixoEstoque(produtos || []);
    } catch (error) {
      console.error('Erro ao carregar produtos baixo estoque:', error);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#7C3AED"]}
          tintColor="#7C3AED"
          title="Atualizando..."
          titleColor="#6B7280"
        />
      }
    >
      <View style={styles.grid}>
        <TouchableOpacity 
          style={[styles.card, styles.cardPrimary]}
          onPress={() => router.push('/agenda')}
        >
          <View style={styles.cardIconContainer}>
            <FontAwesome5 name="calendar-check" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.cardTitle}>Agendamentos Hoje</Text>
          <Text style={styles.cardValue}>{agendamentosHoje}</Text>
          <Text style={styles.cardSubtitle}>Ver agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.cardSuccess]}
          onPress={() => router.push('/vendas')}
        >
          <View style={styles.cardIconContainer}>
            <FontAwesome5 name="dollar-sign" size={24} color="#22C55E" />
          </View>
          <Text style={styles.cardTitle}>Vendas Hoje</Text>
          <Text style={styles.cardValue}>R$ {vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.cardSubtitle}>Total do dia</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.cardInfo]}
          onPress={() => router.push('/clientes')}
        >
          <View style={styles.cardIconContainer}>
            <FontAwesome5 name="users" size={24} color="#0066FF" />
          </View>
          <Text style={styles.cardTitle}>Clientes Ativos</Text>
          <Text style={styles.cardValue}>{clientesAtivos}</Text>
          <Text style={styles.cardSubtitle}>Ver clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.cardDanger]}
          onPress={() => router.push('/estoque')}
        >
          <View style={styles.cardIconContainer}>
            <FontAwesome5 name="exclamation-triangle" size={24} color="#EF4444" />
          </View>
          <Text style={styles.cardTitle}>Produtos Baixo Estoque</Text>
          <Text style={styles.cardValue}>{produtosBaixoEstoque?.length || 0}</Text>
          <Text style={styles.cardSubtitle}>Ver estoque</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Agendamentos</Text>
          <TouchableOpacity onPress={() => router.push('/agenda')}>
            <Text style={styles.sectionAction}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {proximosAgendamentos.length > 0 ? (
          proximosAgendamentos.map((agendamento, index) => (
            <View 
              key={agendamento.id} 
              style={[
                styles.agendamentoItem,
                index === 0 && styles.primeiroAgendamento,
                index === proximosAgendamentos.length - 1 && styles.ultimoAgendamento
              ]}
            >
              <View style={styles.agendamentoHeader}>
                <View style={styles.agendamentoIcon}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#7C3AED" />
                </View>
                <Text style={styles.agendamentoHorario}>
                  {agendamento.horario ? format(new Date(agendamento.horario), "HH:mm", { locale: ptBR }) : '--:--'}
                </Text>
              </View>
              
              <View style={styles.agendamentoContent}>
                <Text style={styles.agendamentoCliente} numberOfLines={1}>
                  {agendamento.cliente_nome}
                </Text>
                <Text style={styles.agendamentoServico} numberOfLines={1}>
                  {agendamento.servico}
                </Text>
              </View>

              <View style={styles.agendamentoData}>
                <Text style={styles.agendamentoDia}>
                  {agendamento.horario ? format(new Date(agendamento.horario), "dd/MM", { locale: ptBR }) : '--/--'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyAgendamentos}>
            <FontAwesome5 name="calendar-times" size={24} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhum agendamento próximo</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vendas Recentes</Text>
          <TouchableOpacity onPress={() => router.push('/vendas')}>
            <Text style={styles.sectionAction}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {vendasRecentes.length > 0 ? (
          vendasRecentes.map(venda => (
            <View key={venda.id} style={styles.vendaItem}>
              <View style={styles.vendaContent}>
                <Text style={styles.vendaCliente}>{venda.cliente_nome}</Text>
                <Text style={styles.vendaData}>
                  {format(new Date(venda.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Text>
              </View>
              <Text style={styles.vendaValor}>
                R$ {venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome5 name="receipt" size={24} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhuma venda recente</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produtos com Baixo Estoque</Text>
          <TouchableOpacity onPress={() => router.push('/estoque')}>
            <Text style={styles.sectionAction}>Ver estoque</Text>
          </TouchableOpacity>
        </View>
        {produtosBaixoEstoque && produtosBaixoEstoque.length > 0 ? (
          produtosBaixoEstoque.map(produto => (
            <View key={produto.id} style={styles.produtoItem}>
              <View style={styles.produtoContent}>
                <Text style={styles.produtoNome}>{produto.nome}</Text>
                <View style={styles.produtoInfo}>
                  <Text style={[
                    styles.produtoQuantidade,
                    produto.quantidade === 0 ? styles.produtoZerado : styles.produtoBaixo
                  ]}>
                    Estoque: {produto.quantidade}
                  </Text>
                  <Text style={styles.produtoMinimo}>
                    Mínimo: {produto.quantidade_minima}
                  </Text>
                </View>
              </View>
              <View style={styles.produtoStatus}>
                <FontAwesome5 
                  name={produto.quantidade === 0 ? "times-circle" : "exclamation-circle"} 
                  size={20} 
                  color={produto.quantidade === 0 ? "#EF4444" : "#F59E0B"} 
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome5 name="check-circle" size={24} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhum produto com estoque baixo</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    minHeight: 160,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  cardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  cardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  cardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionAction: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  vendaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vendaContent: {
    flex: 1,
    marginRight: 16,
  },
  vendaCliente: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  vendaData: {
    fontSize: 14,
    color: '#6B7280',
  },
  vendaValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  produtoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  produtoContent: {
    flex: 1,
    marginRight: 16,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  produtoInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  produtoQuantidade: {
    fontSize: 14,
    color: '#6B7280',
  },
  produtoMinimo: {
    fontSize: 14,
    color: '#6B7280',
  },
  produtoStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  agendamentoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primeiroAgendamento: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ultimoAgendamento: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 0,
  },
  agendamentoHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  agendamentoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  agendamentoHorario: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  agendamentoContent: {
    flex: 1,
    marginRight: 16,
  },
  agendamentoCliente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  agendamentoServico: {
    fontSize: 14,
    color: '#6B7280',
  },
  agendamentoData: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  agendamentoDia: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  emptyAgendamentos: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  produtoZerado: {
    color: '#EF4444',
    fontWeight: 'bold'
  },
  produtoBaixo: {
    color: '#F59E0B',
    fontWeight: 'bold'
  },
}); 