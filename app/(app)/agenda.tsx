import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, DeviceEventEmitter, Modal, TextInput, ActivityIndicator, FlatList, SectionList, Alert, Pressable } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import { enviarMensagemWhatsapp, AgendamentoMensagem } from '../../services/whatsapp';
import { logger } from '../../utils/logger';
import { Usuario, Agendamento as AgendamentoBase } from '@types';
import { theme } from '@utils/theme';
import { CacheManager, CacheNamespaces, CacheTTL } from '../../utils/cacheManager';
import { offlineInsert, offlineUpdate, offlineDelete, getOfflineFeedback } from '../../services/offlineSupabase';
import { getStartOfDayLocal, getEndOfDayLocal, getStartOfMonthLocal, getEndOfMonthLocal, parseDataHoraLocal, converterHoraParaMinutos, converterMinutosParaHora } from '../../lib/timezone';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { getInitials, getAvatarColor, isToday } from '../../utils/avatarHelpers';
import { SkeletonAgendamento } from '../../components/SkeletonLoader';
import { ModalGerenciarBloqueios } from '../../components/ModalGerenciarBloqueios';

// Configuração do idioma para o calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

// Estender o tipo Usuario para incluir campos específicos da agenda
type UsuarioAgenda = Pick<Usuario, 'id' | 'nome_completo' | 'email' | 'foto_url'> & {
  faz_atendimento: boolean | null;
  avatar_url?: string | null;
};

// Estender o tipo Agendamento para incluir campos específicos da tela
type AgendamentoAgenda = Omit<AgendamentoBase, 'horario' | 'status'> & {
  data_hora: string;
  horario_termino?: string;
  cliente: string;
  cliente_id?: string | null;
  cliente_telefone?: string | null;
  cliente_saldo?: number | null;
  cliente_foto?: string | null;
  servicos: any[];
  estabelecimento_id: string;
  status?: 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'agendado' | 'em_atendimento' | 'falta';
  criar_comanda_automatica?: boolean;
  coluna?: number;
  comanda_id?: string | null;
};

export default function AgendaScreen() {
  const { session, estabelecimentoId, role, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioAgenda[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoAgenda[]>([]);
  const [agendamentosMes, setAgendamentosMes] = useState<AgendamentoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPresencaModal, setShowPresencaModal] = useState(false);
  const [presencaUsuarios, setPresencaUsuarios] = useState<Record<string, boolean>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});
  
  // Estado para modal de bloqueio
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  const [diasSemanaBloqueados, setDiasSemanaBloqueados] = useState<number[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  
  // Estado para mensagem de sucesso
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modo de exibição: 'grid' (grade) ou 'list' (lista seccionada)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Novos estados para configuração de horários
  const [showHorariosModal, setShowHorariosModal] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioIntervaloInicio, setHorarioIntervaloInicio] = useState('');
  const [horarioIntervaloFim, setHorarioIntervaloFim] = useState('');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [intervaloAgendamentos, setIntervaloAgendamentos] = useState('30'); // em minutos
  const [limiteSimultaneos, setLimiteSimultaneos] = useState('1');
  const [temIntervalo, setTemIntervalo] = useState(false);
  
  // Adicionar estado para os horários
  const [horarios, setHorarios] = useState<string[]>([]);
  
  // Novos estados para o modal de detalhes de agendamentos
  const [showAgendamentosModal, setShowAgendamentosModal] = useState(false);
  const [agendamentosDoHorarioSelecionado, setAgendamentosDoHorarioSelecionado] = useState<AgendamentoAgenda[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState('');

  // Estado para controlar a confirmação de exclusão
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<string | null>(null);

  const router = useRouter();

  // Subscription do Supabase com reconnect automático
  useRealtimeSubscription(
    'public:usuarios',
    'usuarios',
    () => {
      logger.debug('Mudança detectada na tabela usuarios, recarregando...');
      carregarUsuarios();
    },
    {
      event: '*',
      schema: 'public',
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
    },
    !!estabelecimentoId
  );

  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      carregarUsuarios();
      carregarAgendamentos(true);
      carregarAgendamentosMes(true);
      
      const subscriptionPresenca = DeviceEventEmitter.addListener('togglePresencaUsuarios', () => {
        setShowPresencaModal(true);
      });
      
      const subscriptionBloqueio = DeviceEventEmitter.addListener('toggleBloqueioModal', () => {
        setShowBloqueioModal(true);
      });

      const subscriptionHorarios = DeviceEventEmitter.addListener('toggleHorariosModal', () => {
        setShowHorariosModal(true);
      });

      const subscriptionUsuario = DeviceEventEmitter.addListener('usuarioAtualizado', () => {
        logger.debug('Usuário atualizado, recarregando lista...');
        carregarUsuarios();
      });

      return () => {
        subscriptionPresenca.remove();
        subscriptionBloqueio.remove();
        subscriptionHorarios.remove();
        subscriptionUsuario.remove();
      };
    }, [estabelecimentoId, selectedDate, selectedUser, role, user?.id])
  );

  useEffect(() => {
    // Inicializa o estado de presença para todos os usuários
    if (usuarios.length > 0) {
      const presencaInicial = usuarios.reduce((acc, usuario) => {
        acc[usuario.id] = true; // Por padrão, todos estão presentes
        return acc;
      }, {} as Record<string, boolean>);
      setPresencaUsuarios(presencaInicial);
    }
  }, [usuarios]);

  // Carregar agendamentos do mês quando estabelecimentoId estiver disponível
  useEffect(() => {
    if (estabelecimentoId) {
      carregarAgendamentosMes();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    const marked: {[key: string]: any} = {};
    
    // Filtrar agendamentos válidos antes de processar
    const agendamentosValidos = agendamentosMes.filter(ag => {
      if (!ag || !ag.data_hora) {
        logger.warn('Agendamento sem data_hora ignorado:', ag?.id);
        return false;
      }
      return true;
    });
    
    logger.debug('[CALENDÁRIO] Atualizando marcações:', {
      totalAgendamentosMes: agendamentosValidos.length,
      datasComAgendamento: agendamentosValidos.map(ag => {
        try {
          return format(parseDataHoraLocal(ag.data_hora), 'dd/MM/yyyy');
        } catch (e) {
          logger.error('Erro ao formatar data:', ag.id, ag.data_hora, e);
          return 'data_invalida';
        }
      })
    });
    
    // Marcar a data selecionada
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    marked[selectedDateStr] = { selected: true, selectedColor: colors.primary };
    
    // Marcar datas com agendamentos
    agendamentosValidos.forEach(ag => {
      try {
        const dataAg = parseDataHoraLocal(ag.data_hora);
        const dataStr = format(dataAg, 'yyyy-MM-dd');
      
        logger.debug('Marcando data:', dataStr);
        
        if (dataStr === selectedDateStr) {
          marked[dataStr] = { 
            ...marked[dataStr],
            marked: true, 
            dotColor: colors.primary
          };
        } else {
          marked[dataStr] = { 
            ...marked[dataStr],
            marked: true, 
            dotColor: colors.primary
          };
        }
      } catch (e) {
        logger.error('Erro ao marcar data no calendário:', ag.id, e);
      }
    });
    
    // Marcar datas bloqueadas
    datasBloqueadas.forEach(data => {
      marked[data] = { 
        ...marked[data],
        selected: data === selectedDateStr ? true : false,
        disableTouchEvent: false,
        selectedColor: data === selectedDateStr ? colors.primary : undefined,
        dotColor: colors.error,
        marked: true
      };
    });
    
    logger.debug('Datas marcadas:', Object.keys(marked).length);
    setMarkedDates(marked);
  }, [agendamentosMes, selectedDate, datasBloqueadas]);

  // Novo useEffect para carregar bloqueios
  useEffect(() => {
    carregarBloqueios();
  }, []);

  // Adicionar um useEffect para carregar as configurações de horários:
  useEffect(() => {
    carregarHorarios();
  }, []);

  // Adicionar um useEffect para escutar o evento de atualização de agendamentos
  useEffect(() => {
    // Escutar o evento de atualização de agendamentos
    const subscription = DeviceEventEmitter.addListener('atualizarAgendamentos', () => {
      logger.debug('Recebido evento para atualizar agendamentos');
      // Recarregar os agendamentos
      carregarAgendamentos();
      // Recarregar os agendamentos do mês para atualizar o calendário
      carregarAgendamentosMes();
    });

    // Limpar o ouvinte quando o componente for desmontado
    return () => {
      subscription.remove();
    };
  }, []);

  // Adicionar um useEffect para escutar o evento de agendamento criado
  useEffect(() => {
    // Escutar o evento de agendamento criado
    const subscription = DeviceEventEmitter.addListener('agendamentoCriado', (mensagem: string) => {
      logger.debug('Recebido evento de agendamento criado:', mensagem);
      // Exibir mensagem de sucesso
      setSuccessMessage(mensagem || 'Agendamento criado com sucesso!');
      
      // Limpar a mensagem após 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    });

    // Limpar o ouvinte quando o componente for desmontado
    return () => {
      subscription.remove();
    };
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      
      logger.debug('Carregando usuários para estabelecimento:', estabelecimentoId);
      
      if (!estabelecimentoId) {
        logger.error('ID do estabelecimento não disponível');
        return;
      }

      // Tenta usar RPC function primeiro
      const { data: usuariosRpc, error: rpcError } = await supabase
        .rpc('get_usuarios_estabelecimento', { estabelecimento_uuid: estabelecimentoId });

      if (!rpcError && usuariosRpc) {
        logger.debug('Usuários carregados via RPC:', usuariosRpc.length);
        
        // REGRA: Profissionais veem apenas a si mesmos
        if (role === 'profissional' && user?.id) {
          const profissionalAtual = usuariosRpc.filter((u: any) => u.id === user.id);
          setUsuarios(profissionalAtual);
          // Selecionar automaticamente o próprio usuário
          setSelectedUser(user.id);
          return;
        }
        
        // Admin e funcionário veem TODOS os usuários
        setUsuarios(usuariosRpc || []);
        return;
      }
      
      logger.debug('Erro RPC ou dados vazios:', rpcError);

      // Fallback para consulta direta
      logger.debug('RPC não disponível, usando consulta direta...');
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_completo');

      if (error) {
        logger.error('Erro ao carregar usuários via consulta direta:', error);
        return;
      }

      logger.debug('Usuários encontrados via consulta direta:', usuarios?.length);
      
      // REGRA: Profissionais veem apenas a si mesmos
      if (role === 'profissional' && user?.id) {
        const profissionalAtual = usuarios?.filter((u: any) => u.id === user.id) || [];
        setUsuarios(profissionalAtual);
        // Selecionar automaticamente o próprio usuário
        setSelectedUser(user.id);
        return;
      }
      
      setUsuarios(usuarios || []);
    } catch (error) {
      logger.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarAgendamentos = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return;
      }
      
      // Filtrar por usuário se selecionado OU se for profissional
      const usuarioFiltro = selectedUser || (role === 'profissional' ? user?.id : null);
      
      // Gerar chave de cache baseada na data e usuário
      const dataStr = format(selectedDate, 'yyyy-MM-dd');
      const cacheKey = `dia_${dataStr}_${usuarioFiltro || 'todos'}`;
      
      // Tentar buscar do cache primeiro
      const cachedData = forceRefresh
        ? null
        : await CacheManager.get<AgendamentoAgenda[]>(
            CacheNamespaces.AGENDAMENTOS,
            cacheKey
          );

      if (cachedData) {
        logger.debug('Agendamentos carregados do cache');
        setAgendamentos(cachedData);
        setLoading(false);
        return;
      }
      
      // Usar funções de timezone para garantir comparação correta
      const ano = selectedDate.getFullYear();
      const mes = selectedDate.getMonth() + 1;
      const dia = selectedDate.getDate();
      
      const dataInicioLocal = getStartOfDayLocal(selectedDate);
      const dataFimLocal = getEndOfDayLocal(selectedDate);
      
      logger.debug(`Buscando agendamentos do dia:`);
      logger.debug(`   Data: ${dia}/${mes}/${ano}`);
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', dataInicioLocal)
        .lte('data_hora', dataFimLocal);
      
      if (usuarioFiltro) {
        query = query.eq('usuario_id', usuarioFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;

      // OTIMIZAÇÃO: Trazer todos os dados relacionados em DUAS queries
      const clienteIds = [...new Set((data || []).map((ag: any) => ag.cliente_id).filter(Boolean))];
      const clienteNomes = [...new Set((data || []).map((ag: any) => ag.cliente).filter(Boolean))];
      
      let clientesData: any = {};
      let movimentacoesData: any = {};
      
      if (clienteIds.length > 0) {
        const { data: searchClientesById } = await supabase
          .from('clientes')
          .select('id, foto_url, telefone')
          .in('id', clienteIds);
        
        (searchClientesById || []).forEach(c => {
          clientesData[c.id] = c;
        });
        
        const { data: todasMovimentacoes } = await supabase
          .from('crediario_movimentacoes')
          .select('valor, cliente_id')
          .in('cliente_id', clienteIds);
        
        (todasMovimentacoes || []).forEach(mov => {
          if (!movimentacoesData[mov.cliente_id]) {
            movimentacoesData[mov.cliente_id] = [];
          }
          movimentacoesData[mov.cliente_id].push(mov);
        });
      }
      
      if (clienteNomes.length > 0) {
        for (const nome of clienteNomes) {
          if (!Object.values(clientesData).find((c: any) => c.nome === nome)) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('id, foto_url, telefone')
              .eq('estabelecimento_id', estabelecimentoId)
              .ilike('nome', nome)
              .limit(1)
              .maybeSingle();
            
            if (clienteData) {
              clientesData[clienteData.id] = clienteData;
              
              const { data: movs } = await supabase
                .from('crediario_movimentacoes')
                .select('valor, cliente_id')
                .eq('cliente_id', clienteData.id);
              
              if (movs && movs.length > 0) {
                movimentacoesData[clienteData.id] = movs;
              }
            }
          }
        }
      }
      
      // Montar resultado combinando agendamentos com dados de clientes
      const agendamentosComClientes = (data || []).map((ag: any) => {
        let cliente_foto = null;
        let cliente_telefone = null;
        let cliente_saldo = 0;
        
        const cliente = ag.cliente_id ? clientesData[ag.cliente_id] : null;
        
        if (cliente) {
          cliente_foto = cliente.foto_url;
          cliente_telefone = cliente.telefone;
          
          const movimentacoes = movimentacoesData[ag.cliente_id] || [];
          cliente_saldo = movimentacoes.reduce((total: number, mov: any) => {
            const valorNumerico = typeof mov.valor === 'number' 
              ? mov.valor 
              : parseFloat(mov.valor);
            return total + valorNumerico;
          }, 0);
        }
        
        return {
          ...ag,
          cliente_foto,
          cliente_telefone,
          cliente_saldo,
        };
      });
      
      await CacheManager.set(
        CacheNamespaces.AGENDAMENTOS,
        cacheKey,
        agendamentosComClientes,
        CacheTTL.TWO_MINUTES
      );
      
      setAgendamentos(agendamentosComClientes);
    } catch (error) {
      logger.error('Erro ao carregar agendamentos:', error);
      setAgendamentos([]); 
    } finally {
      setLoading(false);
    }
  };

  const carregarAgendamentosMes = async (forceRefresh = false) => {
    try {
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return;
      }
      
      const ano = selectedDate.getFullYear();
      const mes = selectedDate.getMonth() + 1;
      
      const dataInicioMesLocal = getStartOfMonthLocal(ano, mes);
      const dataFimMesLocal = getEndOfMonthLocal(ano, mes);
      
      const mesStr = format(selectedDate, 'yyyy-MM');
      const cacheKey = `mes_${mesStr}_${selectedUser || 'todos'}`;
      
      const cachedData = forceRefresh
        ? null
        : await CacheManager.get<AgendamentoAgenda[]>(
            CacheNamespaces.AGENDAMENTOS,
            cacheKey
          );

      if (cachedData) {
        setAgendamentosMes(cachedData);
        return;
      }
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', dataInicioMesLocal)
        .lte('data_hora', dataFimMesLocal);

      if (selectedUser) {
        query = query.eq('usuario_id', selectedUser);
      }

      const { data, error } = await query;

      if (error) throw error;

      const clienteIds = [...new Set((data || []).map((ag: any) => ag.cliente_id).filter(Boolean))];
      const clienteNomes = [...new Set((data || []).map((ag: any) => ag.cliente).filter(Boolean))];
      
      let clientesData: any = {};
      let movimentacoesData: any = {};
      
      if (clienteIds.length > 0) {
        const { data: searchClientesById } = await supabase
          .from('clientes')
          .select('id, foto_url, telefone')
          .in('id', clienteIds);
        
        (searchClientesById || []).forEach(c => {
          clientesData[c.id] = c;
        });
        
        const { data: todasMovimentacoes } = await supabase
          .from('crediario_movimentacoes')
          .select('valor, cliente_id')
          .in('cliente_id', clienteIds);
        
        (todasMovimentacoes || []).forEach(mov => {
          if (!movimentacoesData[mov.cliente_id]) {
            movimentacoesData[mov.cliente_id] = [];
          }
          movimentacoesData[mov.cliente_id].push(mov);
        });
      }
      
      if (clienteNomes.length > 0) {
        for (const nome of clienteNomes) {
          if (!Object.values(clientesData).find((c: any) => c.nome === nome)) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('id, foto_url, telefone')
              .eq('estabelecimento_id', estabelecimentoId)
              .ilike('nome', nome)
              .limit(1)
              .maybeSingle();
            
            if (clienteData) {
              clientesData[clienteData.id] = clienteData;
              
              const { data: movs } = await supabase
                .from('crediario_movimentacoes')
                .select('valor, cliente_id')
                .eq('cliente_id', clienteData.id);
              
              if (movs && movs.length > 0) {
                movimentacoesData[clienteData.id] = movs;
              }
            }
          }
        }
      }
      
      const agendamentosComClientes = (data || []).map((ag: any) => {
        let cliente_foto = null;
        let cliente_telefone = null;
        let cliente_saldo = 0;
        
        const cliente = ag.cliente_id ? clientesData[ag.cliente_id] : null;
        
        if (cliente) {
          cliente_foto = cliente.foto_url;
          cliente_telefone = cliente.telefone;
          
          const movimentacoes = movimentacoesData[ag.cliente_id] || [];
          cliente_saldo = movimentacoes.reduce((total: number, mov: any) => {
            const valorNumerico = typeof mov.valor === 'number' 
              ? mov.valor 
              : parseFloat(mov.valor);
            return total + valorNumerico;
          }, 0);
        }
        
        return {
          ...ag,
          cliente_foto,
          cliente_telefone,
          cliente_saldo,
        };
      });
      
      await CacheManager.set(
        CacheNamespaces.AGENDAMENTOS,
        cacheKey,
        agendamentosComClientes,
        CacheTTL.TWO_MINUTES
      );
      
      setAgendamentosMes(agendamentosComClientes);
    } catch (error) {
      logger.error('Erro ao carregar agendamentos do mês:', error);
    }
  };

  const toggleUsuario = (usuarioId: string) => {
    setSelectedUser(selectedUser === usuarioId ? null : usuarioId);
  };

  const togglePresenca = (usuarioId: string) => {
    setPresencaUsuarios(prev => {
      const novoEstado = {
        ...prev,
        [usuarioId]: !prev[usuarioId]
      };

      if (selectedUser === usuarioId && !novoEstado[usuarioId]) {
        setSelectedUser(null);
      }

      DeviceEventEmitter.emit('atualizarPresencaUsuarios', novoEstado);

      return novoEstado;
    });
  };

  const navegarData = (direcao: 'anterior' | 'proximo') => {
    const novaData = new Date(selectedDate);
    novaData.setDate(selectedDate.getDate() + (direcao === 'anterior' ? -1 : 1));
    setSelectedDate(novaData);
  };

  const handleDateSelect = (date: any) => {
    const [year, month, day] = date.dateString.split('-').map(Number);
    const novaData = new Date(year, month - 1, day);
    setSelectedDate(novaData);
    setShowCalendar(false);
  };

  const formatSelectedDateString = () => {
    return format(selectedDate, "yyyy-MM-dd");
  };

  const carregarBloqueios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('Usuário não autenticado ao carregar bloqueios');
        return;
      }
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado ao carregar bloqueios');
        return;
      }
      
      const { data: diasData, error: diasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'dias_semana_bloqueados')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
        
      if (diasError) {
        logger.error('Erro ao carregar dias bloqueados:', diasError);
      } else if (diasData && diasData.valor) {
        try {
          setDiasSemanaBloqueados(JSON.parse(diasData.valor));
        } catch (e) {
          logger.error('Erro ao fazer parse dos dias bloqueados:', e);
        }
      }
      
      const { data: datasData, error: datasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'datas_bloqueadas')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
        
      if (datasError) {
        logger.error('Erro ao carregar datas bloqueadas:', datasError);
      } else if (datasData && datasData.valor) {
        try {
          setDatasBloqueadas(JSON.parse(datasData.valor));
        } catch (e) {
          logger.error('Erro ao fazer parse das datas bloqueadas:', e);
        }
      }
      
    } catch (error) {
      logger.error('Erro ao carregar bloqueios:', error);
    }
  };
  
  const isDataBloqueada = (data: Date) => {
    const diaSemana = data.getDay(); 
    if (diasSemanaBloqueados.includes(diaSemana)) {
      return true;
    }
    
    const dataStr = format(data, 'yyyy-MM-dd');
    return datasBloqueadas.includes(dataStr);
  };

  const carregarHorarios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('Usuário não autenticado ao carregar horários');
        inicializarHorariosPadrao();
        return;
      }
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado ao carregar horários');
        inicializarHorariosPadrao();
        return;
      }
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', [
          'horario_inicio', 
          'horario_intervalo_inicio', 
          'horario_intervalo_fim',
          'horario_fim',
          'intervalo_agendamentos',
          'limite_simultaneos'
        ])
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (error) {
        logger.error('Erro ao carregar configurações de horários:', error);
        inicializarHorariosPadrao();
        return;
      }
      
      let foiAtualizado = false;
      
      if (data && data.length > 0) {
        foiAtualizado = true;
        data.forEach(config => {
          switch (config.chave) {
            case 'horario_inicio':
              setHorarioInicio(config.valor || '08:00');
              break;
            case 'horario_intervalo_inicio':
              if (config.valor) {
                setHorarioIntervaloInicio(config.valor);
                setTemIntervalo(true);
              }
              break;
            case 'horario_intervalo_fim':
              if (config.valor) {
                setHorarioIntervaloFim(config.valor);
              }
              break;
            case 'horario_fim':
              setHorarioFim(config.valor || '18:00');
              break;
            case 'intervalo_agendamentos':
              setIntervaloAgendamentos(config.valor || '30');
              break;
            case 'limite_simultaneos':
              setLimiteSimultaneos(config.valor || '1');
              break;
          }
        });
      }
      
      if (!foiAtualizado) {
        inicializarHorariosPadrao();
      } else {
        atualizarListaHorarios();
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações de horários:', error);
      inicializarHorariosPadrao();
    }
  };
  
  const inicializarHorariosPadrao = () => {
    const horariosIniciais = Array.from({ length: 22 }, (_, i) => {
      const hora = Math.floor(i / 2) + 8; 
      const minutos = i % 2 === 0 ? '00' : '30';
      return `${hora.toString().padStart(2, '0')}:${minutos}`;
    });
    setHorarios(horariosIniciais);
  };
  
  const atualizarListaHorarios = () => {
    try {
      const inicioMinutos = converterHoraParaMinutos(horarioInicio);
      const fimMinutos = converterHoraParaMinutos(horarioFim);
      const intervalo = parseInt(intervaloAgendamentos);
      
      let intervaloInicioMinutos = -1;
      let intervaloFimMinutos = -1;
      
      if (temIntervalo && horarioIntervaloInicio && horarioIntervaloFim) {
        intervaloInicioMinutos = converterHoraParaMinutos(horarioIntervaloInicio);
        intervaloFimMinutos = converterHoraParaMinutos(horarioIntervaloFim);
      }
      
      const novosHorarios: string[] = [];
      
      for (let i = inicioMinutos; i < fimMinutos; i += intervalo) {
        if (temIntervalo && i >= intervaloInicioMinutos && i < intervaloFimMinutos) {
          continue;
        }
        
        novosHorarios.push(converterMinutosParaHora(i));
      }
      
      setHorarios(novosHorarios);
    } catch (error) {
      logger.error('Erro ao atualizar lista de horários:', error);
      inicializarHorariosPadrao();
    }
  };
  
  useEffect(() => {
    atualizarListaHorarios();
  }, [horarioInicio, horarioFim, intervaloAgendamentos, temIntervalo, horarioIntervaloInicio, horarioIntervaloFim]);
  
  const formatarHoraInput = (text: string) => {
    const numeros = text.replace(/[^0-9]/g, '');
    
    if (numeros.length <= 2) {
      return numeros;
    } else {
      return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
    }
  };

  const salvarHorarios = async () => {
    try {
      if (!validarHorarios()) {
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      if (!estabelecimentoId) throw new Error('Estabelecimento ID não encontrado');
      
      const configs = [
        { chave: 'horario_inicio', valor: horarioInicio },
        { chave: 'horario_fim', valor: horarioFim },
        { chave: 'intervalo_agendamentos', valor: intervaloAgendamentos },
        { chave: 'limite_simultaneos', valor: limiteSimultaneos }
      ];
      
      if (temIntervalo) {
        configs.push({ chave: 'horario_intervalo_inicio', valor: horarioIntervaloInicio });
        configs.push({ chave: 'horario_intervalo_fim', valor: horarioIntervaloFim });
      } else {
        configs.push({ chave: 'horario_intervalo_inicio', valor: '' });
        configs.push({ chave: 'horario_intervalo_fim', valor: '' });
      }
      
      const { data: registros, error: checkError } = await supabase
        .from('configuracoes')
        .select('id, chave')
        .in('chave', configs.map(c => c.chave))
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (checkError) {
        logger.error('Erro ao verificar registros existentes:', checkError);
        if (checkError.code === '42P01') {
          alert('A tabela de configurações não existe. Entre em contato com o suporte.');
          throw checkError;
        }
      }
      
      const registrosMap = (registros || []).reduce((acc, reg) => {
        acc[reg.chave] = reg.id;
        return acc;
      }, {} as Record<string, string>);
      
      const promises = configs.map(async (config) => {
        const { chave, valor } = config;
        
        if (registrosMap[chave]) {
          const { error } = await offlineUpdate(
            'configuracoes',
            registrosMap[chave],
            { valor },
            estabelecimentoId!
          );
            
          if (error) {
            logger.error(`Erro ao atualizar configuração ${chave}:`, error);
            return false;
          }
          return true;
        } else {
          const { error } = await offlineInsert(
            'configuracoes',
            {
              chave,
              valor,
              estabelecimento_id: estabelecimentoId
            },
            estabelecimentoId!
          );
            
          if (error) {
            logger.error(`Erro ao inserir configuração ${chave}:`, error);
            return false;
          }
          return true;
        }
      });
      
      const resultados = await Promise.all(promises);
      
      if (resultados.every(r => r === true)) {
        logger.debug('Configurações de horários salvas com sucesso!');
        alert('Configurações de horários salvas com sucesso!');
        
        setShowHorariosModal(false);
        
        atualizarListaHorarios();
      } else {
        throw new Error('Não foi possível salvar todas as configurações');
      }
    } catch (error: any) {
      logger.error('Erro ao salvar configurações de horários:', error);
      logger.error('Detalhes adicionais:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar: ${error.message || 'Verifique o console para mais detalhes'}`);
    }
  };

  const validarHorarios = () => {
    try {
      const regexHora = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      
      if (!regexHora.test(horarioInicio)) {
        alert('Horário de início inválido. Use o formato HH:MM.');
        return false;
      }
      
      if (!regexHora.test(horarioFim)) {
        alert('Horário de encerramento inválido. Use o formato HH:MM.');
        return false;
      }
      
      if (temIntervalo) {
        if (!regexHora.test(horarioIntervaloInicio)) {
          alert('Horário de início do intervalo inválido. Use o formato HH:MM.');
          return false;
        }
        
        if (!regexHora.test(horarioIntervaloFim)) {
          alert('Horário de fim do intervalo inválido. Use o formato HH:MM.');
          return false;
        }
        
        const inicio = converterHoraParaMinutos(horarioInicio);
        const intervaloInicio = converterHoraParaMinutos(horarioIntervaloInicio);
        const intervaloFim = converterHoraParaMinutos(horarioIntervaloFim);
        const fim = converterHoraParaMinutos(horarioFim);
        
        if (intervaloInicio <= inicio) {
          alert('O início do intervalo deve ser depois do horário de início.');
          return false;
        }
        
        if (intervaloFim >= fim) {
          alert('O fim do intervalo deve ser antes do horário de encerramento.');
          return false;
        }
        
        if (intervaloInicio >= intervaloFim) {
          alert('O início do intervalo deve ser antes do fim do intervalo.');
          return false;
        }
      }
      
      const inicio = converterHoraParaMinutos(horarioInicio);
      const fim = converterHoraParaMinutos(horarioFim);
      
      if (inicio >= fim) {
        alert('O horário de início deve ser antes do horário de encerramento.');
        return false;
      }
      
      const intervalo = parseInt(intervaloAgendamentos);
      if (isNaN(intervalo) || intervalo <= 0) {
        alert('O intervalo entre agendamentos deve ser um número positivo.');
        return false;
      }
      
      const limite = parseInt(limiteSimultaneos);
      if (isNaN(limite) || limite <= 0) {
        alert('O limite de agendamentos simultâneos deve ser um número positivo.');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Erro na validação de horários:', error);
      alert('Erro ao validar horários. Verifique o formato e tente novamente.');
      return false;
    }
  };

  const abrirModalAgendamentos = async (horario: string, agendamentosDoHorario: AgendamentoAgenda[]) => {
    const agendamentosCorrigidos = await Promise.all(
      agendamentosDoHorario.map(async (ag) => {
        if (ag.cliente_id && ag.cliente_telefone) {
          const { data: movimentacoes } = await supabase
            .from('crediario_movimentacoes')
            .select('valor')
            .eq('cliente_id', ag.cliente_id);
          
          const saldo = (movimentacoes || []).reduce((total, mov) => {
            const valorNumerico = typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor);
            return total + valorNumerico;
          }, 0);
          
          return {
            ...ag,
            cliente_saldo: saldo
          };
        }
        
        if (ag.cliente_id) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('id, telefone, foto_url')
            .eq('id', ag.cliente_id)
            .single();
          
          if (clienteData) {
            const { data: movimentacoes } = await supabase
              .from('crediario_movimentacoes')
              .select('valor')
              .eq('cliente_id', clienteData.id);
            
            const saldo = (movimentacoes || []).reduce((total, mov) => {
              const valorNumerico = typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor);
              return total + valorNumerico;
            }, 0);
            
            return {
              ...ag,
              cliente_id: clienteData.id,
              cliente_telefone: clienteData.telefone,
              cliente_foto: clienteData.foto_url,
              cliente_saldo: saldo
            };
          }
        }
        
        if (ag.cliente && estabelecimentoId) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('id, telefone, foto_url')
            .eq('estabelecimento_id', estabelecimentoId)
            .ilike('nome', ag.cliente)
            .limit(1)
            .maybeSingle();
          
          if (clienteData) {
            const { data: movimentacoes } = await supabase
              .from('crediario_movimentacoes')
              .select('valor')
              .eq('cliente_id', clienteData.id);
            
            const saldo = (movimentacoes || []).reduce((total, mov) => {
              const valorNumerico = typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor);
              return total + valorNumerico;
            }, 0);
            
            return {
              ...ag,
              cliente_id: clienteData.id,
              cliente_telefone: clienteData.telefone,
              cliente_foto: clienteData.foto_url,
              cliente_saldo: saldo
            };
          }
        }
        
        return ag;
      })
    );
    
    setHorarioSelecionado(horario);
    setAgendamentosDoHorarioSelecionado(agendamentosCorrigidos);
    setShowAgendamentosModal(true);
  };

  const iniciarExclusao = (agendamentoId: string) => {
    setAgendamentoParaExcluir(agendamentoId);
  };

  const confirmarExclusao = async () => {
    if (!agendamentoParaExcluir) return;
    
    try {
      const novosAgendamentos = agendamentos.filter(
        ag => ag.id !== agendamentoParaExcluir
      );
      setAgendamentos(novosAgendamentos);
      
      const novosAgendamentosMes = agendamentosMes.filter(
        ag => ag.id !== agendamentoParaExcluir
      );
      setAgendamentosMes(novosAgendamentosMes);
      
      const novosAgendamentosDoHorario = agendamentosDoHorarioSelecionado.filter(
        ag => ag.id !== agendamentoParaExcluir
      );
      setAgendamentosDoHorarioSelecionado(novosAgendamentosDoHorario);
      
      await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
      
      const { error } = await offlineDelete(
        'agendamentos',
        agendamentoParaExcluir,
        estabelecimentoId!
      );
        
      if (error) {
        setAgendamentos(agendamentos);
        setAgendamentosMes(agendamentosMes);
        setAgendamentosDoHorarioSelecionado(agendamentosDoHorarioSelecionado);
        throw error;
      }
      
      if (novosAgendamentosDoHorario.length === 0) {
        setShowAgendamentosModal(false);
      }
      
      setSuccessMessage('Agendamento excluído com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error: any) {
      logger.error('Erro ao excluir agendamento:', error);
      alert(`Erro ao excluir agendamento: ${error.message}`);
    } finally {
      setAgendamentoParaExcluir(null);
    }
  };

  const atualizarStatus = async (agendamentoId: string, novoStatus: string) => {
    try {
      const { error, fromCache } = await offlineUpdate(
        'agendamentos',
        agendamentoId,
        { status: novoStatus },
        estabelecimentoId!
      );
      
      if (error) throw error;
      
      const agendamentosAtualizados = agendamentos.map(ag =>
        ag.id === agendamentoId ? { ...ag, status: novoStatus as AgendamentoAgenda['status'] } : ag
      );
      setAgendamentos(agendamentosAtualizados);
      
      const agendamentosMesAtualizados = agendamentosMes.map(ag =>
        ag.id === agendamentoId ? { ...ag, status: novoStatus as AgendamentoAgenda['status'] } : ag
      );
      setAgendamentosMes(agendamentosMesAtualizados);
      
      const agendamentosHorarioAtualizados = agendamentosDoHorarioSelecionado.map(ag =>
        ag.id === agendamentoId ? { ...ag, status: novoStatus as AgendamentoAgenda['status'] } : ag
      );
      setAgendamentosDoHorarioSelecionado(agendamentosHorarioAtualizados);
      
      await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);
      
      setTimeout(() => {
        carregarAgendamentos();
      }, 300);
      
      setSuccessMessage(`Status atualizado para ${novoStatus}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error: any) {
      logger.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', `Não foi possível atualizar o status: ${error.message}`);
    }
  };

  const cancelarExclusao = () => {
    setAgendamentoParaExcluir(null);
  };

  const listSections = useMemo(() => {
    const map: Record<string, AgendamentoAgenda[]> = {};
    (agendamentosMes || []).forEach((ag) => {
      try {
        if (!ag || !ag.data_hora) {
          return;
        }
        
        const d = parseDataHoraLocal(ag.data_hora);
        const key = format(d, 'dd/MM/yyyy');
        if (!map[key]) map[key] = [];
        map[key].push(ag);
      } catch (e) {
      }
    });

    const sections = Object.keys(map)
      .sort((a, b) => {
        const [da, ma, aa] = a.split('/').map(Number);
        const [db, mb, ab] = b.split('/').map(Number);
        const daDate = new Date(aa, ma - 1, da).getTime();
        const dbDate = new Date(ab, mb - 1, db).getTime();
        return dbDate - daDate;
      })
      .map(title => ({ title, data: map[title] }));

    return sections;
  }, [agendamentosMes]);

  const getStatusColorGlobal = (status?: string) => {
    switch (status) {
      case 'confirmado': return colors.success;
      case 'em_atendimento': return colors.warning;
      case 'concluido': return colors.textSecondary;
      case 'cancelado': return colors.error;
      case 'falta': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Seletor de data com botão para alternar visualização */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => navegarData('anterior')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.dateContainer, isToday(selectedDate) && styles.dateContainerToday]}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar-outline" size={20} color={isToday(selectedDate) ? colors.white : colors.text} />
          <Text style={[styles.dateText, isToday(selectedDate) && styles.dateTodayText]}>
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            {isToday(selectedDate) && ' • HOJE'}
          </Text>
          <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={20} color={isToday(selectedDate) ? colors.white : colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navegarData('proximo')}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Botão que alterna entre grade e lista */}
        <TouchableOpacity
          style={{ marginLeft: 8, padding: 6 }}
          onPress={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Calendário (Web: Modal transparente para evitar conflitos de clique) */}
      <Modal
        visible={showCalendar}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable style={styles.calendarOverlay} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calendarContainer} onPress={(e) => e.stopPropagation()}>
            <Calendar
              current={formatSelectedDateString()}
              onDayPress={handleDateSelect}
              onMonthChange={(month) => {
                const newDate = new Date(month.year, month.month - 1, month.day);
                setSelectedDate(newDate);
              }}
              markedDates={markedDates}
              theme={{
                selectedDayBackgroundColor: colors.primary,
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lista de avatares - OCULTA para profissionais */}
      {role !== 'profissional' && (
        <View style={styles.avatarListContainer}>
          <ScrollView 
            horizontal 
            style={styles.avatarList} 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarListContent}
          >
            {usuarios
              .filter(usuario => presencaUsuarios[usuario.id]) // Filtra apenas usuários presentes
              .map((usuario) => (
                <TouchableOpacity
                  key={usuario.id}
                  onPress={() => toggleUsuario(usuario.id)}
                  style={[
                    styles.avatarContainer,
                    selectedUser === usuario.id && styles.avatarSelected
                  ]}
                >
                  <View style={styles.avatarWrapper}>
                    {usuario.avatar_url ? (
                      <Image 
                        source={{ uri: usuario.avatar_url }} 
                        style={styles.avatarImage} 
                      />
                    ) : (
                      <View style={[styles.avatarInitials, { backgroundColor: getAvatarColor(usuario.nome_completo) }]}>
                        <Text style={styles.avatarInitialsText}>
                          {getInitials(usuario.nome_completo)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.avatarName}>{usuario.nome_completo}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {/* Grade de horários com scroll horizontal para cards (renderizar apenas no modo 'grid') */}
      <ScrollView 
        horizontal 
        style={{ flex: 1, display: viewMode === 'grid' ? 'flex' : 'none' }}
        contentContainerStyle={{ minWidth: 1000 }} // Largura para até 5 colunas de cards
        showsHorizontalScrollIndicator={true}
      >
        <View style={{ width: 1000 }}>
          <ScrollView style={styles.timeGrid}>
          {isDataBloqueada(selectedDate) ? (
            <View style={styles.diaBloqueadoContainer}>
              <Ionicons name="sunny-outline" size={48} color={colors.error} />
              <Text style={styles.diaBloqueadoText}>Dia Bloqueado</Text>
              <Text style={styles.diaBloqueadoSubtext}>Não são permitidos agendamentos para este dia</Text>
            </View>
          ) : horarios.length === 0 ? (
              <View style={styles.loadingSkeletonsContainer}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonAgendamento key={index} />
                ))}
              </View>
            ) : (() => {
            // Função para converter TIME (HH:MM:SS ou HH:MM) para minutos totais
            const timeParaMinutos = (timeStr: string) => {
              if (!timeStr) return 0;
              
              // Remove qualquer espaço e pega apenas HH:MM (ignora segundos se houver)
              const partes = String(timeStr).trim().split(':');
              const h = parseInt(partes[0] || '0', 10);
              const m = parseInt(partes[1] || '0', 10);
              
              const resultado = h * 60 + m;
              
              return resultado;
            };

            // Calcular altura do card com base na duração (30min por slot = 40px)
            const calcularAlturaCard = (ag: AgendamentoAgenda) => {
              if (!ag.horario_termino) {
                return 60;
              }
              
              const dataParsada = parseDataHoraLocal(ag.data_hora);
              const hora = dataParsada.getHours();
              const min = dataParsada.getMinutes();
              const minutosInicio = hora * 60 + min;
              const minutosTermino = timeParaMinutos(ag.horario_termino);
              
              let duracaoMinutos = minutosTermino - minutosInicio;
              
              // Se duração negativa, o término é no dia seguinte (ex: 22:45 até 00:30)
              if (duracaoMinutos < 0) {
                duracaoMinutos = (24 * 60 - minutosInicio) + minutosTermino;
              }
              
              const alturaSlotHora = 40; // Altura de um time slot (1 hora)
              const alturaCalculada = (duracaoMinutos / 60) * alturaSlotHora;
              
              // Garantir uma altura mínima de 60px para conter o conteúdo
              const alturaFinal = Math.max(alturaCalculada, 60);
              
              if (duracaoMinutos <= 0) {
                return 60;
              }
              
              return alturaFinal;
            };

            // SISTEMA DE ALOCAÇÃO DE COLUNAS
            const NUM_COLUNAS = 5;
            const colunasOcupadas: { [coluna: number]: number } = {}; // { coluna: minutosTermino }

            // Alocar coluna para cada agendamento
            const agendamentosComColuna = agendamentos.map(ag => {
              // Extrair partes manualmente ao invés de usar new Date()
              const dataHoraParts = ag.data_hora.split('T');
              const [ano, mes, dia] = dataHoraParts[0].split('-').map(Number);
              const [hora, min] = dataHoraParts[1].split(':').map(Number);
              const minutosInicio = hora * 60 + min;
              
              const minutosTermino = ag.horario_termino 
                ? timeParaMinutos(ag.horario_termino) 
                : minutosInicio + 30;

              // Encontrar primeira coluna disponível
              let colunaAlocada = 0;
              for (let col = 0; col < NUM_COLUNAS; col++) {
                // Coluna está livre se não existe ou se o último agendamento já terminou
                if (!colunasOcupadas[col] || colunasOcupadas[col] <= minutosInicio) {
                  colunaAlocada = col;
                  colunasOcupadas[col] = minutosTermino; // Ocupar até o término
                  break;
                }
              }

              return { ...ag, coluna: colunaAlocada };
            });

            // Formatar horário com início e término
            const formatarHorarioAgendamento = (ag: AgendamentoAgenda) => {
              const dataParsada = parseDataHoraLocal(ag.data_hora);
              const horaInicio = dataParsada.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              if (ag.horario_termino) {
                const [h, m] = ag.horario_termino.split(':');
                const horaTermino = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
                return `${horaInicio} às ${horaTermino}`;
              }
              return horaInicio;
            };

            // Obter cor baseada no status
            const getStatusColor = (status?: string) => {
              switch(status) {
                case 'confirmado': return colors.success;
                case 'em_atendimento': return colors.warning;
                case 'concluido': return colors.textSecondary;
                case 'cancelado': return colors.error;
                case 'falta': return colors.error;
                default: return colors.primary;
              }
            };

            return horarios.map((horario) => {
              const [horasSlot, minutosSlot] = horario.split(':').map(Number);

              // Buscar agendamentos que INICIAM neste horário EXATO
              const agendamentosQueIniciam = agendamentosComColuna.filter(ag => {
                const dataParsada = parseDataHoraLocal(ag.data_hora);
                const horaInicio = dataParsada.getHours();
                const minutoInicio = dataParsada.getMinutes();
                
                return horasSlot === horaInicio && minutosSlot === minutoInicio;
              });

              return (
                <View key={horario} style={styles.timeSlotContainer}>
                  <View style={styles.timeSlot}>
                    <Text style={styles.timeText}>{horario}</Text>
                    <View style={styles.timeLine} />
                  </View>
                  
                  {/* Cards de agendamento que INICIAM neste horário */}
                  {agendamentosQueIniciam.length > 0 && (
                    <View style={styles.cardsContainer}>
                      {agendamentosQueIniciam.map((ag) => {
                        const alturaCard = calcularAlturaCard(ag);
                        const leftPosition = 58 + (ag.coluna * 188); // Usa a coluna alocada
                        
                        return (
                          <TouchableOpacity 
                            key={ag.id}
                            style={[
                              styles.agendamentoCardAbsolute,
                              {
                                height: alturaCard,
                                left: leftPosition,
                                borderLeftColor: getStatusColor(ag.status),
                              }
                            ]}
                            onPress={() => abrirModalAgendamentos(horario, agendamentosQueIniciam)}
                          >
                            <View style={styles.agendamentoCardContent}>
                              <View style={styles.agendamentoCardHeader}>
                                <Text style={styles.agendamentoHorarioCard} numberOfLines={1}>
                                  {formatarHorarioAgendamento(ag)}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ag.status) }]}>
                                  <Text style={styles.statusBadgeText}>
                                    {ag.status === 'confirmado' && '✓'}
                                    {ag.status === 'em_atendimento' && '⌛'}
                                    {ag.status === 'concluido' && '★'}
                                    {ag.status === 'cancelado' && '✕'}
                                    {ag.status === 'falta' && '!'}
                                    {!ag.status && '📅'}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.agendamentoClienteCard} numberOfLines={1} ellipsizeMode="tail">
                                {ag.cliente}
                              </Text>
                              <Text style={styles.agendamentoServicosCard} numberOfLines={1} ellipsizeMode="tail">
                                {JSON.stringify(ag.servicos)?.includes('nome') 
                                  ? ag.servicos.map((s:any) => s.nome).join(', ')
                                  : 'Serviço não especificado'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            });
          })()}
          </ScrollView>
        </View>
      </ScrollView>

      {/* SectionList: lista seccionada por data/mês (visível no modo 'list') */}
      {viewMode === 'list' && loading ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonAgendamento key={index} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={listSections}
          style={{ flex: 1, display: viewMode === 'list' ? 'flex' : 'none' }}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
            onPress={() => {
              setAgendamentosDoHorarioSelecionado([item]);
              setShowAgendamentosModal(true);
            }}
          >
            <View style={styles.listItemLeft}>
              <Text style={styles.listItemTime}>{format(parseDataHoraLocal(item.data_hora), 'HH:mm')}</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemClient}>{item.cliente}</Text>
              <Text style={styles.listItemServices} numberOfLines={1}>
                {JSON.stringify(item.servicos)?.includes('nome')
                  ? item.servicos.map((s:any) => s.nome).join(', ')
                  : 'Serviço não especificado'}
              </Text>
            </View>
            <View style={styles.listItemStatus}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColorGlobal(item.status) }]} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Nenhum agendamento encontrado</Text>
          </View>
        )}
      />
      )}

      <Modal
        visible={showPresencaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPresencaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPresencaModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Presença</Text>
            </View>
            
            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {usuarios.map(usuario => (
                <TouchableOpacity
                  key={usuario.id}
                  style={styles.presencaItem}
                  onPress={() => togglePresenca(usuario.id)}
                >
                  <View style={styles.presencaUserInfo}>
                    {usuario.avatar_url ? (
                      <Image 
                        source={{ uri: usuario.avatar_url }} 
                        style={styles.presencaAvatar} 
                      />
                    ) : (
                      <View style={[styles.presencaAvatar, styles.presencaAvatarPlaceholder]}>
                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.presencaUserName}>{usuario.nome_completo}</Text>
                  </View>
                  <View style={[
                    styles.presencaStatus,
                    presencaUsuarios[usuario.id] ? styles.presente : styles.ausente
                  ]}>
                    <Text style={[
                      styles.presencaStatusText,
                      presencaUsuarios[usuario.id] ? styles.presenteText : styles.ausenteText
                    ]}>
                      {presencaUsuarios[usuario.id] ? 'Presente' : 'Ausente'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Bloqueio de Datas */}
      <ModalGerenciarBloqueios
        visible={showBloqueioModal}
        onClose={() => setShowBloqueioModal(false)}
        estabelecimentoId={estabelecimentoId}
        colors={colors}
        onSave={carregarBloqueios}
      />

      {/* Modal de Configuração de Horários */}
      <Modal
        visible={showHorariosModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHorariosModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHorariosModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Horários</Text>
            </View>
            
            <ScrollView 
              style={styles.modalList} 
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalSubtitle}>Horário de Funcionamento</Text>
              
              {/* Horário de Início */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Horário de Início</Text>
                <TextInput
                  style={styles.formInput}
                  value={horarioInicio}
                  onChangeText={(text) => setHorarioInicio(formatarHoraInput(text))}
                  placeholder="08:00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              {/* Horário de Encerramento */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Horário de Encerramento</Text>
                <TextInput
                  style={styles.formInput}
                  value={horarioFim}
                  onChangeText={(text) => setHorarioFim(formatarHoraInput(text))}
                  placeholder="18:00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              {/* Intervalo */}
              <View style={styles.formGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.formLabel}>Intervalo</Text>
                  <TouchableOpacity 
                    style={[styles.switch, temIntervalo ? styles.switchOn : styles.switchOff]}
                    onPress={() => setTemIntervalo(!temIntervalo)}
                  >
                    <View style={[styles.switchButton, temIntervalo ? styles.switchButtonOn : styles.switchButtonOff]} />
                  </TouchableOpacity>
                </View>
                
                {temIntervalo && (
                  <View style={styles.intervaloContainer}>
                    <View style={styles.intervaloInput}>
                      <Text style={styles.formLabelSmall}>Início</Text>
                      <TextInput
                        style={styles.formInput}
                        value={horarioIntervaloInicio}
                        onChangeText={(text) => setHorarioIntervaloInicio(formatarHoraInput(text))}
                        placeholder="12:00"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    
                    <View style={styles.intervaloInput}>
                      <Text style={styles.formLabelSmall}>Fim</Text>
                      <TextInput
                        style={styles.formInput}
                        value={horarioIntervaloFim}
                        onChangeText={(text) => setHorarioIntervaloFim(formatarHoraInput(text))}
                        placeholder="13:00"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  </View>
                )}
              </View>
              
              <Text style={[styles.modalSubtitle, { marginTop: 20 }]}>Configurações de Agendamento</Text>
              
              {/* Intervalo entre Agendamentos */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Intervalo entre Agendamentos</Text>
                <View style={styles.selectContainer}>
                  {['5', '10', '15', '30', '60', '120'].map((valor) => (
                    <TouchableOpacity
                      key={valor}
                      style={[
                        styles.selectOption,
                        intervaloAgendamentos === valor && styles.selectOptionSelected
                      ]}
                      onPress={() => setIntervaloAgendamentos(valor)}
                    >
                      <Text 
                        style={[
                          styles.selectOptionText,
                          intervaloAgendamentos === valor && styles.selectOptionTextSelected
                        ]}
                      >
                        {valor === '60' ? '1h' : 
                         valor === '120' ? '2h' : 
                         `${valor}min`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Limite de Agendamentos Simultâneos */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Agendamentos Simultâneos</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const atual = parseInt(limiteSimultaneos);
                      if (atual > 1) {
                        setLimiteSimultaneos((atual - 1).toString());
                      }
                    }}
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <Text style={styles.counterValue}>{limiteSimultaneos}</Text>
                  
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const atual = parseInt(limiteSimultaneos);
                      setLimiteSimultaneos((atual + 1).toString());
                    }}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.salvarButton}
                onPress={() => {
                  salvarHorarios();
                  setShowHorariosModal(false);
                }}
              >
                <Text style={styles.salvarButtonText}>Salvar Configurações</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Botão de adicionar agendamento */}
      <TouchableOpacity
        style={[styles.addButton, { opacity: 0 }]}
        onPress={() => router.push('/(app)/agenda/novo')}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>

      {/* Toast de mensagem de sucesso */}
      {successMessage ? (
        <View style={styles.successToast}>
          <Text style={styles.successToastText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Modal para visualizar múltiplos agendamentos */}
      <Modal
        visible={showAgendamentosModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgendamentosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentDetalhes}>
            {/* Botão fechar no topo direito */}
            <TouchableOpacity 
              onPress={() => setShowAgendamentosModal(false)}
              style={styles.closeButtonTopRight}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {agendamentosDoHorarioSelecionado.map((item, index) => {
                const getStatusInfo = (status?: string) => {
                  switch(status) {
                    case 'confirmado':
                      return { label: 'CONFIRMADO', icon: 'checkmark-circle', color: colors.success };
                    case 'em_atendimento':
                      return { label: 'EM ATENDIMENTO', icon: 'person', color: colors.warning };
                    case 'concluido':
                      return { label: 'FINALIZADO', icon: 'checkmark-done', color: colors.textSecondary };
                    case 'cancelado':
                      return { label: 'CANCELADO', icon: 'close-circle', color: colors.error };
                    case 'falta':
                      return { label: 'FALTA', icon: 'alert-circle', color: colors.errorDark };
                    default:
                      return { label: 'AGENDADO', icon: 'calendar', color: colors.primary };
                  }
                };

                const statusInfo = getStatusInfo(item.status);
                const dataInicio = parseDataHoraLocal(item.data_hora);
                const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                let horarioCompleto = horaInicio;
                
                if (item.horario_termino) {
                  const [h, m] = item.horario_termino.split(':');
                  const horaTermino = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
                  horarioCompleto = `${horaInicio} às ${horaTermino}`;
                }

                const dataFormatada = dataInicio.toLocaleDateString('pt-BR', { 
                  weekday: 'short', 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                });

                return (
                  <View key={item.id} style={styles.detalhesCard}>
                    {/* Header com foto do cliente */}
                    <View style={styles.detalhesHeader}>
                      <View style={styles.detalhesAvatarContainer}>
                        {item.cliente_foto ? (
                          <Image 
                            source={{ uri: item.cliente_foto }} 
                            style={styles.detalhesAvatar}
                            onError={() => logger.debug('Erro ao carregar imagem:', item.cliente_foto)}
                            onLoad={() => logger.debug('Imagem carregada:', item.cliente_foto)}
                          />
                        ) : (
                          <View style={styles.detalhesAvatarPlaceholder}>
                            <Ionicons name="person" size={40} color={colors.primary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.detalhesClienteInfo}>
                        <Text style={styles.detalhesClienteNome}>{item.cliente}</Text>
                        <Text style={styles.detalhesSaldo}>
                          Saldo na casa: <Text style={[
                            styles.detalhesSaldoValor,
                            { color: (item.cliente_saldo || 0) >= 0 ? colors.success : colors.error }
                          ]}>
                            {item.cliente_saldo !== null && item.cliente_saldo !== undefined 
                              ? `R$ ${item.cliente_saldo.toFixed(2).replace('.', ',')}` 
                              : 'R$ 0,00'}
                          </Text>
                        </Text>
                        {item.cliente_telefone && (
                          <Text style={styles.detalhesTelefone}>
                            {item.cliente_telefone}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Data, horário e serviços */}
                    <View style={styles.detalhesInfo}>
                      <Text style={styles.detalhesInfoLabel}>
                        <Text style={styles.detalhesInfoBold}>Data:</Text> {dataFormatada} das{' '}
                        <Text style={styles.detalhesInfoDestaque}>{horarioCompleto}</Text>
                      </Text>
                      <Text style={styles.detalhesInfoLabel}>
                        <Text style={styles.detalhesInfoBold}>Serviços:</Text>{' '}
                        {JSON.stringify(item.servicos)?.includes('nome')
                          ? item.servicos.map((s: any) => s.nome).join(', ')
                          : 'Não especificado'}
                      </Text>
                    </View>

                    {/* Compartilhar via WhatsApp */}
                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={async () => {
                        try {
                          logger.debug('INÍCIO - Verificando dados do agendamento:', {
                            tem_telefone: !!item.cliente_telefone,
                            telefone_value: item.cliente_telefone,
                            cliente: item.cliente,
                            cliente_id: item.cliente_id,
                            agendamento_id: item.id
                          });
                          
                          // 1. Validar se o cliente_id existe
                          if (!item.cliente_id) {
                            logger.error('CLIENTE_ID NÃO ENCONTRADO no agendamento');
                            Alert.alert(
                              'Cliente não vinculado', 
                              `O agendamento de "${item.cliente}" não está vinculado a um cadastro. Isso pode acontecer com agendamentos antigos. Tente recarregar a tela ou entre em contato com o suporte.`,
                              [
                                { text: 'OK', style: 'cancel' }
                              ]
                            );
                            return;
                          }
                          
                          // 2. Validar se há telefone antes de prosseguir
                          if (!item.cliente_telefone) {
                            logger.error('TELEFONE NÃO ENCONTRADO no objeto item');
                            Alert.alert(
                              'Telefone não cadastrado', 
                              `O cliente "${item.cliente}" não possui telefone cadastrado. Deseja cadastrar agora?`,
                              [
                                { text: 'Agora não', style: 'cancel' },
                                { 
                                  text: 'Cadastrar', 
                                  onPress: () => {
                                    router.push(`/(app)/clientes/${item.cliente_id}`);
                                    setShowAgendamentosModal(false);
                                  }
                                }
                              ]
                            );
                            return;
                          }
                          
                          // 3. Validar formato do telefone
                          const numeroLimpo = item.cliente_telefone.replace(/\D/g, '');
                          logger.debug('Telefone limpo:', numeroLimpo, 'Tamanho:', numeroLimpo.length);
                          
                          if (numeroLimpo.length < 10) {
                            logger.error('TELEFONE INVÁLIDO - menos de 10 dígitos');
                            Alert.alert(
                              'Telefone inválido', 
                              `O telefone cadastrado para "${item.cliente}" está incompleto. Deseja corrigir?`,
                              [
                                { text: 'Agora não', style: 'cancel' },
                                { 
                                  text: 'Corrigir', 
                                  onPress: () => {
                                    router.push(`/(app)/clientes/${item.cliente_id}`);
                                    setShowAgendamentosModal(false);
                                  }
                                }
                              ]
                            );
                            return;
                          }
                          
                          const d = parseDataHoraLocal(item.data_hora);
                          const yyyy = d.getFullYear();
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const dd = String(d.getDate()).padStart(2, '0');
                          const dataISO = `${yyyy}-${mm}-${dd}`;
                          const horaExtrair = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          const servico = JSON.stringify(item.servicos)?.includes('nome')
                            ? item.servicos.map((s: any) => s.nome).join(', ')
                            : 'Serviço';
                          const payload: AgendamentoMensagem = {
                            cliente_nome: item.cliente,
                            cliente_telefone: item.cliente_telefone,
                            data: dataISO,
                            hora: horaExtrair,
                            servico,
                          };
                          
                          logger.debug('Tentando abrir WhatsApp:', {
                            cliente: payload.cliente_nome,
                            telefone: payload.cliente_telefone,
                            telefone_limpo: numeroLimpo,
                            data: payload.data,
                            hora: payload.hora
                          });
                          
                          await enviarMensagemWhatsapp(payload);
                        } catch (err) {
                          logger.error('Erro ao preparar WhatsApp:', err);
                          Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
                        }
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
                      <Text style={styles.whatsappButtonText}>Compartilhar via WhatsApp</Text>
                    </TouchableOpacity>

                    {/* Alterar Status */}
                    <Text style={styles.alterarStatusLabel}>Status do Agendamento</Text>
                    <View style={styles.statusButtonsGrid}>
                      <TouchableOpacity
                        style={[
                          styles.statusButtonLarge,
                          item.status === 'agendado' && styles.statusButtonActive
                        ]}
                        onPress={() => atualizarStatus(item.id, 'agendado')}
                      >
                        <Ionicons 
                          name="calendar-outline" 
                          size={20} 
                          color={item.status === 'agendado' ? colors.primaryContrast : '#9CA3AF'} 
                        />
                        <Text style={[
                          styles.statusButtonTextLarge,
                          item.status === 'agendado' && styles.statusButtonTextActive
                        ]}>
                          Agendado
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusButtonLarge,
                          item.status === 'confirmado' && styles.statusButtonActive
                        ]}
                        onPress={() => atualizarStatus(item.id, 'confirmado')}
                      >
                        <Ionicons 
                          name="checkmark-circle-outline" 
                          size={20} 
                          color={item.status === 'confirmado' ? colors.primaryContrast : '#9CA3AF'} 
                        />
                        <Text style={[
                          styles.statusButtonTextLarge,
                          item.status === 'confirmado' && styles.statusButtonTextActive
                        ]}>
                          Confirmado
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusButtonLarge,
                          item.status === 'cancelado' && styles.statusButtonActive
                        ]}
                        onPress={() => atualizarStatus(item.id, 'cancelado')}
                      >
                        <Ionicons 
                          name="close-circle-outline" 
                          size={20} 
                          color={item.status === 'cancelado' ? colors.primaryContrast : '#9CA3AF'} 
                        />
                        <Text style={[
                          styles.statusButtonTextLarge,
                          item.status === 'cancelado' && styles.statusButtonTextActive
                        ]}>
                          Cancelado
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusButtonLarge,
                          item.status === 'concluido' && styles.statusButtonActive
                        ]}
                        onPress={() => atualizarStatus(item.id, 'concluido')}
                      >
                        <Ionicons 
                          name="checkmark-done-outline" 
                          size={20} 
                          color={item.status === 'concluido' ? colors.primaryContrast : '#9CA3AF'} 
                        />
                        <Text style={[
                          styles.statusButtonTextLarge,
                          item.status === 'concluido' && styles.statusButtonTextActive
                        ]}>
                          Finalizado
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Botões de ação na parte inferior */}
                    <View style={styles.detalhesActionsGrid}>
                      <TouchableOpacity 
                        style={[styles.detalhesActionButton, { backgroundColor: colors.errorBackground }]}
                        onPress={() => iniciarExclusao(item.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                        <Text style={[styles.detalhesActionButtonText, { color: colors.errorDark }]}>
                          Excluir
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[
                          styles.detalhesActionButton, 
                          { 
                            backgroundColor: item.comanda_id ? '#DBEAFE' : colors.borderLight,
                            opacity: item.comanda_id ? 1 : 0.5
                          }
                        ]}
                        onPress={() => {
                          if (item.comanda_id) {
                            // Navegar para ver comanda
                            logger.debug('Ver comanda:', item.comanda_id);
                          }
                        }}
                        disabled={!item.comanda_id}
                      >
                        <Ionicons 
                          name="receipt-outline" 
                          size={20} 
                          color={item.comanda_id ? '#2563EB' : '#9CA3AF'} 
                        />
                        <Text style={[
                          styles.detalhesActionButtonText, 
                          { color: item.comanda_id ? '#2563EB' : '#9CA3AF' }
                        ]}>
                          Ver comanda
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Divider entre agendamentos se houver múltiplos */}
                    {index < agendamentosDoHorarioSelecionado.length - 1 && (
                      <View style={styles.detalhesCardDivider} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        visible={agendamentoParaExcluir !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAgendamentoParaExcluir(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentExclusao}>
            {/* Ícone de alerta */}
            <View style={styles.iconAlertContainer}>
              <View style={styles.iconAlertCircle}>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
              </View>
            </View>

            {/* Título */}
            <Text style={styles.modalTitleExclusao}>Confirmar Exclusão</Text>
            
            {/* Mensagem */}
            <Text style={styles.modalMessageExclusao}>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </Text>
            
            {/* Botões */}
            <View style={styles.confirmationButtonsContainer}>
              <TouchableOpacity 
                style={styles.cancelButtonExclusao}
                onPress={() => cancelarExclusao()}
              >
                <Text style={styles.cancelButtonTextExclusao}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteButtonExclusao}
                onPress={() => confirmarExclusao()}
              >
                <Ionicons name="trash-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.deleteButtonTextExclusao}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos (movida para fora do componente)
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 12,
  },
  dateContainerToday: {
    backgroundColor: colors.primary,
  },
  dateTodayText: {
    color: colors.white,
    fontWeight: '600',
  },
  dateText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    marginLeft: 8,
  },
  avatarListContainer: {
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarList: {
    width: '100%',
  },
  avatarListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  avatarSelected: {
    backgroundColor: colors.primaryBackground,
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarName: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
  },
  timeGrid: {
    flex: 1,
    paddingHorizontal: 16,
    width: '100%', // Ocupar toda a largura do container pai (1000px)
  },
  timeSlotContainer: {
    position: 'relative',
    minHeight: 40,
    // IMPORTANTE: No React Native Android, overflow: 'visible' não funciona com position absolute
    // Os cards precisam se estender além deste container
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    zIndex: 1,
  },
  timeSlotWrapper: {
    marginBottom: 0,
  },
  timeText: {
    width: 50,
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 8,
  },
  cardsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2000, // Altura grande o suficiente para cards longos
    zIndex: 10, // Z-index alto para ficar sobre outros elementos
    pointerEvents: 'box-none', // Permitir cliques através do container vazio
  },
  agendamentoCardAbsolute: {
    position: 'absolute',
    top: 0,
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    elevation: 5, // Elevação maior para ficar acima de tudo
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100, // Z-index muito alto
    overflow: 'hidden',
    pointerEvents: 'auto', // Card deve capturar cliques
  },
  agendamentoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeLineAgendado: {
    backgroundColor: colors.primaryBackground,
    height: 'auto',
    minHeight: 80,
    padding: 4,
  },
  timeLineLimite: {
    backgroundColor: colors.warningBackground,
  },
  timeLineMultiplo: {
    backgroundColor: colors.infoBackground,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  timeLineUnico: {
    backgroundColor: colors.primaryBackground,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  agendamentosScroll: {
    flex: 1,
    height: 'auto',
  },
  agendamentosScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  agendamentoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    width: 180,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
  },
  agendamentoCardMargin: {
    marginLeft: 8,
  },
  statusIndicatorCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  agendamentoCardContent: {
    flex: 1,
    paddingLeft: 6,
    overflow: 'hidden',
  },
  agendamentoHorarioCard: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  agendamentoClienteCard: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  agendamentoServicosCard: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  agendamentoInfo: {
    flex: 1,
    padding: 4,
  },
  agendamentoCliente: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  agendamentoServicos: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  agendamentoLimite: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.warning,
  },
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agendamentoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  agendamentoHorario: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  agendamentoCounter: {
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  agendamentoCounterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  agendamentoMultiplo: {
    fontSize: 10,
    color: colors.primaryContrast,
    fontWeight: '500',
  },
  agendamentoMultiploContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalContentDetalhes: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '95%',
    maxHeight: '95%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    padding: 20,
    paddingTop: 50,
  },
  closeButtonTopRight: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  detalhesCard: {
    marginBottom: 20,
  },
  detalhesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detalhesAvatarContainer: {
    marginRight: 12,
  },
  detalhesAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  detalhesAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detalhesClienteInfo: {
    flex: 1,
  },
  detalhesClienteNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  detalhesSaldo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detalhesSaldoValor: {
    fontSize: 16,
    fontWeight: 'bold',
    // Cor aplicada dinamicamente: verde para positivo, vermelho para negativo
  },
  detalhesTelefone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detalhesIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detalhesInfo: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detalhesInfoLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  detalhesInfoBold: {
    fontWeight: 'bold',
  },
  detalhesInfoDestaque: {
    color: '#2563EB',
    fontWeight: '600',
  },
  whatsappButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  whatsappButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  alterarStatusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  statusButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statusButtonLarge: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  statusButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  statusButtonTextLarge: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.primaryContrast,
    fontWeight: '600',
  },
  detalhesActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detalhesActionButton: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  detalhesActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detalhesCardDivider: {
    height: 2,
    backgroundColor: colors.border,
    marginVertical: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalList: {
    backgroundColor: colors.surface,
    flexGrow: 1,
  },
  modalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  presencaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  presencaUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presencaAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  presencaAvatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presencaUserName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  presencaStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  presente: {
    backgroundColor: colors.successBackground,
  },
  ausente: {
    backgroundColor: colors.errorBackground,
  },
  presencaStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  presenteText: {
    color: colors.success,
  },
  ausenteText: {
    color: colors.error,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: 80,
    zIndex: 900,
  },
  calendarContainer: {
    marginHorizontal: 40,
    maxWidth: 400,
    alignSelf: 'center',
    zIndex: 1000,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Estilos para o bloqueio de datas
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  diaSemanaItem: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  diaSemanaSelected: {
    backgroundColor: colors.primary,
  },
  diaSemanaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  diaSemanaTextSelected: {
    color: colors.white,
  },
  dataInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dataInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    marginRight: 8,
  },
  dataAddButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datasBloqueadasList: {
    marginBottom: 16,
  },
  dataBloqueadaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dataBloqueadaText: {
    fontSize: 16,
    color: colors.text,
  },
  dataRemoveButton: {
    padding: 4,
  },
  salvarButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  salvarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  diaBloqueadoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
    marginTop: 40,
    padding: 20,
  },
  diaBloqueadoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  diaBloqueadoSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Estilos para o formulário de horários
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  formLabelSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  switchOff: {
    backgroundColor: '#D1D5DB',
  },
  switchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  switchButtonOn: {
    marginLeft: 'auto',
  },
  switchButtonOff: {
    marginLeft: 0,
  },
  intervaloContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intervaloInput: {
    flex: 1,
    marginRight: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  selectOptionSelected: {
    backgroundColor: colors.primary,
  },
  selectOptionText: {
    fontSize: 16,
    color: '#4B5563',
  },
  selectOptionTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSkeletonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successToast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  successToastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  agendamentoModalItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginVertical: 4,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agendamentoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  agendamentoModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendamentoModalCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  agendamentoModalNumero: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeModalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  agendamentoModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  agendamentoModalHorarioText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  agendamentoModalServicos: {
    marginLeft: 4,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  agendamentoModalServicosLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  agendamentoModalServicoItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginBottom: 4,
  },
  agendamentoModalObservacoes: {
    marginLeft: 4,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  agendamentoModalObservacoesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  agendamentoModalObservacoesText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  agendamentoModalComandaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBackground,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  agendamentoModalComandaText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  agendamentoModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  agendamentoModalHorario: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  agendamentoDeleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  agendamentoModalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 12,
  },
  flatlistContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelarButton: {
    backgroundColor: '#9CA3AF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  cancelarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalContentExclusao: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconAlertContainer: {
    marginBottom: 20,
  },
  iconAlertCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleExclusao: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessageExclusao: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  cancelButtonExclusao: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonTextExclusao: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonExclusao: {
    flex: 1,
    backgroundColor: colors.errorDark,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteButtonTextExclusao: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  agendamentoUnicoText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  // Estilos para visualização em lista
  sectionHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  listItemLeft: {
    width: 72,
    alignItems: 'flex-start',
  },
  listItemTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listItemContent: {
    flex: 1,
    paddingLeft: 8,
  },
  listItemClient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItemServices: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listItemStatus: {
    width: 40,
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});