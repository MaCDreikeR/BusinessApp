import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button2';
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
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

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

type DashboardErrors = {
  cards?: string;
  agendamentos?: string;
  vendas?: string;
  estoque?: string;
};

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
    cardSuccess: { borderLeftWidth: 4, borderLeftColor: colors.success },
    cardInfo: { borderLeftWidth: 4, borderLeftColor: colors.info },
    cardDanger: { borderLeftWidth: 4, borderLeftColor: colors.error },
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
      color: colors.success,
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
      backgroundColor: colors.primaryBackground,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    agendamentoIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryBackground,
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
      color: colors.error,
      fontWeight: 'bold' as const,
    },
    produtoBaixo: {
      color: colors.warning,
      fontWeight: 'bold' as const,
    },
    // Toast
    toastContainer: {
      position: 'absolute' as const,
      top: 16,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(124, 58, 237, 0.95)', // Primary com opacidade
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    toastError: {
      backgroundColor: colors.error,
    },
    toastText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '500' as const,
      marginLeft: 12,
      flex: 1,
    },
    // Error State
    errorState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 16,
      textAlign: 'center' as const,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    // Skeleton
    skeletonCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      minHeight: 160,
      justifyContent: 'space-between' as const,
    },
    skeletonCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    skeletonLine: {
      height: 14,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 8,
    },
    skeletonLineWide: {
      height: 28,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 4,
      width: '60%' as const,
    },
  }), [colors]);

  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<AgendamentoDashboard[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<VendaDashboard[]>([]);
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<ProdutoDashboard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<DashboardErrors>({});
  const [loadingStates, setLoadingStates] = useState({
    cards: true,
    agendamentos: true,
    vendas: true,
    estoque: true,
  });
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Função utilitária para sanitizar valores numéricos
  const formatarValor = (valor: number | null | undefined): string => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'R$ 0,00';
    }
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const carregarProdutosBaixoEstoque = useCallback(async () => {
    if (!estabelecimentoId) return;
    try {
      setLoadingStates(prev => ({ ...prev, estoque: true }));
      
      // Tentar cache primeiro
      const cacheKey = `baixo_estoque_${estabelecimentoId}`;
      const cachedData = await CacheManager.get<ProdutoDashboard[]>(
        CacheNamespaces.ESTOQUE,
        cacheKey
      );
      
      if (cachedData) {
        setProdutosBaixoEstoque(cachedData);
        setLoadingStates(prev => ({ ...prev, estoque: false }));
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

        if (errProdutos) {
          setErrors(prev => ({ ...prev, estoque: 'Erro ao carregar produtos' }));
          throw errProdutos;
        }

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
        setErrors(prev => ({ ...prev, estoque: undefined }));
        setLoadingStates(prev => ({ ...prev, estoque: false }));
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
      setErrors(prev => ({ ...prev, estoque: undefined }));
      setLoadingStates(prev => ({ ...prev, estoque: false }));
    } catch (error) {
      logger.error('Erro inesperado ao carregar produtos baixo estoque:', error);
      setErrors(prev => ({ ...prev, estoque: 'Erro ao carregar produtos' }));
      setLoadingStates(prev => ({ ...prev, estoque: false }));
    }
  }, [estabelecimentoId]);

  const carregarDados = useCallback(async () => {
    if (!user || !estabelecimentoId) return;
    
    // Timeout promise para evitar queries infinitas
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao carregar dados')), 15000)
    );
    
    try {
      setLoadingStates(prev => ({ ...prev, cards: true, agendamentos: true, vendas: true }));
      
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
        setLoadingStates({ cards: false, agendamentos: false, vendas: false, estoque: false });
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
      ] = await Promise.race([
        Promise.all([
          // Carregar agendamentos de hoje
          supabase.from('agendamentos').select('*', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId).gte('data_hora', inicioHoje).lte('data_hora', fimHoje),
          // Carregar vendas de hoje - SOMENTE COMANDAS FECHADAS HOJE
          supabase.from('comandas_itens').select(`preco_total, comandas!inner(status, estabelecimento_id, finalized_at)`).eq('comandas.estabelecimento_id', estabelecimentoId).eq('comandas.status', 'fechada').gte('comandas.finalized_at', inicioHoje).lte('comandas.finalized_at', fimHoje),
          // Carregar clientes ativos
          supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('estabelecimento_id', estabelecimentoId),
        // Carregar próximos agendamentos com JOIN - elimina N+1
        (() => {
          let query = supabase.from('agendamentos')
            .select(`
              id,
              cliente,
              cliente_id,
              data_hora,
              horario_termino,
              servicos,
              status,
              usuario:usuarios(nome_completo),
              cliente_info:clientes!cliente_id(foto_url)
            `)
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
        ]),
        timeoutPromise
      ]);

      // Processar agendamentos
      if (agendamentosError) {
        logger.error('Erro agendamentos:', agendamentosError);
        setErrors(prev => ({ ...prev, cards: 'Erro ao carregar agendamentos de hoje' }));
      } else {
        setAgendamentosHoje(agendamentos?.length || 0);
        setErrors(prev => ({ ...prev, cards: undefined }));
      }

      // Processar vendas
      if (vendasError) {
        logger.error('Erro vendas hoje:', vendasError);
        setErrors(prev => ({ ...prev, vendas: 'Erro ao carregar vendas' }));
      } else {
        logger.debug('Vendas hoje dados:', vendasHojeData);
        const totalVendas = vendasHojeData?.reduce((total, v) => total + (v.preco_total || 0), 0) || 0;
        setVendasHoje(totalVendas);
        setErrors(prev => ({ ...prev, vendas: undefined }));
      }

      // Processar clientes
      if (clientesError) {
        logger.error('Erro clientes:', clientesError);
      } else {
        setClientesAtivos(clientesCount || 0);
      }

      // Processar próximos agendamentos com dados já incluídos no JOIN
      if (proxError) {
        logger.error('Erro próximos agendamentos:', proxError);
        setErrors(prev => ({ ...prev, agendamentos: 'Erro ao carregar próximos agendamentos' }));
      } else if (proxAgendamentos) {
        logger.debug('Próximos agendamentos carregados:', proxAgendamentos);
        
        // Mapear dados do JOIN - sem queries adicionais!
        const agendamentosFormatados = proxAgendamentos.map((ag: any) => ({
          id: ag.id,
          cliente_nome: ag.cliente || 'Cliente não informado',
          cliente_foto: ag.cliente_info?.foto_url || null,
          servico: ag.servicos?.[0]?.nome || ag.servicos?.[0]?.servico?.nome || 'Serviço não especificado',
          horario: ag.data_hora,
          horario_termino: ag.horario_termino,
          usuario_nome: ag.usuario?.nome_completo || 'Não atribuído',
          status: ag.status
        }));
        
        setProximosAgendamentos(agendamentosFormatados);
        setErrors(prev => ({ ...prev, agendamentos: undefined }));
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

      setLoadingStates({ cards: false, agendamentos: false, vendas: false, estoque: false });

    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
      
      // Tratamento específico para timeout
      if (error instanceof Error && error.message === 'Timeout ao carregar dados') {
        setErrors(prev => ({ ...prev, cards: 'Conexão lenta. Tente novamente.' }));
        showToast('Tempo de conexão esgotado', 'error');
      } else {
        setErrors(prev => ({ ...prev, cards: 'Erro ao carregar dados do dashboard' }));
      }
      
      setLoadingStates({ cards: false, agendamentos: false, vendas: false, estoque: false });
    }
  }, [user, estabelecimentoId, role]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Haptic feedback no início
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      logger.warn('Falha ao executar haptic inicial:', error);
    }
    
    // Limpar cache para forçar atualização
    const cacheKey = `dashboard_${estabelecimentoId}_${role || 'all'}`;
    await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
    const cacheKeyEstoque = `baixo_estoque_${estabelecimentoId}`;
    await CacheManager.remove(CacheNamespaces.ESTOQUE, cacheKeyEstoque);
    
    await Promise.all([carregarDados(), carregarProdutosBaixoEstoque()]);
    
    // Haptic feedback de sucesso e toast
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Dados atualizados com sucesso', 'success');
    } catch (error) {
      logger.warn('Falha ao executar haptic de sucesso:', error);
    }
    
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

  // Componente Skeleton Card
  const SkeletonCard = () => (
    <View style={[styles.skeletonCard, { width: cardWidth }]}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineWide} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  );

  return (
    <>
      {/* Toast */}
      {toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.toastContainer, toastType === 'error' && styles.toastError]}
        >
          <FontAwesome5
            name={toastType === 'success' ? 'check-circle' : 'exclamation-circle'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.container}
        accessibilityLabel="Tela de visão geral do dashboard"
        accessibilityRole="scrollbar"
        refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          title="Atualizando..."
          titleColor={colors.textSecondary}
          accessibilityLabel={refreshing ? "Atualizando dados do dashboard" : "Arraste para atualizar"}
        />
      }
    >
      <View style={styles.grid}>
        {/* Card Agendamentos Hoje */}
        {role !== 'profissional' && (
          loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardPrimary, { width: cardWidth, borderLeftColor: colors.primary }]}
              onPress={() => router.push('/agenda')}
              accessibilityRole="button"
              accessibilityLabel={`${agendamentosHoje} agendamentos hoje`}
              accessibilityHint="Toque duas vezes para ver a agenda completa"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="calendar-check" size={24} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Agendamentos Hoje</Text>
              <Text style={styles.cardValue}>{agendamentosHoje}</Text>
              <Text style={styles.cardSubtitle}>Ver agenda</Text>
            </TouchableOpacity>
          )
        )}

        {/* Card Vendas Hoje */}
        {role !== 'profissional' && permissions.pode_ver_vendas && (
          loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardSuccess, { width: cardWidth }]}
              onPress={() => {
                logger.debug('Navegando para vendas...');
                router.push('/(app)/vendas');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Vendas hoje: ${vendasHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              accessibilityHint="Toque duas vezes para ver todas as vendas"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="dollar-sign" size={24} color={colors.success} />
              </View>
              <Text style={styles.cardTitle}>Vendas Hoje</Text>
              <Text style={styles.cardValue}>{formatarValor(vendasHoje)}</Text>
              <Text style={styles.cardSubtitle}>Total do dia</Text>
            </TouchableOpacity>
          )
        )}

        {/* Card Clientes Ativos */}
        {role !== 'profissional' && (
          loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardInfo, { width: cardWidth }]}
              onPress={() => router.push('/clientes')}
              accessibilityRole="button"
              accessibilityLabel={`${clientesAtivos} clientes ativos`}
              accessibilityHint="Toque duas vezes para ver a lista de clientes"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="users" size={24} color={colors.info} />
              </View>
              <Text style={styles.cardTitle}>Clientes Ativos</Text>
              <Text style={styles.cardValue}>{clientesAtivos}</Text>
              <Text style={styles.cardSubtitle}>Ver clientes</Text>
            </TouchableOpacity>
          )
        )}

        {/* Card Produtos Baixo Estoque */}
        {role !== 'profissional' && (
          loadingStates.estoque ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardDanger, { width: cardWidth }]}
              onPress={() => router.push('/estoque')}
              accessibilityRole="button"
              accessibilityLabel={`${produtosBaixoEstoque?.length || 0} produtos com baixo estoque`}
              accessibilityHint="Toque duas vezes para ver o estoque completo"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="exclamation-triangle" size={24} color={colors.error} />
              </View>
              <Text style={styles.cardTitle}>Produtos Baixo Estoque</Text>
              <Text style={styles.cardValue}>{produtosBaixoEstoque?.length || 0}</Text>
              <Text style={styles.cardSubtitle}>Ver estoque</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Agendamentos</Text>
          <TouchableOpacity onPress={() => router.push('/agenda')}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loadingStates.agendamentos ? (
          <View style={styles.emptyAgendamentos}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyText}>Carregando agendamentos...</Text>
          </View>
        ) : /* Error State */
        errors.agendamentos ? (
          <View style={styles.errorState} accessibilityRole="alert">
            <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
            <Text style={styles.errorText}>{errors.agendamentos}</Text>
            <Button
              variant="primary"
              size="medium"
              onPress={async () => {
                setErrors(prev => ({ ...prev, agendamentos: undefined }));
                await carregarDados();
              }}
            >
              Tentar novamente
            </Button>
          </View>
        ) : /* Content */
        proximosAgendamentos.length > 0 ? (
          proximosAgendamentos.map((agendamento, index) => (
            <Animated.View
              key={agendamento.id}
              entering={FadeInDown.delay(index * 100).duration(400).springify()}
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
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyAgendamentos} accessibilityLabel="Nenhum agendamento próximo">
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

          {/* Loading State */}
          {loadingStates.vendas ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Carregando vendas...</Text>
            </View>
          ) : /* Error State */
          errors.vendas ? (
            <View style={styles.errorState} accessibilityRole="alert">
              <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
              <Text style={styles.errorText}>{errors.vendas}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                  setErrors(prev => ({ ...prev, vendas: undefined }));
                  await carregarDados();
                }}
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar vendas novamente"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : /* Content */
          vendasRecentes.length > 0 ? (
            vendasRecentes.map((venda, index) => (
              <Animated.View
                key={venda.id}
                entering={FadeInDown.delay(index * 80).duration(400).springify()}
                style={styles.vendaItem}
              >
                <View style={styles.vendaContent}>
                  <Text style={styles.vendaCliente}>{venda.cliente_nome}</Text>
                  <Text style={styles.vendaData}>
                    {venda.data ? new Date(venda.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data indisponível'}
                  </Text>
                </View>
                <Text style={styles.vendaValor}>
                  R$ {venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState} accessibilityLabel="Nenhuma venda recente">
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

          {/* Loading State */}
          {loadingStates.estoque ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Carregando produtos...</Text>
            </View>
          ) : /* Error State */
          errors.estoque ? (
            <View style={styles.errorState} accessibilityRole="alert">
              <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
              <Text style={styles.errorText}>{errors.estoque}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                  setErrors(prev => ({ ...prev, estoque: undefined }));
                  await carregarProdutosBaixoEstoque();
                }}
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar produtos novamente"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : /* Content */
          produtosBaixoEstoque && produtosBaixoEstoque.length > 0 ? (
            produtosBaixoEstoque.map((produto, index) => (
              <Animated.View
                key={produto.id}
                entering={FadeInDown.delay(index * 80).duration(400).springify()}
                style={styles.produtoItem}
              >
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
                    color={produto.quantidade === 0 ? colors.error : colors.warning}
                  />
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState} accessibilityLabel="Nenhum produto com estoque baixo">
              <FontAwesome5 name="check-circle" size={24} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Nenhum produto com estoque baixo</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
    </>
  );
}
