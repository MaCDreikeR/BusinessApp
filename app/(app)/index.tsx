import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logger } from '../../utils/logger';
import { Agendamento as AgendamentoBase, Produto as ProdutoBase } from '@types';
import { useTheme } from '../../contexts/ThemeContext';
import { CacheManager, CacheNamespaces, CacheTTL } from '../../utils/cacheManager';
import { getStartOfDayLocal, getEndOfDayLocal, toISOStringWithTimezone, parseISOStringLocal } from '../../lib/timezone';

// Tipos estendidos para o dashboard
type AgendamentoDashboard = Pick<AgendamentoBase, 'id' | 'status'> & {
  cliente_nome: string;
  cliente_foto?: string | null;
  servico: string;
  horario: string;
  horario_termino?: string;
  usuario_nome?: string;
};

type VendaDashboard = {
  id: string;
  cliente_nome: string;
  valor: number;
  data: string;
};

type ProdutoDashboard = Pick<ProdutoBase, 'id' | 'nome' | 'quantidade' | 'quantidade_minima'>;

export default function HomeScreen() {
  const router = useRouter();
  const { user, estabelecimentoId, role } = useAuth();
  const { permissions, loading: loadingPermissions } = usePermissions();
  const { colors } = useTheme();

  // Styles dinâmicos baseados no tema
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      padding: 16,
      gap: 16,
      justifyContent: 'flex-start' as const,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      minHeight: 160,
      marginBottom: 0,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      maxWidth: '48%' as const,
      flexGrow: 1,
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    cardValue: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardPrimary: { borderLeftWidth: 4 },
    cardSuccess: { borderLeftWidth: 4, borderLeftColor: '#22C55E' },
    cardInfo: { borderLeftWidth: 4, borderLeftColor: '#0066FF' },
    cardDanger: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    section: {
      backgroundColor: colors.surface,
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 20,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    vendaItem: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    vendaContent: {
      flex: 1,
      marginRight: 16,
    },
    vendaCliente: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 4,
    },
    vendaData: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    vendaValor: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#22C55E',
    },
    produtoItem: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    produtoContent: {
      flex: 1,
      marginRight: 16,
    },
    produtoNome: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 4,
    },
    produtoInfo: {
      flexDirection: 'row' as const,
      gap: 16,
    },
    produtoQuantidade: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    produtoMinimo: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    produtoStatus: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    emptyState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center' as const,
    },
    agendamentoItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      minHeight: 110,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    agendamentoFotoContainer: {
      marginRight: 12,
    },
    agendamentoFoto: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    agendamentoFotoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#F3E8FF',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    agendamentoIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F3E8FF',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    agendamentoHorario: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    agendamentoContent: {
      flex: 1,
    },
    agendamentoCliente: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    agendamentoServico: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    agendamentoProfissional: {
      fontSize: 12,
      fontWeight: '500' as const,
      flex: 1,
    },
    agendamentoProfissionalContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginTop: 2,
    },
    agendamentoFooter: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    agendamentoHorarioContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    agendamentoHorarioText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    agendamentoHorarioSeparador: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: colors.textSecondary,
    },
    agendamentoData: {
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    agendamentoDia: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    emptyAgendamentos: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    produtoZerado: {
      color: '#EF4444',
      fontWeight: 'bold' as const,
    },
    produtoBaixo: {
      color: '#F59E0B',
      fontWeight: 'bold' as const,
    },
  }), [colors]);

  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<AgendamentoDashboard[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<VendaDashboard[]>([]);
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<ProdutoDashboard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const carregarProdutosBaixoEstoque = useCallback(async () => {
    if (!estabelecimentoId) return;
    try {
      // Tentar cache primeiro
      const cacheKey = `baixo_estoque_${estabelecimentoId}`;
      const cachedData = await CacheManager.get<ProdutoDashboard[]>(
        CacheNamespaces.ESTOQUE,
        cacheKey
      );
      
      if (cachedData) {
        setProdutosBaixoEstoque(cachedData);
        return;
      }
      
      logger.debug(`Iniciando consulta de produtos com baixo estoque para o estabelecimento: ${estabelecimentoId}`);
      // Tenta via RPC (pode estar desatualizada no banco)
      const { data: produtosRpc, error } = await supabase
        .rpc('get_produtos_baixo_estoque', { p_estabelecimento_id: estabelecimentoId })
        .limit(5);

      if (error) {
        logger.warn('RPC get_produtos_baixo_estoque falhou, aplicando fallback:', error);
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

        // Salvar no cache (reutiliza cacheKey já declarado acima)
        await CacheManager.set(
          CacheNamespaces.ESTOQUE,
          cacheKey,
          filtrados,
          CacheTTL.TWO_MINUTES
        );
        
        setProdutosBaixoEstoque(filtrados);
        return;
      }

      // Salvar no cache (reutiliza cacheKey já declarado acima)
      await CacheManager.set(
        CacheNamespaces.ESTOQUE,
        cacheKey,
        produtosRpc || [],
        CacheTTL.TWO_MINUTES
      );
      
      setProdutosBaixoEstoque(produtosRpc || []);
    } catch (error) {
      logger.error('Erro inesperado ao carregar produtos baixo estoque:', error);
    }
  }, [estabelecimentoId]);

  const carregarDados = useCallback(async () => {
    if (!user || !estabelecimentoId) return;
    try {
      // Tentar cache primeiro
      const cacheKey = `dashboard_${estabelecimentoId}_${role || 'all'}`;
      const cachedData = await CacheManager.get<any>(
        CacheNamespaces.RELATORIOS,
        cacheKey
      );
      
      if (cachedData) {
        setAgendamentosHoje(cachedData.agendamentosHoje);
        setVendasHoje(cachedData.vendasHoje);
        setClientesAtivos(cachedData.clientesAtivos);
        setProximosAgendamentos(cachedData.proximosAgendamentos);
        setVendasRecentes(cachedData.vendasRecentes);
        return;
      }
      
      logger.debug('Buscando dados para o estabelecimento:', estabelecimentoId);
      
      // 🔧 CORREÇÃO: Usar timezone local para queries
      const inicioHoje = getStartOfDayLocal();
      const fimHoje = getEndOfDayLocal();

      const [
        { data: agendamentos, error: agendamentosError },
        { data: vendasHojeData, error: vendasError },
        { count: clientesCount, error: clientesError },
        { data: proxAgendamentos, error: proxError },
        { data: vendasRecentesData, error: vendasRecentesError },
      ] = await Promise.all([
        // Carregar agendamentos de hoje
        supabase.from('agendamentos').select('*', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId).gte('data_hora', inicioHoje).lte('data_hora', fimHoje),
        // Carregar vendas de hoje - SOMENTE COMANDAS FECHADAS HOJE
        supabase.from('comandas_itens').select(`preco_total, comandas!inner(status, estabelecimento_id, finalized_at)`).eq('comandas.estabelecimento_id', estabelecimentoId).eq('comandas.status', 'fechada').gte('comandas.finalized_at', inicioHoje).lte('comandas.finalized_at', fimHoje),
        // Carregar clientes ativos
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('estabelecimento_id', estabelecimentoId),
        // Carregar próximos agendamentos - profissionais veem apenas os seus
        (() => {
          let query = supabase.from('agendamentos')
            .select('id, cliente, data_hora, horario_termino, servicos, usuario_id, status')
            .eq('estabelecimento_id', estabelecimentoId)
            .gte('data_hora', toISOStringWithTimezone(new Date()))
            .order('data_hora', { ascending: true })
            .limit(5);
          
          // Filtrar por usuário se for profissional
          if (role === 'profissional' && user?.id) {
            query = query.eq('usuario_id', user.id);
          }
          
          return query;
        })(),
        // Carregar vendas recentes - COMANDAS FECHADAS COM VALOR_TOTAL
        supabase.from('comandas').select('id, cliente_nome, valor_total, finalized_at').eq('estabelecimento_id', estabelecimentoId).eq('status', 'fechada').order('finalized_at', { ascending: false }).limit(5),
      ]);

      if (agendamentosError) logger.error('Erro agendamentos:', agendamentosError); else setAgendamentosHoje(agendamentos?.length || 0);
      if (vendasError) {
        logger.error('Erro vendas hoje:', vendasError);
      } else {
        logger.debug('Vendas hoje dados:', vendasHojeData);
        setVendasHoje(vendasHojeData?.reduce((total, v) => total + (v.preco_total || 0), 0) || 0);
      }
      if (clientesError) logger.error('Erro clientes:', clientesError); else setClientesAtivos(clientesCount || 0);
      if (proxError) {
        logger.error('Erro próximos agendamentos:', proxError);
      } else if (proxAgendamentos) {
        logger.debug('Próximos agendamentos carregados:', proxAgendamentos);
        
        // Buscar nomes dos usuários e fotos dos clientes
        const agendamentosComDados = await Promise.all(
          proxAgendamentos.map(async (ag: any) => {
            let usuarioNome = 'Não atribuído';
            let clienteFoto = null;
            
            // Buscar nome do usuário
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
            
            // Buscar foto do cliente pelo nome
            if (ag.cliente) {
              const { data: clienteData } = await supabase
                .from('clientes')
                .select('foto_url')
                .eq('estabelecimento_id', estabelecimentoId)
                .ilike('nome', ag.cliente)
                .limit(1)
                .maybeSingle();
              
              if (clienteData) {
                clienteFoto = clienteData.foto_url;
              }
            }
            
            return {
              id: ag.id,
              cliente_nome: ag.cliente || 'Cliente não informado',
              cliente_foto: clienteFoto,
              servico: ag.servicos?.[0]?.nome || ag.servicos?.[0]?.servico?.nome || 'Serviço não especificado',
              horario: ag.data_hora,
              horario_termino: ag.horario_termino,
              usuario_nome: usuarioNome,
              status: ag.status
            };
          })
        );
        
        setProximosAgendamentos(agendamentosComDados);
      }
      if (vendasRecentesError) {
        logger.error('Erro vendas recentes:', vendasRecentesError);
      } else if (vendasRecentesData) {
        logger.debug('Vendas recentes dados:', vendasRecentesData);
        setVendasRecentes(vendasRecentesData.map((v: any) => ({ 
          id: v.id, 
          cliente_nome: v.cliente_nome || 'Cliente não informado', 
          valor: v.valor_total || 0, 
          data: v.finalized_at 
        })));
      }
      
      // Salvar no cache (reutiliza cacheKey já declarado acima)
      await CacheManager.set(
        CacheNamespaces.RELATORIOS,
        cacheKey,
        {
          agendamentosHoje: agendamentos?.length || 0,
          vendasHoje: vendasHojeData?.reduce((total, v) => total + (v.preco_total || 0), 0) || 0,
          clientesAtivos: clientesCount || 0,
          proximosAgendamentos: proximosAgendamentos,
          vendasRecentes: vendasRecentesData?.map((v: any) => ({ 
            id: v.id, 
            cliente_nome: v.cliente_nome || 'Cliente não informado', 
            valor: v.valor_total || 0, 
            data: v.finalized_at 
          })) || []
        },
        CacheTTL.TWO_MINUTES
      );

    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    }
  }, [user, estabelecimentoId, role]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Limpar cache para forçar atualização
    const cacheKey = `dashboard_${estabelecimentoId}_${role || 'all'}`;
    await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
    const cacheKeyEstoque = `baixo_estoque_${estabelecimentoId}`;
    await CacheManager.remove(CacheNamespaces.ESTOQUE, cacheKeyEstoque);
    
    await Promise.all([carregarDados(), carregarProdutosBaixoEstoque()]);
    setRefreshing(false);
  }, [carregarDados, carregarProdutosBaixoEstoque, estabelecimentoId, role]);

  useEffect(() => {
    carregarDados();
    carregarProdutosBaixoEstoque();
  }, [carregarDados, carregarProdutosBaixoEstoque]);

  // Calcular quantos cards serão exibidos para ajustar o layout
  const cardsVisiveis = [
    role !== 'profissional', // Agendamentos
    role !== 'profissional' && permissions.pode_ver_vendas, // Vendas Hoje
    role !== 'profissional', // Clientes Ativos
    role !== 'profissional', // Produtos Baixo Estoque
  ].filter(Boolean).length;

  // Layout responsivo baseado no tamanho da tela
  const screenWidth = Dimensions.get('window').width;
  
  // Debug: verificar largura da tela
  logger.debug('📱 Largura da tela (dp):', screenWidth);
  logger.debug('🎯 Cards visíveis:', cardsVisiveis);
  
  // Determinar largura dos cards baseado no tamanho da tela e quantidade de cards
  // Sistema inteligente: sempre usa 2 colunas em smartphones, ajusta largura para ocupar espaço
  const getCardWidth = () => {
    const padding = 16; // padding lateral do grid
    const gap = 16; // gap entre cards
    const availableWidth = screenWidth - (padding * 2);
    
    // Smartphones (< 600dp): sempre 2 colunas, independente da quantidade
    if (screenWidth < 600) {
      // Calcular largura exata: (largura disponível - gap) / 2
      const cardWidthPx = (availableWidth - gap) / 2;
      logger.debug(`💡 Layout: 2 colunas (${cardWidthPx.toFixed(0)}px) - Smartphone`);
      return cardWidthPx;
    }
    
    // Tablets pequenos (600-900dp): 2-3 colunas
    if (screenWidth < 900) {
      if (cardsVisiveis === 3) {
        // 3 cards: 2 na primeira linha, 1 na segunda (mas mantém tamanho de 2 colunas)
        const cardWidthPx = (availableWidth - gap) / 2;
        logger.debug(`💡 Layout: 2 colunas para 3 cards (${cardWidthPx.toFixed(0)}px) - Tablet pequeno`);
        return cardWidthPx;
      }
      const cardWidthPx = (availableWidth - gap) / 2;
      logger.debug(`💡 Layout: 2 colunas (${cardWidthPx.toFixed(0)}px) - Tablet pequeno`);
      return cardWidthPx;
    }
    
    // Tablets grandes (900-1200dp): 3-4 colunas
    if (screenWidth < 1200) {
      const cols = cardsVisiveis >= 3 ? 3 : 2;
      const cardWidthPx = (availableWidth - (gap * (cols - 1))) / cols;
      logger.debug(`💡 Layout: ${cols} colunas (${cardWidthPx.toFixed(0)}px) - Tablet grande`);
      return cardWidthPx;
    }
    
    // Desktop/TV: 4 colunas
    const cols = Math.min(cardsVisiveis, 4);
    const cardWidthPx = (availableWidth - (gap * (cols - 1))) / cols;
    logger.debug(`💡 Layout: ${cols} colunas (${cardWidthPx.toFixed(0)}px) - Desktop`);
    return cardWidthPx;
  };

  const cardWidth = getCardWidth();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          title="Atualizando..."
          titleColor={colors.textSecondary}
        />
      }
    >
      <View style={styles.grid}>
        {role !== 'profissional' && (
          <TouchableOpacity
            style={[styles.card, styles.cardPrimary, { width: cardWidth, borderLeftColor: colors.primary }]}
            onPress={() => router.push('/agenda')}
          >
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="calendar-check" size={24} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Agendamentos Hoje</Text>
            <Text style={styles.cardValue}>{agendamentosHoje}</Text>
            <Text style={styles.cardSubtitle}>Ver agenda</Text>
          </TouchableOpacity>
        )}

        {role !== 'profissional' && permissions.pode_ver_vendas && (
          <TouchableOpacity
            style={[styles.card, styles.cardSuccess, { width: cardWidth }]}
            onPress={() => {
              logger.debug('Navegando para vendas...');
              router.push('/(app)/vendas');
            }}
          >
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="dollar-sign" size={24} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>Vendas Hoje</Text>
            <Text style={styles.cardValue}>R$ {vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtitle}>Total do dia</Text>
          </TouchableOpacity>
        )}

        {role !== 'profissional' && (
          <TouchableOpacity
            style={[styles.card, styles.cardInfo, { width: cardWidth }]}
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
            style={[styles.card, styles.cardDanger, { width: cardWidth }]}
            onPress={() => router.push('/estoque')}
          >
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="exclamation-triangle" size={24} color={colors.error} />
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
            <Text style={[styles.sectionAction, { color: colors.primary }]}>Ver todos</Text>
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
              {/* Header com foto e horário */}
              <View style={styles.agendamentoHeader}>
                {/* Foto do cliente */}
                <View style={styles.agendamentoFotoContainer}>
                  {agendamento.cliente_foto ? (
                    <Image 
                      source={{ uri: agendamento.cliente_foto }} 
                      style={styles.agendamentoFoto}
                    />
                  ) : (
                    <View style={styles.agendamentoFotoPlaceholder}>
                      <FontAwesome5 name="user" size={20} color={colors.primary} />
                    </View>
                  )}
                </View>

                {/* Informações principais */}
                <View style={styles.agendamentoContent}>
                  <Text style={styles.agendamentoCliente} numberOfLines={1}>
                    {agendamento.cliente_nome}
                  </Text>
                  <Text style={styles.agendamentoServico} numberOfLines={1}>
                    {agendamento.servico}
                  </Text>
                  {agendamento.usuario_nome && (
                    <View style={styles.agendamentoProfissionalContainer}>
                      <FontAwesome5 name="user" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.agendamentoProfissional, { color: colors.primary }]} numberOfLines={1}>
                        {agendamento.usuario_nome}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Footer com horários */}
              <View style={styles.agendamentoFooter}>
                <View style={styles.agendamentoHorarioContainer}>
                  <FontAwesome5 name="clock" size={12} color={colors.primary} />
                  <Text style={[styles.agendamentoHorarioText, { color: colors.primary }]}>
                    {agendamento.horario ? (() => {
                      try {
                        const dataLocal = parseISOStringLocal(agendamento.horario);
                        return format(dataLocal, "HH:mm");
                      } catch {
                        return '--:--';
                      }
                    })() : '--:--'}
                    {agendamento.horario_termino && (
                      <Text style={styles.agendamentoHorarioSeparador}> às </Text>
                    )}
                    {agendamento.horario_termino && (
                      <Text>{agendamento.horario_termino}</Text>
                    )}
                  </Text>
                </View>
                
                <View style={styles.agendamentoData}>
                  <FontAwesome5 name="calendar" size={12} color={colors.textTertiary} />
                  <Text style={styles.agendamentoDia}>
                    {agendamento.horario ? (() => {
                      try {
                        const dataLocal = parseISOStringLocal(agendamento.horario);
                        return format(dataLocal, "dd/MM");
                      } catch {
                        return '--/--';
                      }
                    })() : '--/--'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyAgendamentos}>
            <FontAwesome5 name="calendar-times" size={24} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Nenhum agendamento próximo</Text>
          </View>
        )}
      </View>

      {role !== 'profissional' && permissions.pode_ver_vendas && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vendas Recentes</Text>
            <TouchableOpacity onPress={() => {
              logger.debug('Navegando para vendas via Ver todas...');
              router.push('/(app)/vendas');
            }}>
              <Text style={[styles.sectionAction, { color: colors.primary }]}>Ver todas</Text>
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
              <FontAwesome5 name="receipt" size={24} color={colors.textTertiary} />
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
              <Text style={[styles.sectionAction, { color: colors.primary }]}>Ver estoque</Text>
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
              <FontAwesome5 name="check-circle" size={24} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Nenhum produto com estoque baixo</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}