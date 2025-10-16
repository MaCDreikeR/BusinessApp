import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

interface Agendamento {
  id: string;
  cliente_nome: string;
  servico: string;
  horario: string;
  usuario_nome?: string;
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
  const { user, estabelecimentoId, role } = useAuth();

  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<Venda[]>([]);
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<Produto[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const carregarProdutosBaixoEstoque = useCallback(async () => {
    if (!estabelecimentoId) return;
    try {
      console.log(`Iniciando consulta de produtos com baixo estoque para o estabelecimento: ${estabelecimentoId}`);
      // Tenta via RPC (pode estar desatualizada no banco)
      const { data: produtosRpc, error } = await supabase
        .rpc('get_produtos_baixo_estoque', { p_estabelecimento_id: estabelecimentoId })
        .limit(5);

      if (error) {
        console.warn('RPC get_produtos_baixo_estoque falhou, aplicando fallback:', error);
        // Fallback: buscar produtos e filtrar em JS
        const { data: produtosRaw, error: errProdutos } = await supabase
          .from('produtos')
          .select('id, nome, quantidade, quantidade_minima, estabelecimento_id')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('quantidade', { ascending: true })
          .limit(50);

        if (errProdutos) throw errProdutos;

        const filtrados = (produtosRaw || [])
          .filter(p => (p.quantidade ?? 0) <= (p.quantidade_minima ?? 5))
          .slice(0, 5);

        setProdutosBaixoEstoque(filtrados);
        return;
      }

      setProdutosBaixoEstoque(produtosRpc || []);
    } catch (error) {
      console.error('Erro inesperado ao carregar produtos baixo estoque:', error);
    }
  }, [estabelecimentoId]);

  const carregarDados = useCallback(async () => {
    if (!user || !estabelecimentoId) return;
    try {
      console.log('Buscando dados para o estabelecimento:', estabelecimentoId);
      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3);
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      const [
        { data: agendamentos, error: agendamentosError },
        { data: vendasHojeData, error: vendasError },
        { count: clientesCount, error: clientesError },
        { data: proxAgendamentos, error: proxError },
        { data: vendasRecentesData, error: vendasRecentesError },
      ] = await Promise.all([
        // Carregar agendamentos de hoje
        supabase.from('agendamentos').select('*', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId).gte('data_hora', inicioHoje.toISOString()).lte('data_hora', fimHoje.toISOString()),
        // Carregar vendas de hoje - SOMENTE COMANDAS FECHADAS HOJE
        supabase.from('comandas_itens').select(`preco_total, comandas!inner(status, estabelecimento_id, finalized_at)`).eq('comandas.estabelecimento_id', estabelecimentoId).eq('comandas.status', 'fechada').gte('comandas.finalized_at', inicioHoje.toISOString()).lte('comandas.finalized_at', fimHoje.toISOString()),
        // Carregar clientes ativos
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('estabelecimento_id', estabelecimentoId),
        // Carregar próximos agendamentos diretamente
        supabase.from('agendamentos')
          .select('id, cliente, data_hora, servicos, usuario_id, status')
          .eq('estabelecimento_id', estabelecimentoId)
          .gte('data_hora', new Date().toISOString())
          .order('data_hora', { ascending: true })
          .limit(5),
        // Carregar vendas recentes - COMANDAS FECHADAS COM VALOR_TOTAL
        supabase.from('comandas').select('id, cliente_nome, valor_total, finalized_at').eq('estabelecimento_id', estabelecimentoId).eq('status', 'fechada').order('finalized_at', { ascending: false }).limit(5),
      ]);

      if (agendamentosError) console.error('Erro agendamentos:', agendamentosError); else setAgendamentosHoje(agendamentos?.length || 0);
      if (vendasError) {
        console.error('Erro vendas hoje:', vendasError);
      } else {
        console.log('Vendas hoje dados:', vendasHojeData);
        setVendasHoje(vendasHojeData?.reduce((total, v) => total + (v.preco_total || 0), 0) || 0);
      }
      if (clientesError) console.error('Erro clientes:', clientesError); else setClientesAtivos(clientesCount || 0);
      if (proxError) {
        console.error('Erro próximos agendamentos:', proxError);
      } else if (proxAgendamentos) {
        console.log('Próximos agendamentos carregados:', proxAgendamentos);
        
        // Buscar nomes dos usuários
        const agendamentosComUsuarios = await Promise.all(
          proxAgendamentos.map(async (ag: any) => {
            let usuarioNome = 'Não atribuído';
            
            if (ag.usuario_id) {
              const { data: userData } = await supabase
                .from('usuarios')
                .select('nome_completo')
                .eq('id', ag.usuario_id)
                .single();
              
              if (userData) {
                usuarioNome = userData.nome_completo;
              }
            }
            
            return {
              id: ag.id,
              cliente_nome: ag.cliente || 'Cliente não informado',
              servico: ag.servicos?.[0]?.nome || 'Serviço não especificado',
              horario: ag.data_hora,
              usuario_nome: usuarioNome,
              status: ag.status
            };
          })
        );
        
        setProximosAgendamentos(agendamentosComUsuarios);
      }
      if (vendasRecentesError) {
        console.error('Erro vendas recentes:', vendasRecentesError);
      } else if (vendasRecentesData) {
        console.log('Vendas recentes dados:', vendasRecentesData);
        setVendasRecentes(vendasRecentesData.map((v: any) => ({ 
          id: v.id, 
          cliente_nome: v.cliente_nome || 'Cliente não informado', 
          valor: v.valor_total || 0, 
          data: v.finalized_at 
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    }
  }, [user, estabelecimentoId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([carregarDados(), carregarProdutosBaixoEstoque()]);
    setRefreshing(false);
  }, [carregarDados, carregarProdutosBaixoEstoque]);

  useEffect(() => {
    carregarDados();
    carregarProdutosBaixoEstoque();
  }, [carregarDados, carregarProdutosBaixoEstoque]);

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
        {role !== 'profissional' && (
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
        )}

        {role !== 'profissional' && (
          <TouchableOpacity
            style={[styles.card, styles.cardSuccess]}
            onPress={() => {
              console.log('Navegando para vendas...');
              router.push('/(app)/vendas');
            }}
          >
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="dollar-sign" size={24} color="#22C55E" />
            </View>
            <Text style={styles.cardTitle}>Vendas Hoje</Text>
            <Text style={styles.cardValue}>R$ {vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtitle}>Total do dia</Text>
          </TouchableOpacity>
        )}

        {role !== 'profissional' && (
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
        )}

        {role !== 'profissional' && (
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
        )}
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
                  {agendamento.horario ? format(new Date(agendamento.horario), "HH:mm") : '--:--'}
                </Text>
              </View>

              <View style={styles.agendamentoContent}>
                <Text style={styles.agendamentoCliente} numberOfLines={1}>
                  {agendamento.cliente_nome}
                </Text>
                <Text style={styles.agendamentoServico} numberOfLines={1}>
                  {agendamento.servico}
                </Text>
                {agendamento.usuario_nome && (
                  <View style={styles.agendamentoProfissionalContainer}>
                    <FontAwesome5 name="user" size={10} color="#7C3AED" style={{ marginRight: 4 }} />
                    <Text style={styles.agendamentoProfissional} numberOfLines={1}>
                      {agendamento.usuario_nome}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.agendamentoData}>
                <Text style={styles.agendamentoDia}>
                  {agendamento.horario ? format(new Date(agendamento.horario), "dd/MM") : '--/--'}
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

      {role !== 'profissional' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vendas Recentes</Text>
            <TouchableOpacity onPress={() => {
              console.log('Navegando para vendas via Ver todas...');
              router.push('/(app)/vendas');
            }}>
              <Text style={styles.sectionAction}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {vendasRecentes.length > 0 ? (
            vendasRecentes.map(venda => (
              <View key={venda.id} style={styles.vendaItem}>
                <View style={styles.vendaContent}>
                  <Text style={styles.vendaCliente}>{venda.cliente_nome}</Text>
                  <Text style={styles.vendaData}>
                    {venda.data ? new Date(venda.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data indisponível'}
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
      )}

      {role !== 'profissional' && (
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
      )}
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
  agendamentoProfissional: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    flex: 1,
  },
  agendamentoProfissionalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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