import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo, useReducer } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button2';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logger } from '../../utils/logger';
import { withTimeoutAll } from '../../utils/withTimeout';
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

// Estado consolidado com useReducer
type DashboardState = {
  agendamentosHoje: number;
  vendasHoje: number;
  clientesAtivos: number;
  proximosAgendamentos: AgendamentoDashboard[];
  vendasRecentes: VendaDashboard[];
  produtosBaixoEstoque: ProdutoDashboard[];
  refreshing: boolean;
  errors: DashboardErrors;
  loadingStates: {
    cards: boolean;
    agendamentos: boolean;
    vendas: boolean;
    estoque: boolean;
  };
  toastMessage: string;
  toastType: 'success' | 'error';
};

// Actions do reducer
type DashboardAction =
  | { type: 'SET_AGENDAMENTOS_HOJE'; payload: number }
  | { type: 'SET_VENDAS_HOJE'; payload: number }
  | { type: 'SET_CLIENTES_ATIVOS'; payload: number }
  | { type: 'SET_PROXIMOS_AGENDAMENTOS'; payload: AgendamentoDashboard[] }
  | { type: 'SET_VENDAS_RECENTES'; payload: VendaDashboard[] }
  | { type: 'SET_PRODUTOS_BAIXO_ESTOQUE'; payload: ProdutoDashboard[] }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { key: keyof DashboardErrors; message?: string } }
  | { type: 'SET_LOADING'; payload: { key: keyof DashboardState['loadingStates']; value: boolean } }
  | { type: 'SHOW_TOAST'; payload: { message: string; type: 'success' | 'error' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'RESET_STATE' };

// Reducer para gerenciar estado
const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_AGENDAMENTOS_HOJE':
      return { ...state, agendamentosHoje: action.payload };
    case 'SET_VENDAS_HOJE':
      return { ...state, vendasHoje: action.payload };
    case 'SET_CLIENTES_ATIVOS':
      return { ...state, clientesAtivos: action.payload };
    case 'SET_PROXIMOS_AGENDAMENTOS':
      return { ...state, proximosAgendamentos: action.payload };
    case 'SET_VENDAS_RECENTES':
      return { ...state, vendasRecentes: action.payload };
    case 'SET_PRODUTOS_BAIXO_ESTOQUE':
      return { ...state, produtosBaixoEstoque: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.message }
      };
    case 'SET_LOADING':
      return {
        ...state,
        loadingStates: { ...state.loadingStates, [action.payload.key]: action.payload.value }
      };
    case 'SHOW_TOAST':
      return {
        ...state,
        toastMessage: action.payload.message,
        toastType: action.payload.type
      };
    case 'HIDE_TOAST':
      return { ...state, toastMessage: '' };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

// Estado inicial
const initialState: DashboardState = {
  agendamentosHoje: 0,
  vendasHoje: 0,
  clientesAtivos: 0,
  proximosAgendamentos: [],
  vendasRecentes: [],
  produtosBaixoEstoque: [],
  refreshing: false,
  errors: {},
  loadingStates: {
    cards: true,
    agendamentos: true,
    vendas: true,
    estoque: true,
  },
  toastMessage: '',
  toastType: 'success',
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
    cardChevron: {
      position: 'absolute' as const,
      bottom: 16,
      right: 16,
      opacity: 0.5,
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

  // Consolidando estado com useReducer
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Função utilitária para sanitizar valores numéricos
  const formatarValor = (valor: number | null | undefined): string => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'R$ 0,00';
    }
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
    setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
    }, 3000);
  }, []);

  // Função de retry com backoff exponencial
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Não tentar novamente em erros específicos (permissão, não encontrado, etc)
        const errMsg = (error as any)?.message || '';
        const errCode = (error as any)?.code || '';
        if (errCode === 'PGRST116' || errMsg.includes('permission') || errMsg.includes('not found')) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Backoff exponencial
          logger.debug(`Tentativa ${attempt + 1}/${maxRetries} falhou, aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }, []);

  const carregarProdutosBaixoEstoque = useCallback(async () => {
    if (!estabelecimentoId) return;
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'estoque', value: true } });
      
      // Tentar cache primeiro
      const cacheKey = `baixo_estoque_${estabelecimentoId}`;
      const cachedData = await CacheManager.get<ProdutoDashboard[]>(
        CacheNamespaces.ESTOQUE,
        cacheKey
      );
      
      if (cachedData) {
        dispatch({ type: 'SET_PRODUTOS_BAIXO_ESTOQUE', payload: cachedData });
        dispatch({ type: 'SET_LOADING', payload: { key: 'estoque', value: false } });
        return;
      }
      
      logger.debug(`Iniciando consulta de produtos com baixo estoque para o estabelecimento: ${estabelecimentoId}`);
      
      // Tenta via RPC com retry
      const fetchProdutos = async () => {
        const { data: produtosRpc, error } = await supabase
          .rpc('get_produtos_baixo_estoque', { p_estabelecimento_id: estabelecimentoId })
          .limit(5);

        if (error) {
          logger.warn('RPC get_produtos_baixo_estoque falhou, aplicando fallback:', error);
          // Fallback: buscar 10 produtos com menor quantidade e filtrar em JS
          const { data: produtosRaw, error: errProdutos } = await supabase
            .from('produtos')
            .select('id, nome, quantidade, quantidade_minima')
            .eq('estabelecimento_id', estabelecimentoId)
            .order('quantidade', { ascending: true, nullsFirst: false })
            .limit(10);

          if (errProdutos) {
            const errorMsg = errProdutos.code === 'PGRST116' 
              ? 'Tabela de produtos não encontrada'
              : errProdutos.message?.includes('permission')
              ? 'Sem permissão para ver produtos'
              : 'Erro ao carregar produtos';
            dispatch({ type: 'SET_ERROR', payload: { key: 'estoque', message: errorMsg } });
            throw errProdutos;
          }

          // Filtrar produtos onde quantidade <= quantidade_minima ou quantidade é null
          return (produtosRaw || []).filter(p => 
            p.quantidade == null || 
            p.quantidade_minima == null || 
            p.quantidade <= p.quantidade_minima
          ).slice(0, 5);
        }

        return produtosRpc || [];
      };

      const produtos = await retryWithBackoff(fetchProdutos);
      
      // Salvar no cache
      await CacheManager.set(
        CacheNamespaces.ESTOQUE,
        cacheKey,
        produtos,
        CacheTTL.TWO_MINUTES
      );
      
      dispatch({ type: 'SET_PRODUTOS_BAIXO_ESTOQUE', payload: produtos });
      dispatch({ type: 'SET_ERROR', payload: { key: 'estoque', message: undefined } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'estoque', value: false } });
    } catch (error) {
      logger.error('Erro inesperado ao carregar produtos baixo estoque:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'estoque', message: 'Erro ao carregar produtos' } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'estoque', value: false } });
    }
  }, [estabelecimentoId, retryWithBackoff]);

  const carregarDados = useCallback(async () => {
    if (!user || !estabelecimentoId) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'cards', value: true } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'agendamentos', value: true } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'vendas', value: true } });
      
      // Tentar cache primeiro
      const cacheKey = `dashboard_${estabelecimentoId}_${role || 'all'}`;
      const cachedData = await CacheManager.get<any>(
        CacheNamespaces.RELATORIOS,
        cacheKey
      );
      
      if (cachedData) {
        dispatch({ type: 'SET_AGENDAMENTOS_HOJE', payload: cachedData.agendamentosHoje });
        dispatch({ type: 'SET_VENDAS_HOJE', payload: cachedData.vendasHoje });
        dispatch({ type: 'SET_CLIENTES_ATIVOS', payload: cachedData.clientesAtivos });
        dispatch({ type: 'SET_PROXIMOS_AGENDAMENTOS', payload: cachedData.proximosAgendamentos });
        dispatch({ type: 'SET_VENDAS_RECENTES', payload: cachedData.vendasRecentes });
        dispatch({ type: 'SET_LOADING', payload: { key: 'cards', value: false } });
        dispatch({ type: 'SET_LOADING', payload: { key: 'agendamentos', value: false } });
        dispatch({ type: 'SET_LOADING', payload: { key: 'vendas', value: false } });
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
      ] = await withTimeoutAll([
        // Carregar agendamentos de hoje
        supabase.from('agendamentos').select('*', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId).gte('data_hora', inicioHoje).lte('data_hora', fimHoje),
        // Carregar vendas de hoje - OTIMIZADO: busca direto da tabela comandas
        supabase.from('comandas').select('valor_total').eq('estabelecimento_id', estabelecimentoId).eq('status', 'fechada').gte('finalized_at', inicioHoje).lte('finalized_at', fimHoje),
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
      ], 15000, 'Timeout ao carregar dados');

      // Processar agendamentos
      if (agendamentosError) {
        logger.error('Erro agendamentos:', agendamentosError);
        dispatch({ type: 'SET_ERROR', payload: { key: 'cards', message: 'Erro ao carregar agendamentos de hoje' } });
      } else {
        dispatch({ type: 'SET_AGENDAMENTOS_HOJE', payload: agendamentos?.length || 0 });
        dispatch({ type: 'SET_ERROR', payload: { key: 'cards', message: undefined } });
      }

      // Processar vendas
      if (vendasError) {
        logger.error('Erro vendas hoje:', vendasError);
        const errorMsg = vendasError.code === 'PGRST116'
          ? 'Tabela de vendas não encontrada'
          : vendasError.message?.includes('permission')
          ? 'Sem permissão para ver vendas'
          : vendasError.message?.includes('timeout')
          ? 'Tempo esgotado ao carregar vendas'
          : 'Erro ao carregar vendas';
        dispatch({ type: 'SET_ERROR', payload: { key: 'vendas', message: errorMsg } });
      } else {
        logger.debug('Vendas hoje dados:', vendasHojeData);
        const totalVendas = vendasHojeData?.reduce((total, v) => total + (v.valor_total || 0), 0) || 0;
        dispatch({ type: 'SET_VENDAS_HOJE', payload: totalVendas });
        dispatch({ type: 'SET_ERROR', payload: { key: 'vendas', message: undefined } });
      }

      // Processar clientes
      if (clientesError) {
        logger.error('Erro clientes:', clientesError);
      } else {
        dispatch({ type: 'SET_CLIENTES_ATIVOS', payload: clientesCount || 0 });
      }

      // Processar próximos agendamentos com dados já incluídos no JOIN
      if (proxError) {
        logger.error('Erro próximos agendamentos:', proxError);
        dispatch({ type: 'SET_ERROR', payload: { key: 'agendamentos', message: 'Erro ao carregar próximos agendamentos' } });
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
        
        dispatch({ type: 'SET_PROXIMOS_AGENDAMENTOS', payload: agendamentosFormatados });
        dispatch({ type: 'SET_ERROR', payload: { key: 'agendamentos', message: undefined } });
      }
      
      const vendasRecentesFormatadas = vendasRecentesData?.map((v: any) => ({ 
        id: v.id, 
        cliente_nome: v.cliente_nome || 'Cliente não informado', 
        valor: v.valor_total || 0, 
        data: v.finalized_at 
      })) || [];
      
      if (vendasRecentesError) {
        logger.error('Erro vendas recentes:', vendasRecentesError);
      } else if (vendasRecentesData) {
        logger.debug('Vendas recentes dados:', vendasRecentesData);
        dispatch({ type: 'SET_VENDAS_RECENTES', payload: vendasRecentesFormatadas });
      }
      
      // Salvar no cache (reutiliza cacheKey já declarado acima)
      await CacheManager.set(
        CacheNamespaces.RELATORIOS,
        cacheKey,
        {
          agendamentosHoje: agendamentos?.length || 0,
          vendasHoje: vendasHojeData?.reduce((total, v) => total + (v.valor_total || 0), 0) || 0,
          clientesAtivos: clientesCount || 0,
          proximosAgendamentos: proxAgendamentos?.map((ag: any) => ({
            id: ag.id,
            cliente_nome: ag.cliente || 'Cliente não informado',
            cliente_foto: ag.cliente_info?.foto_url || null,
            servico: ag.servicos?.[0]?.nome || ag.servicos?.[0]?.servico?.nome || 'Serviço não especificado',
            horario: ag.data_hora,
            horario_termino: ag.horario_termino,
            usuario_nome: ag.usuario?.nome_completo || 'Não atribuído',
            status: ag.status
          })) || [],
          vendasRecentes: vendasRecentesFormatadas
        },
        CacheTTL.TWO_MINUTES
      );

      dispatch({ type: 'SET_LOADING', payload: { key: 'cards', value: false } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'agendamentos', value: false } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'vendas', value: false } });

    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
      
      // Tratamento específico para timeout
      if (error instanceof Error && error.message === 'Timeout ao carregar dados') {
        dispatch({ type: 'SET_ERROR', payload: { key: 'cards', message: 'Conexão lenta. Tente novamente.' } });
        showToast('Tempo de conexão esgotado', 'error');
      } else {
        dispatch({ type: 'SET_ERROR', payload: { key: 'cards', message: 'Erro ao carregar dados do dashboard' } });
      }
      
      dispatch({ type: 'SET_LOADING', payload: { key: 'cards', value: false } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'agendamentos', value: false } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'vendas', value: false } });
    }
  }, [user, estabelecimentoId, role, showToast]);

  const onRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    
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
    
    try {
      await Promise.all([carregarDados(), carregarProdutosBaixoEstoque()]);
      
      // Haptic feedback de sucesso e toast
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Dados atualizados com sucesso', 'success');
      } catch (error) {
        logger.warn('Falha ao executar haptic de sucesso:', error);
      }
    } catch (error) {
      logger.error('Erro ao atualizar dados:', error);
      showToast('Erro ao atualizar dados', 'error');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (hapticError) {
        logger.warn('Falha ao executar haptic de erro:', hapticError);
      }
    }
    
    dispatch({ type: 'SET_REFRESHING', payload: false });
  }, [carregarDados, carregarProdutosBaixoEstoque, estabelecimentoId, role]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
      carregarProdutosBaixoEstoque();
    }, [carregarDados, carregarProdutosBaixoEstoque])
  );

  // Calcular quantos cards serão exibidos para ajustar o layout
  const cardsVisiveis = [
    role !== 'profissional', // Agendamentos
    role !== 'profissional' && permissions.pode_ver_vendas, // Vendas Hoje
    role !== 'profissional', // Clientes Ativos
    role !== 'profissional', // Produtos Baixo Estoque
  ].filter(Boolean).length;

  // Layout responsivo baseado no tamanho da tela
  const screenWidth = Dimensions.get('window').width;
  
  // Calcular largura dos cards de forma responsiva e otimizada
  const cardWidth = useMemo(() => {
    const padding = 16;
    const gap = 16;
    const availableWidth = screenWidth - (padding * 2);
    
    // Determinar número de colunas baseado no tamanho da tela
    let cols = 2; // Default: smartphones e tablets pequenos
    if (screenWidth >= 1200) {
      cols = Math.min(cardsVisiveis, 4); // Desktop: até 4 colunas
    } else if (screenWidth >= 900) {
      cols = cardsVisiveis >= 3 ? 3 : 2; // Tablet grande: 2-3 colunas
    }
    
    const cardWidthPx = (availableWidth - (gap * (cols - 1))) / cols;
    logger.debug(`📱 Layout: ${cols} cols, ${cardWidthPx.toFixed(0)}px, screen ${screenWidth}dp`);
    
    return cardWidthPx;
  }, [screenWidth, cardsVisiveis]);
  
  // Funções utilitárias de formatação (evita duplicação)
  const formatarHorario = useCallback((data: string) => {
    try {
      const dataLocal = parseISOStringLocal(data);
      return format(dataLocal, "HH:mm");
    } catch {
      return '--:--';
    }
  }, []);
  
  const formatarDataCurta = useCallback((data: string) => {
    try {
      const dataLocal = parseISOStringLocal(data);
      return format(dataLocal, "dd/MM");
    } catch {
      return '--/--';
    }
  }, []);

  const formatarDataCompleta = useCallback((data: string) => {
    try {
      const dataLocal = parseISOStringLocal(data);
      return format(dataLocal, "dd/MM/yyyy HH:mm");
    } catch {
      return 'Data indisponível';
    }
  }, []);

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
      {state.toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.toastContainer, state.toastType === 'error' && styles.toastError]}
        >
          <FontAwesome5
            name={state.toastType === 'success' ? 'check-circle' : 'exclamation-circle'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.toastText}>{state.toastMessage}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.container}
        accessibilityLabel="Tela de visão geral do dashboard"
        accessibilityRole="scrollbar"
        refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          title="Atualizando..."
          titleColor={colors.textSecondary}
          accessibilityLabel={state.refreshing ? "Atualizando dados do dashboard" : "Arraste para atualizar"}
        />
      }
    >
      <View style={styles.grid}>
        {/* Card Agendamentos Hoje */}
        {role !== 'profissional' && (
          state.loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardPrimary, { width: cardWidth, borderLeftColor: colors.primary }]}
              onPress={() => router.push('/agenda')}
              accessibilityRole="button"
              accessibilityLabel={`${state.agendamentosHoje} agendamentos hoje`}
              accessibilityHint="Toque duas vezes para ver a agenda completa"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="calendar-check" size={24} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Agendamentos Hoje</Text>
              <Text style={styles.cardValue}>{state.agendamentosHoje}</Text>
              <View style={styles.cardChevron}>
                <FontAwesome5 name="chevron-right" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )
        )}

        {/* Card Vendas Hoje */}
        {role !== 'profissional' && permissions.pode_ver_vendas && (
          state.loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardSuccess, { width: cardWidth }]}
              onPress={() => {
                logger.debug('Navegando para vendas...');
                router.push('/(app)/vendas');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Vendas hoje: ${state.vendasHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              accessibilityHint="Toque duas vezes para ver todas as vendas"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="dollar-sign" size={24} color={colors.success} />
              </View>
              <Text style={styles.cardTitle}>Vendas Hoje</Text>
              <Text style={styles.cardValue}>{formatarValor(state.vendasHoje)}</Text>
              <View style={styles.cardChevron}>
                <FontAwesome5 name="chevron-right" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )
        )}

        {/* Card Clientes Ativos */}
        {role !== 'profissional' && (
          state.loadingStates.cards ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardInfo, { width: cardWidth }]}
              onPress={() => router.push('/clientes')}
              accessibilityRole="button"
              accessibilityLabel={`${state.clientesAtivos} clientes ativos`}
              accessibilityHint="Toque duas vezes para ver a lista de clientes"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="users" size={24} color={colors.info} />
              </View>
              <Text style={styles.cardTitle}>Clientes Ativos</Text>
              <Text style={styles.cardValue}>{state.clientesAtivos}</Text>
              <View style={styles.cardChevron}>
                <FontAwesome5 name="chevron-right" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )
        )}

        {/* Card Produtos Baixo Estoque */}
        {role !== 'profissional' && (
          state.loadingStates.estoque ? (
            <SkeletonCard />
          ) : (
            <TouchableOpacity
              style={[styles.card, styles.cardDanger, { width: cardWidth }]}
              onPress={() => router.push('/estoque')}
              accessibilityRole="button"
              accessibilityLabel={`${state.produtosBaixoEstoque?.length || 0} produtos com baixo estoque`}
              accessibilityHint="Toque duas vezes para ver o estoque completo"
            >
              <View style={styles.cardIconContainer}>
                <FontAwesome5 name="exclamation-triangle" size={24} color={colors.error} />
              </View>
              <Text style={styles.cardTitle}>Produtos Baixo Estoque</Text>
              <Text style={styles.cardValue}>{state.produtosBaixoEstoque?.length || 0}</Text>
              <View style={styles.cardChevron}>
                <FontAwesome5 name="chevron-right" size={16} color={colors.textSecondary} />
              </View>
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
        {state.loadingStates.agendamentos ? (
          <View style={styles.emptyAgendamentos}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyText}>Carregando agendamentos...</Text>
          </View>
        ) : /* Error State */
        state.errors.agendamentos ? (
          <View style={styles.errorState} accessibilityRole="alert">
            <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
            <Text style={styles.errorText}>{state.errors.agendamentos}</Text>
            <Button
              variant="primary"
              size="medium"
              onPress={async () => {
                dispatch({ type: 'SET_ERROR', payload: { key: 'agendamentos', message: undefined } });
                await carregarDados();
              }}
            >
              Tentar novamente
            </Button>
          </View>
        ) : /* Content */
        state.proximosAgendamentos.length > 0 ? (
          state.proximosAgendamentos.map((agendamento, index) => (
            <Animated.View
              key={agendamento.id}
              entering={FadeInDown.delay(index * 100).duration(400).springify()}
              style={[
                styles.agendamentoItem,
                index === 0 && styles.primeiroAgendamento,
                index === state.proximosAgendamentos.length - 1 && styles.ultimoAgendamento
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
                    {agendamento.horario ? formatarHorario(agendamento.horario) : '--:--'}
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
                    {agendamento.horario ? formatarDataCurta(agendamento.horario) : '--/--'}
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
          {state.loadingStates.vendas ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Carregando vendas...</Text>
            </View>
          ) : /* Error State */
          state.errors.vendas ? (
            <View style={styles.errorState} accessibilityRole="alert">
              <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
              <Text style={styles.errorText}>{state.errors.vendas}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                  dispatch({ type: 'SET_ERROR', payload: { key: 'vendas', message: undefined } });
                  await carregarDados();
                }}
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar vendas novamente"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : /* Content */
          state.vendasRecentes.length > 0 ? (
            state.vendasRecentes.map((venda, index) => (
              <Animated.View
                key={venda.id}
                entering={FadeInDown.delay(index * 80).duration(400).springify()}
                style={styles.vendaItem}
              >
                <View style={styles.vendaContent}>
                  <Text style={styles.vendaCliente}>{venda.cliente_nome}</Text>
                  <Text style={styles.vendaData}>
                    {venda.data ? formatarDataCompleta(venda.data) : 'Data indisponível'}
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
          {state.loadingStates.estoque ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Carregando produtos...</Text>
            </View>
          ) : /* Error State */
          state.errors.estoque ? (
            <View style={styles.errorState} accessibilityRole="alert">
              <FontAwesome5 name="exclamation-circle" size={32} color={colors.error} />
              <Text style={styles.errorText}>{state.errors.estoque}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                  dispatch({ type: 'SET_ERROR', payload: { key: 'estoque', message: undefined } });
                  await carregarProdutosBaixoEstoque();
                }}
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar produtos novamente"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : /* Content */
          state.produtosBaixoEstoque && state.produtosBaixoEstoque.length > 0 ? (
            state.produtosBaixoEstoque.map((produto, index) => (
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
