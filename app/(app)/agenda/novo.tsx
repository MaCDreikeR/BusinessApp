import React, { useState, useEffect, useRef, useCallback , useMemo} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, PanResponder, Animated, Platform, ActivityIndicator, Image, DeviceEventEmitter, FlatList, BackHandler, KeyboardAvoidingView, GestureResponderEvent, NativeSyntheticEvent, Switch, TouchableWithoutFeedback } from 'react-native';
import { TextInput } from 'react-native-paper';
import { format } from 'date-fns';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MaskInput from 'react-native-mask-input';
import { toISOStringWithTimezone, createLocalISOString, parseISOStringLocal } from '../../../lib/timezone';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { logger } from '../../../utils/logger';
import { formatarDataInput, formatarTelefoneInput } from '@utils/validators';
import { theme } from '@utils/theme';
import { CacheManager, CacheNamespaces } from '../../../utils/cacheManager';
// [CACHE-BUSTER-2025-11-05-14:30] Import condicional: DateTimePicker s� � importado no mobile
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  foto_url?: string | null;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao?: number;
  descricao?: string;
  categoria_id?: string;
  categoria?: {
    nome: string;
  };
}

interface ServicoSelecionado extends Servico {
  quantidade: number;
}

interface Pacote {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  duracao_total?: number;
  servicos?: {
    servico: {
      id: string;
      nome: string;
      preco: number;
      duracao?: number;
    };
    quantidade: number;
  }[];
  produtos?: {
    produto: {
      id: string;
      nome: string;
      preco: number;
    };
    quantidade: number;
  }[];
}

interface PacoteSelecionado extends Pacote {
  quantidade: number;
}

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  avatar_url: string | null;
  faz_atendimento: boolean;
}

export default function NovoAgendamentoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { estabelecimentoId, role, user } = useAuth();
  const { colors } = useTheme();
  
  // Estilos din�micos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [horaTermino, setHoraTermino] = useState(''); // Novo campo para hor�rio de t�rmino
  const [criarComandaAutomatica, setCriarComandaAutomatica] = useState(true); // Padr�o: Sim
  const [servico, setServico] = useState('');
  const [servicosAgendamento, setServicosAgendamento] = useState<string>('');
  const [valorTotal, setValorTotal] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Novos estados para busca de clientes
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  // Novos estados para busca de servi�os
  const [servicosEncontrados, setServicosEncontrados] = useState<Servico[]>([]);
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [buscandoServicos, setBuscandoServicos] = useState(false);
  const [mostrarListaServicos, setMostrarListaServicos] = useState(false);

  // Estados para o modal de servi�os
  const [modalVisible, setModalVisible] = useState(false);
  const [pesquisaServico, setPesquisaServico] = useState('');

  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);

  // Estados para pacotes
  const [todosPacotes, setTodosPacotes] = useState<Pacote[]>([]);
  const [pacotesSelecionados, setPacotesSelecionados] = useState<PacoteSelecionado[]>([]);
  const [modalPacotesVisible, setModalPacotesVisible] = useState(false);
  const [pesquisaPacote, setPesquisaPacote] = useState('');
  const [buscandoPacotes, setBuscandoPacotes] = useState(false);

  // Anima��es separadas para cada modal
  const translateYServicos = useRef(new Animated.Value(500)).current;
  const translateYPacotes = useRef(new Animated.Value(500)).current;
  
  // PanResponder para o modal de servi�os
  const panResponderServicos = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYServicos.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(translateYServicos, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setModalVisible(false);
            translateYServicos.setValue(500);
          });
        } else {
          Animated.spring(translateYServicos, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // PanResponder para o modal de pacotes
  const panResponderPacotes = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYPacotes.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(translateYPacotes, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setModalPacotesVisible(false);
            translateYPacotes.setValue(500);
          });
        } else {
          Animated.spring(translateYPacotes, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());

  // Log para debug quando showDatePicker muda
  useEffect(() => {
    logger.debug('??? [STATE] showDatePicker mudou para:', showDatePicker, 'Platform:', Platform.OS);
  }, [showDatePicker]);

  // Estados para usu�rios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [presencaUsuarios, setPresencaUsuarios] = useState<Record<string, boolean>>({});
  const [mostrarListaUsuarios, setMostrarListaUsuarios] = useState(false);

  // Adicionar estados para controle de dias bloqueados
  const [diasSemanaBloqueados, setDiasSemanaBloqueados] = useState<number[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);

  // Adicionar estado para armazenar o limite de agendamentos simult�neos
  const [limiteSimultaneos, setLimiteSimultaneos] = useState('1');

  // Adicionar novos estados
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<{horario: string, ocupado: boolean, quantidade: number}[]>([]);
  const [mostrarSeletorHorario, setMostrarSeletorHorario] = useState(false);
  const [mostrarSeletorHorarioTermino, setMostrarSeletorHorarioTermino] = useState(false);
  const [intervaloAgendamentos, setIntervaloAgendamentos] = useState('30');
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [temIntervalo, setTemIntervalo] = useState(false);
  const [horarioIntervaloInicio, setHorarioIntervaloInicio] = useState('12:00');
  const [horarioIntervaloFim, setHorarioIntervaloFim] = useState('13:00');

  // Fun��o para calcular a dura��o total dos servi�os selecionados
  const calcularDuracaoTotal = useCallback((): number | null => {
    if (servicosSelecionados.length === 0) return null;
    
    let duracaoTotal = 0;
    let temDuracao = false;
    
    for (const servico of servicosSelecionados) {
      if (servico.duracao) {
        duracaoTotal += servico.duracao * (servico.quantidade || 1);
        temDuracao = true;
      }
    }
    
    return temDuracao ? duracaoTotal : null;
  }, [servicosSelecionados]);

  // Fun��o para calcular hor�rio de t�rmino baseado no hor�rio de in�cio e dura��o
  const calcularHorarioTermino = useCallback((horarioInicio: string, duracaoMinutos: number): string => {
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    
    // Converte tudo para minutos
    const minutosInicio = horas * 60 + minutos;
    const minutosFim = minutosInicio + duracaoMinutos;
    
    // Converte de volta para horas e minutos
    const horasFim = Math.floor(minutosFim / 60);
    const minutosFim2 = minutosFim % 60;
    
    // Formata com zero � esquerda
    const horaFormatada = String(horasFim).padStart(2, '0');
    const minutoFormatado = String(minutosFim2).padStart(2, '0');
    
    return `${horaFormatada}:${minutoFormatado}`;
  }, []);

  // Calcular dura��o total considerando servi�os e pacotes
  const calcularDuracaoTotalCompleta = useCallback((): number | null => {
    let duracaoTotal = 0;
    let temDuracao = false;
    
    // Dura��o dos servi�os
    for (const servico of servicosSelecionados) {
      if (servico.duracao) {
        const duracaoServico = servico.duracao * (servico.quantidade || 1);
        duracaoTotal += duracaoServico;
        temDuracao = true;
        logger.debug(`?? Servi�o "${servico.nome}": ${servico.duracao} min x ${servico.quantidade} = ${duracaoServico} min`);
      }
    }
    
    // Dura��o dos pacotes
    for (const pacote of pacotesSelecionados) {
      if (pacote.duracao_total) {
        const duracaoPacote = pacote.duracao_total * (pacote.quantidade || 1);
        duracaoTotal += duracaoPacote;
        temDuracao = true;
        logger.debug(`?? Pacote "${pacote.nome}": ${pacote.duracao_total} min x ${pacote.quantidade} = ${duracaoPacote} min`);
      } else {
        logger.warn(`?? Pacote "${pacote.nome}" N�O tem duracao_total definida!`);
      }
    }
    
    logger.debug(`?? TOTAL calculado: ${duracaoTotal} min (temDuracao: ${temDuracao})`);
    return temDuracao ? duracaoTotal : null;
  }, [servicosSelecionados, pacotesSelecionados]);

  // Effect para atualizar hor�rio de t�rmino automaticamente quando hora de in�cio ou servi�os/pacotes mudam
  useEffect(() => {
    logger.debug('-------------------------------------------------------');
    logger.debug('?? useEffect DISPARADO - Verificando c�lculo de t�rmino');
    logger.debug(`?? Hora in�cio: ${hora}`);
    logger.debug(`?? Servi�os selecionados: ${servicosSelecionados.length}`);
    logger.debug(`?? Pacotes selecionados: ${pacotesSelecionados.length}`);
    
    if (hora && (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0)) {
      logger.debug('? Condi��es atendidas - calculando dura��o...');
      
      const duracaoTotal = calcularDuracaoTotalCompleta();
      
      logger.debug(`??  Dura��o total calculada: ${duracaoTotal} min`);
      
      if (duracaoTotal) {
        const horarioTerminoCalculado = calcularHorarioTermino(hora, duracaoTotal);
        logger.debug(`?? Hor�rio de t�rmino calculado: ${horarioTerminoCalculado}`);
        logger.debug(`?? Atualizando estado horaTermino para: ${horarioTerminoCalculado}`);
        setHoraTermino(horarioTerminoCalculado);
        logger.debug(`? Estado horaTermino atualizado!`);
      } else {
        logger.warn('??  duracaoTotal retornou NULL - sem dura��o definida');
        if (horaTermino) {
          logger.debug('?? Mantendo hor�rio de t�rmino manual');
        }
      }
    } else {
      logger.warn('? Condi��es N�O atendidas:');
      if (!hora) logger.warn('  - Hora de in�cio n�o definida');
      if (servicosSelecionados.length === 0 && pacotesSelecionados.length === 0) {
        logger.warn('  - Nenhum servi�o ou pacote selecionado');
      }
    }
    logger.debug('-------------------------------------------------------');
  }, [hora, servicosSelecionados, pacotesSelecionados, calcularDuracaoTotalCompleta, calcularHorarioTermino]);

  // Sincroniza��o com o estado de presen�a da tela de agenda
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('atualizarPresencaUsuarios', (novoEstado: Record<string, boolean>) => {
      setPresencaUsuarios(novoEstado);
      
      // Se o usu�rio selecionado foi marcado como ausente, desseleciona ele
      if (usuarioSelecionado && !novoEstado[usuarioSelecionado.id]) {
        setUsuarioSelecionado(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [usuarioSelecionado]);

  // Garantir que o loading seja resetado quando a tela for focada
  // E limpar o formul�rio quando sair da tela
  useFocusEffect(
    useCallback(() => {
      // Resetar loading ao entrar na tela
      setLoading(false);
      logger.debug('Tela de novo agendamento focada - loading resetado');
      
      // Fun��o de cleanup quando sair da tela
      return () => {
        logger.debug('Saindo da tela de novo agendamento - limpando formul�rio');
        // Limpar todos os campos
        setCliente('');
        setTelefone('');
        setData('');
        setHora('');
        setHoraTermino('');
        setServico('');
        setObservacoes('');
        setValorTotal(0);
        setClienteSelecionado(null);
        setServicosSelecionados([]);
        setUsuarioSelecionado(null);
        setCriarComandaAutomatica(true);
        setErrors({});
        setMostrarLista(false);
        setMostrarListaServicos(false);
        setClientesEncontrados([]);
        setPesquisaServico('');
        setModalVisible(false);
      };
    }, [])
  );

  const formatarHora = (texto: string) => {
    const numeros = texto.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
  };

  const validarData = (data: string) => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(data)) return false;

    const [, dia, mes, ano] = data.match(regex) || [];
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    
    return dataObj instanceof Date && !isNaN(dataObj.getTime());
  };

  const validarHora = (hora: string) => {
    const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(hora);
  };

  const carregarUsuarios = async () => {
    try {
      logger.debug('Carregando usu�rios para novo agendamento - estabelecimento:', estabelecimentoId);
      
      if (!estabelecimentoId) {
        logger.error('ID do estabelecimento n�o dispon�vel');
        return;
      }

      // Tenta usar RPC function primeiro (pode n�o existir j�)
      const { data: usuariosRpc, error: rpcError } = await supabase
        .rpc('get_usuarios_estabelecimento', { estabelecimento_uuid: estabelecimentoId });

      if (!rpcError && usuariosRpc) {
        logger.debug('? Usu�rios carregados via RPC:', usuariosRpc.length);
        logger.debug('?? Lista completa de usu�rios RPC:', JSON.stringify(usuariosRpc, null, 2));
        
        // REGRA: Profissionais veem apenas a si mesmos
        let usuariosFiltrados = usuariosRpc || [];
        if (role === 'profissional' && user?.id) {
          usuariosFiltrados = usuariosRpc.filter((u: any) => u.id === user.id);
          logger.debug('?? Profissional - mostrando apenas pr�prio usu�rio:', usuariosFiltrados);
          
          // Auto-selecionar o profissional
          if (usuariosFiltrados.length > 0) {
            setUsuarioSelecionado(usuariosFiltrados[0]);
          }
        }
        
        setUsuarios(usuariosFiltrados);
        
        // Inicializa o estado de presen�a para todos os usu�rios
        const presencaInicial = usuariosFiltrados.reduce((acc: Record<string, boolean>, usuario: any) => {
          acc[usuario.id] = true; // Por padr�o, todos est�o presentes
          return acc;
        }, {} as Record<string, boolean>);
        setPresencaUsuarios(presencaInicial);
        logger.debug('? Total de usu�rios carregados:', usuariosFiltrados.length);
        return;
      }

      logger.debug('?? Erro RPC ou dados vazios, tentando fallback...');

      logger.debug('?? Erro RPC ou dados vazios, tentando fallback...');

      // Fallback para consulta direta
      logger.debug('?? RPC n�o dispon�vel, usando consulta direta...');
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_completo');

      if (error) throw error;

      logger.debug('? Usu�rios encontrados via consulta direta:', data?.length);
      logger.debug('?? Lista completa de usu�rios (fallback):', JSON.stringify(data, null, 2));
      
      // REGRA: Profissionais veem apenas a si mesmos
      let usuariosFiltrados = data || [];
      if (role === 'profissional' && user?.id) {
        usuariosFiltrados = data?.filter((u: any) => u.id === user.id) || [];
        logger.debug('?? Profissional - mostrando apenas pr�prio usu�rio:', usuariosFiltrados);
        
        // Auto-selecionar o profissional
        if (usuariosFiltrados.length > 0) {
          setUsuarioSelecionado(usuariosFiltrados[0]);
        }
      }
      
      setUsuarios(usuariosFiltrados);
      
      // Inicializa o estado de presen�a para todos os usu�rios
      const presencaInicial = usuariosFiltrados.reduce((acc, usuario) => {
        acc[usuario.id] = true; // Por padr�o, todos est�o presentes
        return acc;
      }, {} as Record<string, boolean>);
      setPresencaUsuarios(presencaInicial);
    } catch (error) {
      logger.error('Erro ao carregar usu�rios:', error);
      Alert.alert('Erro', 'N�o foi poss�vel carregar a lista de usu�rios');
    }
  };

  const carregarServicos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('servicos')
        .select(`
          *,
          categoria:categorias_servicos(nome)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      
      setTodosServicos(data || []);
      setServicosEncontrados(data || []);
    } catch (error) {
      logger.error('Erro ao carregar servi�os:', error);
    }
  };

  const carregarPacotes = async () => {
    try {
      logger.debug('Iniciando carregamento de pacotes...', { estabelecimentoId });
      
      if (!estabelecimentoId) {
        logger.warn('estabelecimentoId n�o dispon�vel para carregar pacotes');
        return;
      }
      
      setBuscandoPacotes(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('Usu�rio n�o autenticado');
        return;
      }

      logger.debug('Executando query de pacotes...');
      const { data, error } = await supabase
        .from('pacotes')
        .select(`
          *,
          servicos:pacotes_servicos(
            quantidade,
            servico:servicos(
              id,
              nome,
              preco,
              duracao
            )
          ),
          produtos:pacotes_produtos(
            quantidade,
            produto:produtos(
              id,
              nome,
              preco
            )
          )
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) {
        logger.error('Erro na query de pacotes:', error);
        throw error;
      }
      
      // Calcular duracao_total para cada pacote se n�o existir
      const pacotesComDuracao = (data || []).map(pacote => {
        logger.debug(`\n?? Processando pacote: "${pacote.nome}"`);
        logger.debug(`   duracao_total do banco: ${pacote.duracao_total}`);
        logger.debug(`   Tem servicos? ${!!pacote.servicos} (${pacote.servicos?.length || 0} itens)`);
        
        if (!pacote.duracao_total && pacote.servicos) {
          // Calcular dura��o total somando os servi�os
          const duracaoCalculada = pacote.servicos.reduce((total: number, item: any) => {
            const duracao = item.servico?.duracao || 0;
            const quantidade = item.quantidade || 1;
            const subtotal = duracao * quantidade;
            logger.debug(`   - Servi�o "${item.servico?.nome}": ${duracao} min x ${quantidade} = ${subtotal} min`);
            return total + subtotal;
          }, 0);
          
          logger.debug(`   ? Dura��o CALCULADA: ${duracaoCalculada} min`);
          
          return {
            ...pacote,
            duracao_total: duracaoCalculada > 0 ? duracaoCalculada : undefined
          };
        }
        
        logger.debug(`   ??  Usando duracao_total do banco: ${pacote.duracao_total} min`);
        return pacote;
      });
      
      logger.debug('Pacotes carregados com sucesso:', { 
        quantidade: pacotesComDuracao.length,
        pacotes: pacotesComDuracao 
      });
      
      setTodosPacotes(pacotesComDuracao);
    } catch (error) {
      logger.error('Erro ao carregar pacotes:', error);
      Alert.alert('Erro', 'N�o foi poss�vel carregar os pacotes');
    } finally {
      setBuscandoPacotes(false);
    }
  };

  const carregarBloqueios = async () => {
    try {
      // Carregar dias da semana bloqueados
      const { data: diasData, error: diasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'dias_semana_bloqueados');
        
      if (diasError) throw diasError;
      
      if (diasData && diasData.length > 0 && diasData[0].valor) {
        setDiasSemanaBloqueados(JSON.parse(diasData[0].valor));
      }
      
      // Carregar datas espec�ficas bloqueadas
      const { data: datasData, error: datasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'datas_bloqueadas');
        
      if (datasError) throw datasError;
      
      if (datasData && datasData.length > 0 && datasData[0].valor) {
        setDatasBloqueadas(JSON.parse(datasData[0].valor));
      }
      
      // Carregar limite de agendamentos simult�neos
      const { data: limiteData, error: limiteError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'limite_simultaneos');
        
      if (limiteError) throw limiteError;
      
      if (limiteData && limiteData.length > 0 && limiteData[0].valor) {
        setLimiteSimultaneos(limiteData[0].valor);
      }
      
    } catch (error) {
      logger.error('Erro ao carregar configura��es:', error);
    }
  };

  // Fun��o para verificar se uma data est� bloqueada
  const isDataBloqueada = (dataStr: string) => {
    try {
      const dataParts = dataStr.split('/');
      if (dataParts.length !== 3) return false;
      
      const dia = parseInt(dataParts[0]);
      const mes = parseInt(dataParts[1]) - 1;
      const ano = parseInt(dataParts[2]);
      
      const data = new Date(ano, mes, dia);
      
      // Verifica se o dia da semana est� bloqueado
      const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      if (diasSemanaBloqueados.includes(diaSemana)) {
        return true;
      }
      
      // Verifica se a data espec�fica est� bloqueada
      const formattedDate = format(data, 'yyyy-MM-dd');
      return datasBloqueadas.includes(formattedDate);
    } catch (error) {
      logger.error('Erro ao verificar data bloqueada:', error);
      return false;
    }
  };

  const validarFormulario = () => {
    const novosErros: {[key: string]: string} = {};

    if (!cliente.trim()) {
      novosErros.cliente = 'Nome do cliente � obrigat�rio';
    }

    if (!telefone.trim()) {
      novosErros.telefone = 'Telefone � obrigat�rio';
    } else if (telefone.replace(/\D/g, '').length < 10) {
      novosErros.telefone = 'Telefone inv�lido';
    }

    if (!data.trim()) {
      novosErros.data = 'Data � obrigat�ria';
    } else if (!validarData(data)) {
      novosErros.data = 'Data inv�lida';
    } else if (isDataBloqueada(data)) {
      novosErros.data = 'Esta data est� bloqueada para agendamentos';
    }

    if (!hora.trim()) {
      novosErros.hora = 'Hora � obrigat�ria';
    } else if (!validarHora(hora)) {
      novosErros.hora = 'Hora inv�lida';
    }

    if (!horaTermino.trim()) {
      novosErros.horaTermino = 'Hor�rio de t�rmino � obrigat�rio';
    } else if (!validarHora(horaTermino)) {
      novosErros.horaTermino = 'Hor�rio de t�rmino inv�lido';
    } else if (hora && horaTermino) {
      // Validar que t�rmino seja ap�s in�cio
      const [horaIni, minIni] = hora.split(':').map(Number);
      const [horaTerm, minTerm] = horaTermino.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;
      const minutosTermino = horaTerm * 60 + minTerm;
      
      if (minutosTermino <= minutosInicio) {
        novosErros.horaTermino = 'Hor�rio de t�rmino deve ser ap�s o in�cio';
      }
    }

    if (!usuarioSelecionado) {
      novosErros.usuario = 'Selecione um profissional';
    }

    // Remover valida��o obrigat�ria de servi�os
    // if (servicosSelecionados.length === 0) {
    //   novosErros.servico = 'Selecione pelo menos um servi�o';
    // }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvarAgendamento = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usu�rio n�o autenticado');
        return;
      }

      const [dia, mes, ano] = data.split('/');
      const [hora_agendamento, minuto] = hora.split(':');
      
      // ?? CORRE��O: Criar data/hora SEM convers�o de timezone
      // Usar formato ISO local ao inv�s de UTC
      const anoInt = parseInt(ano);
      const mesInt = parseInt(mes) - 1; // JavaScript: m�s come�a em 0
      const diaInt = parseInt(dia);
      const horaInt = parseInt(hora_agendamento);
      const minInt = parseInt(minuto);
      
      logger.debug(`?? Criando agendamento:`);
      logger.debug(`   Data: ${diaInt}/${mesInt + 1}/${anoInt}`);
      logger.debug(`   Hora: ${horaInt}:${minInt}`);
      
      // ?? CORRE��O: Criar string ISO com offset de timezone local usando fun��o utilit�ria
      const dataHoraLocal = createLocalISOString(anoInt, mesInt + 1, diaInt, horaInt, minInt);
      
      logger.debug(`   ISO Local com offset: ${dataHoraLocal}`);
      
      // Criar objeto Date para compara��es
      const dataHoraAgendamento = new Date(anoInt, mesInt, diaInt, horaInt, minInt);

      // Buscar agendamentos para o mesmo hor�rio usando timezone local
      const dataInicio = new Date(anoInt, mesInt, diaInt, horaInt, minInt - 15);
      const dataFim = new Date(anoInt, mesInt, diaInt, horaInt, minInt + 15);
      
      const { data: agendamentosExistentes, error: erroConsulta } = await supabase
        .from('agendamentos')
        .select('id, data_hora, cliente')
        .gte('data_hora', toISOStringWithTimezone(dataInicio))
        .lte('data_hora', toISOStringWithTimezone(dataFim));
        
      if (erroConsulta) throw erroConsulta;

      logger.debug(`Encontrados ${agendamentosExistentes?.length || 0} agendamentos no mesmo hor�rio`);

      // Verificar se atingiu o limite
      const limiteTotal = parseInt(limiteSimultaneos || '1');
      if (agendamentosExistentes && agendamentosExistentes.length >= limiteTotal) {
        Alert.alert(
          'Hor�rio Indispon�vel', 
          `Este hor�rio j� atingiu o limite de ${limiteTotal} agendamento(s) simult�neo(s).\n\nJ� agendado para: ${
            agendamentosExistentes.map(a => a.cliente).join(', ')
          }`
        );
        setLoading(false);
        return;
      }

      // Preparar os detalhes dos servi�os (incluir servi�os avulsos + servi�os dos pacotes)
      let detalhesServicos = servicosSelecionados.map(s => ({
        nome: s.nome,
        quantidade: s.quantidade,
        preco: s.preco,
        servico_id: s.id
      }));

      // Adicionar servi�os dos pacotes selecionados
      pacotesSelecionados.forEach(pacote => {
        if (pacote.servicos && Array.isArray(pacote.servicos)) {
          pacote.servicos.forEach((servicoPacote: any) => {
            detalhesServicos.push({
              nome: servicoPacote.servico?.nome || servicoPacote.nome || 'Servi�o do pacote',
              quantidade: 1,
              preco: 0, // Pre�o j� est� no valor do pacote
              servico_id: servicoPacote.servico_id
            });
          });
        }
      });

      const valorTotalAgendamento = servicosSelecionados.length > 0 
        ? servicosSelecionados.reduce((total, s) => total + (s.preco * s.quantidade), 0)
        : 0;
      
      const valorTotalPacotes = pacotesSelecionados.reduce((total, p) => total + (p.valor || 0), 0);
      const valorTotalFinal = valorTotalAgendamento + valorTotalPacotes;

      // Preparar hor�rio de t�rmino no formato TIME (HH:MM:SS)
      let horarioTerminoFormatado = null;
      if (horaTermino) {
        horarioTerminoFormatado = `${horaTermino}:00`; // Adiciona segundos ao formato HH:MM
        logger.debug(`   Hor�rio T�rmino: ${horarioTerminoFormatado}`);
      }

      logger.debug(`\n?? ========== SALVANDO NO BANCO [C�DIGO NOVO v2.0] ==========`);
      logger.debug(`   ? data_hora COM TIMEZONE: ${dataHoraLocal}`);
      logger.debug(`   ? horario_termino: ${horarioTerminoFormatado}`);
      logger.debug(`   ?? Usando createLocalISOString() - C�DIGO ATUALIZADO!`);

      const { error } = await supabase
        .from('agendamentos')
        .insert({
          cliente,
          telefone: telefone.replace(/\D/g, ''),
          data_hora: dataHoraLocal, // ?? Usar string ISO local ao inv�s de toISOString()
          horario_termino: horarioTerminoFormatado,
          servicos: detalhesServicos,
          valor_total: valorTotalFinal, // Valor total incluindo servi�os + pacotes
          observacoes: observacoes.trim() || null,
          estabelecimento_id: estabelecimentoId,
          status: 'agendado',
          usuario_id: usuarioSelecionado?.id || null,
          criar_comanda_automatica: criarComandaAutomatica
        });

      if (error) throw error;

      // Limpar cache de agendamentos
      await CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS);

      // Emitir evento para que a tela de agenda recarregue
      DeviceEventEmitter.emit('atualizarAgendamentos');
      
      // Emitir evento de agendamento criado com sucesso
      DeviceEventEmitter.emit('agendamentoCriado', `Agendamento para ${cliente} criado com sucesso!`);
      
      Alert.alert(
        'Sucesso', 
        'Agendamento criado com sucesso!',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Limpar todos os campos
            limparFormulario();
            // Navegar para a tela de agenda
            router.push('/(app)/agenda');
          }
        }]
      );
    } catch (error) {
      logger.error('Erro ao criar agendamento:', error);
      Alert.alert('Erro', 'N�o foi poss�vel criar o agendamento');
    } finally {
      // Sempre resetar loading, independente de sucesso ou erro
      setLoading(false);
    }
  };

  // Atualizar a fun��o limparFormulario
  const limparFormulario = () => {
    // Limpar campos de texto
    setCliente('');
    setTelefone('');
    setData('');
    setHora('');
    setHoraTermino('');
    setServico('');
    setObservacoes('');
    setValorTotal(0);
    
    // Limpar sele��es
    setClienteSelecionado(null);
    setServicosSelecionados([]);
    setPacotesSelecionados([]);
    setUsuarioSelecionado(null);
    
    // Resetar flags
    setCriarComandaAutomatica(true); // Voltar ao padr�o
    
    // Limpar erros
    setErrors({});
    
    // Resetar estados de UI
    setMostrarLista(false);
    setMostrarListaServicos(false);
    setMostrarListaUsuarios(false);
    setMostrarSeletorHorario(false);
    setMostrarSeletorHorarioTermino(false);
    setModalVisible(false);
    setModalPacotesVisible(false);
    
    // Resetar listas de resultados
    setClientesEncontrados([]);
    setPesquisaServico('');
    setPesquisaPacote('');
    
    // Resetar data
    setDateValue(new Date());
    
    // Resetar hor�rios dispon�veis
    atualizarHorariosDisponiveis();
    
    // Resetar loading (importante para destravar o bot�o)
    setLoading(false);
    
    logger.debug('Formul�rio limpo com sucesso');
  };

  const buscarClientes = async (nome: string) => {
    setCliente(nome);
    
    if (!nome.trim()) {
      setClientesEncontrados([]);
      setMostrarLista(false);
      return;
    }

    try {
      setBuscandoClientes(true);
      setMostrarLista(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nome', `%${nome}%`)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome')
        .limit(10);

      if (error) throw error;
      
      setClientesEncontrados(data || []);
      setMostrarLista(true);
      logger.debug('Clientes encontrados:', data?.length || 0);
    } catch (error) {
      logger.error('Erro ao buscar clientes:', error);
      setMostrarLista(false);
    } finally {
      setBuscandoClientes(false);
    }
  };

  const handleSelecionarCliente = (clienteSelecionado: Cliente) => {
    setClienteSelecionado(clienteSelecionado);
    setCliente(clienteSelecionado.nome);
    setTelefone(clienteSelecionado.telefone);
    setMostrarLista(false);
    setErrors({ ...errors, cliente: '', telefone: '' });
  };

  const handleLimparCliente = () => {
    setClienteSelecionado(null);
    setCliente('');
    setTelefone('');
    setMostrarLista(false);
  };

  const handleCadastrarCliente = () => {
  router.push('/(app)/clientes/novo');
  };

  const buscarServicos = (nome: string) => {
    if (!nome.trim()) {
      setServicosEncontrados(todosServicos);
      return;
    }

    const resultados = todosServicos.filter(servico => 
      servico.nome.toLowerCase().includes(nome.toLowerCase())
    );
    setServicosEncontrados(resultados);
  };

  const handleSelecionarServico = (servico: Servico) => {
    const jaExiste = servicosSelecionados.find(s => s.id === servico.id);
    
    if (!jaExiste) {
      setServicosSelecionados([...servicosSelecionados, { ...servico, quantidade: 1 }]);
    }
  };

  const handleQuantidade = (servicoId: string, acao: 'aumentar' | 'diminuir') => {
    setServicosSelecionados(prevServicos => 
      prevServicos.map(servico => {
        if (servico.id === servicoId) {
          const novaQuantidade = acao === 'aumentar' 
            ? servico.quantidade + 1 
            : Math.max(1, servico.quantidade - 1);
          return { ...servico, quantidade: novaQuantidade };
        }
        return servico;
      })
    );
  };

  const handleRemoverServico = (servicoId: string) => {
    setServicosSelecionados(prevServicos => 
      prevServicos.filter(servico => servico.id !== servicoId)
    );
  };

  const atualizarServicosSelecionados = () => {
    // Calcula valor total combinando servi�os e pacotes
    const totalServicos = servicosSelecionados.reduce(
      (sum, s) => sum + (s.preco * s.quantidade), 
      0
    );
    
    const totalPacotes = pacotesSelecionados.reduce(
      (sum, p) => sum + (p.valor * p.quantidade), 
      0
    );
    
    const total = totalServicos + totalPacotes;
    setValorTotal(total);
    
    // Limpa erro de servi�o se houver algo selecionado
    if (servicosSelecionados.length > 0 || pacotesSelecionados.length > 0) {
      setErrors(prev => ({ ...prev, servico: '' }));
    }
  };

  // Fun��es para manipula��o de pacotes
  const buscarPacotes = (nome: string) => {
    setPesquisaPacote(nome);
  };

  const handleSelecionarPacote = (pacote: Pacote) => {
    const jaExiste = pacotesSelecionados.find(p => p.id === pacote.id);
    
    if (!jaExiste) {
      logger.debug('-------------------------------------------------------');
      logger.debug(`?? PACOTE SELECIONADO: "${pacote.nome}"`);
      logger.debug(`?? Dados do pacote:`, JSON.stringify(pacote, null, 2));
      logger.debug(`??  duracao_total: ${pacote.duracao_total} min`);
      logger.debug(`?? Quantidade: 1`);
      logger.debug(`?? Hor�rio de in�cio atual: ${hora}`);
      logger.debug('-------------------------------------------------------');
      
      setPacotesSelecionados([...pacotesSelecionados, { ...pacote, quantidade: 1 }]);
    }
  };

  const handleQuantidadePacote = (pacoteId: string, acao: 'aumentar' | 'diminuir') => {
    setPacotesSelecionados(prevPacotes => 
      prevPacotes.map(pacote => {
        if (pacote.id === pacoteId) {
          const novaQuantidade = acao === 'aumentar' 
            ? pacote.quantidade + 1 
            : Math.max(1, pacote.quantidade - 1);
          return { ...pacote, quantidade: novaQuantidade };
        }
        return pacote;
      })
    );
  };

  const handleRemoverPacote = (pacoteId: string) => {
    setPacotesSelecionados(prevPacotes => 
      prevPacotes.filter(pacote => pacote.id !== pacoteId)
    );
  };

  const atualizarPacotesSelecionados = () => {
    // Esta fun��o agora apenas dispara a atualiza��o
    // O c�lculo real � feito em atualizarServicosSelecionados
    atualizarServicosSelecionados();
  };

  useEffect(() => {
    atualizarServicosSelecionados();
  }, [servicosSelecionados]);

  useEffect(() => {
    atualizarPacotesSelecionados();
    logger.debug(`?? pacotesSelecionados mudou (${pacotesSelecionados.length} itens)`);
  }, [pacotesSelecionados]);

  useEffect(() => {
    if (modalVisible) {
      carregarServicos();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (modalPacotesVisible) {
      carregarPacotes();
    }
  }, [modalPacotesVisible]);

  useEffect(() => {
    carregarUsuarios();
    carregarServicos();
    carregarPacotes();
    carregarBloqueios();
  }, []);

  // Debug: Monitorar mudan�as no estado horaTermino
  useEffect(() => {
    logger.debug(`?? [MONITOR] horaTermino mudou para: "${horaTermino}"`);
  }, [horaTermino]);

  // Adicionar fun��o para carregar configura��es de hor�rios
  const carregarConfiguracoesHorarios = async () => {
    try {
      // Obter o usu�rio atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('Usu�rio n�o autenticado ao carregar configura��es de hor�rios');
        inicializarHorariosPadrao();
        return;
      }
      
      // Carregar configura��es de hor�rios
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', [
          'horario_inicio', 
          'horario_intervalo_inicio', 
          'horario_intervalo_fim',
          'horario_fim',
          'intervalo_agendamentos'
        ])
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (error) {
        logger.error('Erro ao carregar configura��es de hor�rios:', error);
        inicializarHorariosPadrao();
        return;
      }
      
      let foiAtualizado = false;
      
      // Mapear os valores das configura��es para os estados
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
          }
        });
      }
      
      // Se n�o houve atualiza��o, inicializar com valores padr�o
      if (!foiAtualizado) {
        inicializarHorariosPadrao();
      } else {
        // Atualizar a lista de hor�rios dispon�veis
        atualizarHorariosDisponiveis();
      }
    } catch (error) {
      logger.error('Erro ao carregar configura��es de hor�rios:', error);
      inicializarHorariosPadrao();
    }
  };

  // Fun��o para inicializar hor�rios com valores padr�o
  const inicializarHorariosPadrao = () => {
    setHorarioInicio('08:00');
    setHorarioFim('18:00');
    setIntervaloAgendamentos('30');
    setTemIntervalo(false);
    
    // Gerar hor�rios dispon�veis com valores padr�o
    const horariosIniciais = gerarHorarios('08:00', '18:00', 30, false, '', '');
    setHorariosDisponiveis(horariosIniciais.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
  };

  // Fun��o para converter hora no formato "HH:MM" para minutos
  const converterHoraParaMinutos = (hora: string) => {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  };

  // Fun��o para converter minutos para hora no formato "HH:MM"
  const converterMinutosParaHora = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Fun��o para gerar lista de hor�rios dispon�veis
  const gerarHorarios = (inicio: string, fim: string, intervalo: number, temIntervalo: boolean, intervaloInicio: string, intervaloFim: string) => {
    try {
      const inicioMinutos = converterHoraParaMinutos(inicio);
      const fimMinutos = converterHoraParaMinutos(fim);
      
      let intervaloInicioMinutos = -1;
      let intervaloFimMinutos = -1;
      
      if (temIntervalo && intervaloInicio && intervaloFim) {
        intervaloInicioMinutos = converterHoraParaMinutos(intervaloInicio);
        intervaloFimMinutos = converterHoraParaMinutos(intervaloFim);
      }
      
      const horarios: string[] = [];
      
      // Verificar se a data selecionada � hoje
      const hoje = new Date();
      let horaAtualMinutos = -1;
      
      if (data && validarData(data)) {
        const [dia, mes, ano] = data.split('/');
        const dataSelecionada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        
        // Comparar apenas a data (sem hora)
        const ehHoje = dataSelecionada.getDate() === hoje.getDate() &&
                       dataSelecionada.getMonth() === hoje.getMonth() &&
                       dataSelecionada.getFullYear() === hoje.getFullYear();
        
        if (ehHoje) {
          // Arredondar para o pr�ximo intervalo
          const horaAtual = hoje.getHours();
          const minutoAtual = hoje.getMinutes();
          horaAtualMinutos = horaAtual * 60 + minutoAtual;
          
          // Arredondar para o pr�ximo m�ltiplo do intervalo
          horaAtualMinutos = Math.ceil(horaAtualMinutos / intervalo) * intervalo;
          
          logger.debug(`?? Data selecionada � HOJE. Hora atual: ${horaAtual}:${minutoAtual} ? Pr�ximo hor�rio: ${converterMinutosParaHora(horaAtualMinutos)}`);
        }
      }
      
      for (let i = inicioMinutos; i < fimMinutos; i += intervalo) {
        // Pular hor�rios durante o intervalo de almo�o
        if (temIntervalo && i >= intervaloInicioMinutos && i < intervaloFimMinutos) {
          continue;
        }
        
        // Pular hor�rios que j� passaram (se for hoje)
        if (horaAtualMinutos !== -1 && i < horaAtualMinutos) {
          continue;
        }
        
        horarios.push(converterMinutosParaHora(i));
      }
      
      return horarios;
    } catch (error) {
      logger.error('Erro ao gerar hor�rios:', error);
      return [];
    }
  };

  // Fun��o para atualizar a lista de hor�rios dispon�veis
  const atualizarHorariosDisponiveis = () => {
    try {
      logger.debug('Atualizando hor�rios dispon�veis com as configura��es:');
      logger.debug(`- Hor�rio in�cio: ${horarioInicio}`);
      logger.debug(`- Hor�rio fim: ${horarioFim}`);
      logger.debug(`- Tem intervalo: ${temIntervalo}`);
      if (temIntervalo) {
        logger.debug(`- Intervalo in�cio: ${horarioIntervaloInicio}`);
        logger.debug(`- Intervalo fim: ${horarioIntervaloFim}`);
      }
      logger.debug(`- Intervalo entre agendamentos: ${intervaloAgendamentos} minutos`);
      
      const intervalo = parseInt(intervaloAgendamentos);
      const novosHorarios = gerarHorarios(
        horarioInicio, 
        horarioFim, 
        intervalo, 
        temIntervalo, 
        horarioIntervaloInicio, 
        horarioIntervaloFim
      );
      
      // Checar disponibilidade dos hor�rios (quando uma data estiver selecionada)
      if (data && validarData(data)) {
        verificarDisponibilidadeHorarios(novosHorarios);
      } else {
        setHorariosDisponiveis(novosHorarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
      }
      
      logger.debug('Lista de hor�rios atualizada:', novosHorarios.length);
      logger.debug('Hor�rios gerados:', novosHorarios.join(', '));
    } catch (error) {
      logger.error('Erro ao atualizar lista de hor�rios:', error);
      inicializarHorariosPadrao();
    }
  };

  // Fun��o para selecionar hor�rio com valida��o simples
  const selecionarHorario = (horarioSelecionado: string) => {
    try {
      // 1?? Calcular dura��o total
      const duracaoTotal = calcularDuracaoTotalCompleta();
      
      if (!duracaoTotal) {
        // Se n�o tem dura��o, apenas selecionar
        setHora(horarioSelecionado);
        setMostrarSeletorHorario(false);
        setErrors({...errors, hora: ''});
        logger.debug(`? Hor�rio ${horarioSelecionado} selecionado (sem dura��o)`);
        return;
      }

      // 2?? Calcular hor�rio de t�rmino
      const horarioTerminoCalculado = calcularHorarioTermino(horarioSelecionado, duracaoTotal);
      logger.debug(`?? Verificando per�odo: ${horarioSelecionado} at� ${horarioTerminoCalculado} (dura��o: ${duracaoTotal}min)`);

      // 3?? Converter horas para minutos para compara��o
      const [hInicio, mInicio] = horarioSelecionado.split(':').map(Number);
      const minutosInicio = hInicio * 60 + mInicio;

      const [hFim, mFim] = horarioTerminoCalculado.split(':').map(Number);
      const minutosFim = hFim * 60 + mFim;

      // 4?? Verificar se algum slot entre in�cio e fim est� ocupado
      const slotsOcupados = horariosDisponiveis.filter(slot => {
        const [h, m] = slot.horario.split(':').map(Number);
        const minutosSlot = h * 60 + m;
        
        // Verificar se este slot est� dentro do intervalo [minutosInicio, minutosFim)
        return minutosSlot >= minutosInicio && minutosSlot < minutosFim && slot.ocupado;
      });

      if (slotsOcupados.length > 0) {
        logger.error(`? Hor�rio indispon�vel! Slots ocupados: ${slotsOcupados.map(s => s.horario).join(', ')}`);
        Alert.alert(
          'Hor�rio Indispon�vel',
          `N�o � poss�vel agendar de ${horarioSelecionado} at� ${horarioTerminoCalculado} (${duracaoTotal} minutos).\n\nOs hor�rios ${slotsOcupados.map(s => s.horario).join(', ')} j� est�o ocupados.\n\nEscolha outro hor�rio ou servi�o com dura��o menor.`
        );
        return;
      }

      // 5?? Se passou na valida��o, selecionar o hor�rio
      setHora(horarioSelecionado);
      setHoraTermino(horarioTerminoCalculado);
      setMostrarSeletorHorario(false);
      setErrors({...errors, hora: ''});
      
      logger.success(`? Hor�rio ${horarioSelecionado}-${horarioTerminoCalculado} selecionado com sucesso!`);
    } catch (error) {
      logger.error('Erro ao selecionar hor�rio:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao validar o hor�rio. Tente novamente.');
    }
  };

  // Fun��o para verificar disponibilidade de hor�rios para a data selecionada
  const verificarDisponibilidadeHorarios = async (horarios: string[]) => {
    try {
      if (!data || !validarData(data)) {
        setHorariosDisponiveis(horarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
        return;
      }
      
      const [dia, mes, ano] = data.split('/');
      const dataSelecionada = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia)
      );
      
      // ?? CORRE��O: Usar timezone local para buscar agendamentos do dia
      const inicioDia = createLocalISOString(parseInt(ano), parseInt(mes), parseInt(dia), 0, 0, 0);
      const fimDia = createLocalISOString(parseInt(ano), parseInt(mes), parseInt(dia), 23, 59, 59);
      
      // Buscar agendamentos para o dia selecionado
      const { data: agendamentosDia, error } = await supabase
        .from('agendamentos')
        .select('id, data_hora, cliente, horario_termino')
        .gte('data_hora', inicioDia)
        .lte('data_hora', fimDia);
        
      if (error) {
        logger.error('Erro ao verificar disponibilidade de hor�rios:', error);
        setHorariosDisponiveis(horarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
        return;
      }
      
      logger.debug(`Encontrados ${agendamentosDia?.length || 0} agendamentos para o dia ${data}`);
      
      // Verificar disponibilidade de cada hor�rio
      const horariosComStatus = horarios.map(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        const minutosDoSlot = horas * 60 + minutos;
        
        // Contar agendamentos que OCUPAM este hor�rio
        const agendamentosNoHorario = agendamentosDia?.filter(agendamento => {
          // ?? CORRE��O: Usar parseISOStringLocal para converter UTC ? BRT corretamente
          const dataParsada = parseISOStringLocal(agendamento.data_hora);
          const horaInicio = dataParsada.getHours();
          const minutoInicio = dataParsada.getMinutes();
          const minutosInicio = horaInicio * 60 + minutoInicio;
          
          // Calcular minutos de t�rmino
          let minutosTermino = 0;
          if (agendamento.horario_termino) {
            const [hTerm, mTerm] = agendamento.horario_termino.split(':').map(Number);
            minutosTermino = hTerm * 60 + mTerm;
          } else {
            // Se n�o tem t�rmino, assume que ocupa pelo menos o hor�rio atual
            minutosTermino = minutosInicio + 15;
          }
          
          // Se atravessa meia-noite (ex: 23:00 at� 01:00)
          if (minutosTermino < minutosInicio) {
            minutosTermino += 24 * 60;
          }
          
          // Verificar se este slot est� dentro do intervalo do agendamento
          // O agendamento ocupa todos os 15min a partir da hora de in�cio at� (mas n�o incluindo) a hora de t�rmino
          return minutosDoSlot >= minutosInicio && minutosDoSlot < minutosTermino;
        });
        
        const quantidade = agendamentosNoHorario?.length || 0;
        const limite = parseInt(limiteSimultaneos);
        const ocupado = quantidade >= limite;
        
        return {
          horario,
          ocupado,
          quantidade
        };
      });
      
      setHorariosDisponiveis(horariosComStatus);
      
      // Se o hor�rio atual n�o est� dispon�vel, limpar a sele��o
      if (hora) {
        const horarioAtual = horariosComStatus.find(h => h.horario === hora);
        if (horarioAtual?.ocupado) {
          setHora('');
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar disponibilidade de hor�rios:', error);
      setHorariosDisponiveis(horarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
    }
  };

  // Atualizar useEffect para carregar configura��es de hor�rios
  useEffect(() => {
    carregarUsuarios();
    carregarServicos();
    carregarBloqueios();
    carregarConfiguracoesHorarios();
  }, []);

  // Adicionar useEffect para atualizar hor�rios quando a data mudar
  useEffect(() => {
    if (data && validarData(data)) {
      atualizarHorariosDisponiveis();
    }
  }, [data]);

  // Extrair uma fun��o para verificar se h� dados preenchidos
  const temDadosPreenchidos = () => 
    cliente.trim() !== '' || 
    telefone.trim() !== '' || 
    data.trim() !== '' || 
    hora.trim() !== '' || 
    servicosSelecionados.length > 0 ||
    observacoes.trim() !== '';

  // Fun��o para confirmar se o usu�rio quer descartar as altera��es
  const confirmarDescarte = () => {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Descartar altera��es',
        'Voc� tem dados n�o salvos. Deseja descartar as altera��es?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              limparFormulario();
              resolve(true);
            }
          }
        ]
      );
    });
  };

  // Modificar o useEffect que trata o bot�o de voltar
  useEffect(() => {
    // Adicionar um listener para o evento de hardware back (Android)
    const backHandler = () => {
      if (temDadosPreenchidos()) {
        confirmarDescarte().then((descartar) => {
          if (descartar) {
            router.push('/(app)/agenda');
          }
        });
        return true;
      }
      return false;
    };
    
    // Adicionar o handler para o bot�o voltar no Android
    const backSubscription = BackHandler && BackHandler.addEventListener('hardwareBackPress', backHandler);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      backSubscription && backSubscription.remove();
    };
  }, [cliente, telefone, data, hora, servicosSelecionados, observacoes]);

  // Modificar o handleFecharModal para fechar o modal e aplicar servi�os
  const handleFecharModal = (confirmar?: boolean) => {
    if (confirmar === false) {
      // Cancelar - limpar sele��es e fechar modal
      setServicosSelecionados([]);
      setModalVisible(false);
    } else if (confirmar === true) {
      // Adicionar - manter sele��es e fechar modal
      setModalVisible(false);
    } else {
      // Fechar modal sem par�metro - apenas fechar
      setModalVisible(false);
    }
    setMostrarSeletorHorario(false);
  };

  const renderError = (field: string) => {
    if (errors[field]) {
      return <Text style={styles.errorText}>{errors[field]}</Text>;
    }
    return null;
  };

  const abrirModal = () => {
    setModalVisible(true);
    Animated.spring(translateYServicos, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const abrirModalPacotes = () => {
    setModalPacotesVisible(true);
    Animated.spring(translateYPacotes, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const fecharModalComAnimacao = () => {
    Animated.timing(translateYServicos, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      translateYServicos.setValue(500);
    });
  };

  const fecharModalPacotesComAnimacao = () => {
    Animated.timing(translateYPacotes, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalPacotesVisible(false);
      translateYPacotes.setValue(500);
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateValue(selectedDate);
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      setData(formattedDate);
      
      // Verifica se a data selecionada est� bloqueada
      if (isDataBloqueada(formattedDate)) {
        setErrors({ ...errors, data: 'Esta data est� bloqueada para agendamentos' });
        Alert.alert('Data Bloqueada', 'Esta data n�o est� dispon�vel para agendamentos.');
      } else {
        setErrors({ ...errors, data: '' });
        // Atualiza os hor�rios dispon�veis para a nova data
        setTimeout(() => {
          const intervalo = parseInt(intervaloAgendamentos);
          const novosHorarios = gerarHorarios(
            horarioInicio, 
            horarioFim, 
            intervalo, 
            temIntervalo, 
            horarioIntervaloInicio, 
            horarioIntervaloFim
          );
          verificarDisponibilidadeHorarios(novosHorarios);
        }, 100);
      }
    }
  };

  const abrirSeletorData = () => {
    logger.debug('??? [NOVO AGENDAMENTO] Abrindo seletor de data, Platform.OS =', Platform.OS);
    setShowDatePicker(true);
  };

  const handleSelecionarUsuario = (usuario: Usuario) => {
    if (presencaUsuarios[usuario.id]) {
      setUsuarioSelecionado(usuario);
      setMostrarListaUsuarios(false);
      setErrors(prev => ({ ...prev, usuario: '' }));
    }
  };

  const handleOpenUsuarioModal = () => {
    setMostrarListaUsuarios(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.formContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informa��es do Cliente</Text>
          
          <View style={styles.clienteContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Cliente *</Text>
              <View style={styles.inputContainer}>
                {clienteSelecionado && clienteSelecionado.foto_url ? (
                  <Image 
                    source={{ uri: clienteSelecionado.foto_url }} 
                    style={styles.clienteFoto}
                  />
                ) : clienteSelecionado ? (
                  <View style={styles.clienteFotoPlaceholder}>
                    <FontAwesome5 name="user" size={12} color={colors.primary} />
                  </View>
                ) : (
                  <FontAwesome5 name="user" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                )}
                <TextInput
                  label=""
                  value={cliente}
                  onChangeText={buscarClientes}
                  mode="flat"
                  style={[styles.input, clienteSelecionado ? styles.inputWithFoto : null]}
                  error={!!errors.cliente}
                  right={
                    clienteSelecionado ? (
                      <TextInput.Icon
                        icon="close"
                        onPress={handleLimparCliente}
                      />
                    ) : null
                  }
                  placeholder="Digite o nome do cliente"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {renderError('cliente')}
            </View>

            {mostrarLista && (
              <View style={styles.sugestoesList}>
                {buscandoClientes ? (
                  <View style={styles.listLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.listLoadingText}>Buscando clientes...</Text>
                  </View>
                ) : clientesEncontrados.length > 0 ? (
                  clientesEncontrados.map((cliente) => (
                    <TouchableOpacity
                      key={cliente.id}
                      style={styles.sugestaoItem}
                      onPress={() => handleSelecionarCliente(cliente)}
                    >
                      <View style={styles.sugestaoItemContent}>
                        {cliente.foto_url ? (
                          <Image 
                            source={{ uri: cliente.foto_url }} 
                            style={styles.sugestaoFoto} 
                          />
                        ) : (
                          <View style={styles.sugestaoFotoPlaceholder}>
                            <FontAwesome5 name="user" size={16} color={colors.primary} />
                          </View>
                        )}
                        <View style={styles.sugestaoInfo}>
                          <Text style={styles.sugestaoNome}>{cliente.nome}</Text>
                          <Text style={styles.sugestaoTelefone}>{cliente.telefone}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.semResultados}>
                    <Text style={styles.semResultadosText}>Nenhum cliente encontrado</Text>
                    <TouchableOpacity
                      style={styles.botaoCadastrar}
                      onPress={handleCadastrarCliente}
                    >
                      <FontAwesome5 name="user-plus" size={16} color={colors.white} style={styles.botaoCadastrarIcon} />
                      <Text style={styles.botaoCadastrarText}>Cadastrar Novo Cliente</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="phone" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                <MaskInput
                  style={styles.input}
                  value={telefone}
                  onChangeText={(text) => {
                    setTelefone(formatarTelefoneInput(text));
                    setErrors({ ...errors, telefone: '' });
                  }}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={15}
                />
              </View>
              {renderError('telefone')}
            </View>
          </View>
        </View>

        {/* Se��o Profissional - oculta para profissionais (j� est� auto-selecionado) */}
        {role !== 'profissional' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profissional</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Selecione o Profissional *</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.select,
                  errors.usuario ? styles.inputError : null,
                ]}
                onPress={handleOpenUsuarioModal}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {usuarioSelecionado && usuarioSelecionado.avatar_url ? (
                    <Image 
                      source={{ uri: usuarioSelecionado.avatar_url }} 
                      style={styles.clienteFoto}
                    />
                  ) : usuarioSelecionado ? (
                    <View style={styles.clienteFotoPlaceholder}>
                      <FontAwesome5 name="user" size={12} color={colors.primary} />
                    </View>
                  ) : null}
                  <Text style={[styles.selectText, !usuarioSelecionado && styles.placeholder]}>
                    {usuarioSelecionado ? usuarioSelecionado.nome_completo : 'Selecione um Profissional'}
                  </Text>
              </View>
              <FontAwesome5 name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {errors.usuario && (
              <Text style={styles.errorText}>{errors.usuario}</Text>
            )}
          </View>

          {mostrarListaUsuarios && (
            <View style={styles.sugestoesList}>
              {usuarios
                .filter(usuario => presencaUsuarios[usuario.id])
                .map((usuario) => (
                  <TouchableOpacity
                    key={usuario.id}
                    style={styles.sugestaoItem}
                    onPress={() => handleSelecionarUsuario(usuario)}
                  >
                    <View style={styles.sugestaoItemContent}>
                      {usuario.avatar_url ? (
                        <Image 
                          source={{ uri: usuario.avatar_url }} 
                          style={styles.sugestaoFoto} 
                        />
                      ) : (
                        <View style={styles.sugestaoFotoPlaceholder}>
                          <FontAwesome5 name="user" size={16} color={colors.primary} />
                        </View>
                      )}
                      <Text style={styles.sugestaoNome}>{usuario.nome_completo}</Text>
                    </View>
                    {usuarioSelecionado?.id === usuario.id && (
                      <FontAwesome5 name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Agendamento</Text>

          {/* CAMPO DE SERVI�O/PACOTE - MOVIDO PARA CIMA DA DATA */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Servi�os / Pacotes *</Text>
            <View style={styles.servicoPacoteContainer}>
              <TouchableOpacity
                style={[
                  styles.servicoButton,
                  styles.servicoButtonMetade,
                  servicosSelecionados.length > 0 ? styles.servicoButtonSelecionado : null
                ]}
                onPress={abrirModal}
              >
                <View style={styles.servicoButtonContent}>
                  <FontAwesome5 
                    name="cut" 
                    size={16} 
                    color={servicosSelecionados.length > 0 ? colors.primary : colors.textSecondary} 
                    style={styles.servicoIcon} 
                  />
                  <Text 
                    style={[
                      styles.servicoButtonText,
                      servicosSelecionados.length > 0 ? styles.servicoButtonTextSelecionado : null
                    ]}
                  >
                    {servicosSelecionados.length > 0 
                      ? `Servi�os (${servicosSelecionados.length})` 
                      : 'Servi�os'}
                  </Text>
                </View>
                {servicosSelecionados.length > 0 && (
                  <Text style={styles.servicoPrecoButton}>
                    R$ {servicosSelecionados.reduce((sum, s) => sum + (s.preco * s.quantidade), 0).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.servicoButton,
                  styles.servicoButtonMetade,
                  styles.pacoteButton,
                  pacotesSelecionados.length > 0 && styles.servicoButtonSelecionado
                ]}
                onPress={abrirModalPacotes}
              >
                <View style={styles.servicoButtonContent}>
                  <FontAwesome5 
                    name="box" 
                    size={16} 
                    color={pacotesSelecionados.length > 0 ? colors.primary : colors.textSecondary} 
                    style={styles.servicoIcon} 
                  />
                  <Text style={[
                    styles.servicoButtonText,
                    pacotesSelecionados.length > 0 ? styles.servicoButtonTextSelecionado : null
                  ]}>
                    {pacotesSelecionados.length > 0 
                      ? `Pacotes (${pacotesSelecionados.length})` 
                      : 'Pacotes'}
                  </Text>
                </View>
                {pacotesSelecionados.length > 0 && (
                  <Text style={styles.servicoPrecoButton}>
                    R$ {pacotesSelecionados.reduce((sum, p) => sum + (p.valor * p.quantidade), 0).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {renderError('servico')}
            {servicosSelecionados.length === 0 && pacotesSelecionados.length === 0 && (
              <Text style={styles.inputHelper}>
                ?? Selecione um servi�o ou pacote antes de escolher a data
              </Text>
            )}
            
            {/* Mostra os itens selecionados */}
            {servicosSelecionados.length > 0 && (
              <View style={styles.itensSelecionadosContainer}>
                <Text style={styles.itensSelecionadosLabel}>Servi�os:</Text>
                {servicosSelecionados.map(s => (
                  <Text key={s.id} style={styles.itemSelecionadoTexto}>
                    � {s.nome} ({s.quantidade}x) - R$ {(s.preco * s.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                ))}
              </View>
            )}
            
            {pacotesSelecionados.length > 0 && (
              <View style={styles.itensSelecionadosContainer}>
                <Text style={styles.itensSelecionadosLabel}>Pacotes:</Text>
                {pacotesSelecionados.map(p => (
                  <Text key={p.id} style={styles.itemSelecionadoTexto}>
                    � {p.nome} ({p.quantidade}x) - R$ {(p.valor * p.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                ))}
              </View>
            )}
            
            {(servicosSelecionados.length > 0 || pacotesSelecionados.length > 0) && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Valor Total:</Text>
                <Text style={styles.totalValor}>
                  R$ {(
                    servicosSelecionados.reduce((sum, s) => sum + (s.preco * s.quantidade), 0) +
                    pacotesSelecionados.reduce((sum, p) => sum + (p.valor * p.quantidade), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity
              style={[
                styles.input,
                errors.data ? styles.inputError : null,
                data ? styles.inputPreenchido : null,
                isDataBloqueada(data) ? styles.inputBloqueado : null,
                (servicosSelecionados.length === 0 && pacotesSelecionados.length === 0) ? styles.inputDisabled : null
              ]}
              onPress={() => {
                if (servicosSelecionados.length === 0 && pacotesSelecionados.length === 0) {
                  Alert.alert('Aten��o', 'Por favor, selecione um servi�o ou pacote antes de escolher a data.');
                  return;
                }
                abrirSeletorData();
              }}
              disabled={servicosSelecionados.length === 0 && pacotesSelecionados.length === 0}
            >
              <View style={styles.inputContent}>
                <FontAwesome5 
                  name="calendar" 
                  size={16} 
                  color={data ? (isDataBloqueada(data) ? colors.error : colors.primary) : colors.textSecondary} 
                  style={styles.inputIcon} 
                />
                <Text 
                  style={[
                    styles.inputText,
                    data ? styles.inputTextPreenchido : null,
                    isDataBloqueada(data) ? styles.inputTextBloqueado : null,
                    (servicosSelecionados.length === 0 && pacotesSelecionados.length === 0) ? styles.inputTextDisabled : null
                  ]}
                >
                  {data || 'Selecionar Data'}
                </Text>
                {isDataBloqueada(data) && (
                  <Ionicons name="alert-circle" size={20} color={colors.error} style={styles.alertIcon} />
                )}
              </View>
            </TouchableOpacity>
            {renderError('data')}
            {servicosSelecionados.length === 0 && pacotesSelecionados.length === 0 && (
              <Text style={styles.inputHelper}>
                ?? Selecione um servi�o ou pacote primeiro
              </Text>
            )}
            {isDataBloqueada(data) && !errors.data && (
              <Text style={styles.inputAlertText}>Esta data est� bloqueada para agendamentos</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hor�rio de In�cio *</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                errors.hora && styles.inputError,
                hora ? styles.inputPreenchido : null
              ]}
              onPress={() => {
                if (data && validarData(data) && !isDataBloqueada(data)) {
                  setMostrarSeletorHorario(true);
                } else {
                  Alert.alert('Selecionar Data', 'Por favor, selecione uma data v�lida primeiro.');
                }
              }}
            >
              <FontAwesome5 name="clock" size={16} color={hora ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                hora ? styles.inputTextPreenchido : null
              ]}>
                {hora || 'Selecionar Hor�rio de In�cio'}
              </Text>
            </TouchableOpacity>
            {renderError('hora')}
            {horariosDisponiveis.length === 0 && data && validarData(data) && !isDataBloqueada(data) && (
              <Text style={styles.infoText}>N�o h� hor�rios dispon�veis para esta data</Text>
            )}
            {horariosDisponiveis.every(h => h.ocupado) && data && validarData(data) && !isDataBloqueada(data) && (
              <Text style={styles.infoText}>Todos os hor�rios est�o ocupados para esta data</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hor�rio de T�rmino *</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                errors.horaTermino && styles.inputError,
                horaTermino ? styles.inputPreenchido : null
              ]}
              onPress={() => {
                if (!hora) {
                  Alert.alert('Aten��o', 'Por favor, selecione o hor�rio de in�cio primeiro.');
                  return;
                }
                setMostrarSeletorHorarioTermino(true);
              }}
            >
              <FontAwesome5 name="clock" size={16} color={horaTermino ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                horaTermino ? styles.inputTextPreenchido : null
              ]}>
                {horaTermino || 'Selecionar Hor�rio de T�rmino'}
              </Text>
            </TouchableOpacity>
            {renderError('horaTermino')}
            {(() => {
              const duracaoTotal = calcularDuracaoTotalCompleta();
              if (hora && duracaoTotal) {
                const horas = Math.floor(duracaoTotal / 60);
                const minutos = duracaoTotal % 60;
                let textoTempo = '';
                if (horas > 0 && minutos > 0) {
                  textoTempo = `${horas}h ${minutos}min`;
                } else if (horas > 0) {
                  textoTempo = `${horas}h`;
                } else {
                  textoTempo = `${minutos}min`;
                }
                return (
                  <Text style={styles.inputHelper}>
                    ?? Dura��o total do atendimento: {textoTempo}
                  </Text>
                );
              }
              return null;
            })()}
          </View>

          {/* Modal de Sele��o de Servi�os */}
          <Modal
            visible={modalVisible}
            transparent={true}
            onRequestClose={() => handleFecharModal()}
          >
            <TouchableOpacity 
              style={styles.modalContainer} 
              activeOpacity={1} 
              onPress={() => handleFecharModal()}
            >
              <Animated.View 
                style={[
                  styles.modalContent,
                  {
                    transform: [{ translateY: translateYServicos }]
                  }
                ]}
              >
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()}
                >
                  <View {...panResponderServicos.panHandlers} style={styles.modalHeader}>
                    <View style={styles.modalDragIndicator} />
                    <Text style={styles.modalTitle}>Selecionar Servi�os</Text>
                  </View>
                  
                  <TextInput
                    style={styles.searchInput}
                    value={pesquisaServico}
                    onChangeText={(text) => {
                      setPesquisaServico(text);
                      buscarServicos(text);
                    }}
                    placeholder="Buscar servi�os..."
                    placeholderTextColor={colors.textTertiary}
                    mode="flat"
                    underlineStyle={{ display: 'none' }}
                  />

                  <ScrollView style={styles.modalScrollView}>
                    {servicosEncontrados.map((servico) => (
                      <TouchableOpacity
                        key={servico.id}
                        style={[
                          styles.modalServicoItem,
                          servicosSelecionados.some(s => s.id === servico.id) && styles.modalServicoItemSelecionado
                        ]}
                        onPress={() => handleSelecionarServico(servico)}
                      >
                        <View style={styles.modalServicoInfo}>
                          <Text style={styles.modalServicoNome}>{servico.nome}</Text>
                          <Text style={styles.modalServicoPreco}>
                            R$ {servico.preco.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </Text>
                        </View>
                        {servicosSelecionados.some(s => s.id === servico.id) && (
                          <View style={styles.modalServicoCheck}>
                            <FontAwesome5 name="check" size={16} color={colors.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {servicosSelecionados.length > 0 && (
                    <View style={styles.servicosSelecionadosContainer}>
                      <Text style={styles.servicosSelecionadosTitle}>Itens Selecionados</Text>
                      {servicosSelecionados.map((servico) => (
                        <View key={servico.id} style={styles.servicoSelecionadoItem}>
                          <View style={styles.servicoSelecionadoInfo}>
                            <Text style={styles.servicoSelecionadoNome}>{servico.nome}</Text>
                            <Text style={styles.servicoSelecionadoPreco}>
                              R$ {servico.preco.toLocaleString('pt-BR', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </Text>
                          </View>
                          <View style={styles.servicoSelecionadoControles}>
                            <TouchableOpacity
                              style={styles.quantidadeButton}
                              onPress={() => handleQuantidade(servico.id, 'diminuir')}
                            >
                              <Text style={styles.quantidadeButtonText}>-</Text>
                            </TouchableOpacity>
                            
                            <Text style={styles.quantidadeText}>{servico.quantidade}</Text>
                            
                            <TouchableOpacity
                              style={styles.quantidadeButton}
                              onPress={() => handleQuantidade(servico.id, 'aumentar')}
                            >
                              <Text style={styles.quantidadeButtonText}>+</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.removerButton}
                              onPress={() => handleRemoverServico(servico.id)}
                            >
                              <FontAwesome5 name="trash-alt" size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelarButton}
                      onPress={() => handleFecharModal(false)}
                    >
                      <Text style={styles.modalCancelarButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalAdicionarButton,
                        servicosSelecionados.length === 0 && styles.modalAdicionarButtonDisabled
                      ]}
                      onPress={() => handleFecharModal(true)}
                      disabled={servicosSelecionados.length === 0}
                    >
                      <Text style={styles.modalAdicionarButtonText}>
                        Adicionar ({servicosSelecionados.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </Modal>

          {/* Modal de Sele��o de Pacotes */}
          <Modal
            visible={modalPacotesVisible}
            transparent={true}
            onRequestClose={() => setModalPacotesVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContainer} 
              activeOpacity={1} 
              onPress={() => fecharModalPacotesComAnimacao()}
            >
              <Animated.View 
                style={[
                  styles.modalContent,
                  {
                    transform: [{ translateY: translateYPacotes }]
                  }
                ]}
              >
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()}
                >
                  <View {...panResponderPacotes.panHandlers} style={styles.modalHeader}>
                    <View style={styles.modalDragIndicator} />
                    <Text style={styles.modalTitle}>Selecionar Pacotes</Text>
                  </View>
                  
                  <TextInput
                    style={styles.searchInput}
                    value={pesquisaPacote}
                    onChangeText={(text) => {
                      setPesquisaPacote(text);
                      buscarPacotes(text);
                    }}
                    placeholder="Buscar pacotes..."
                    placeholderTextColor={colors.textSecondary}
                  />

                  <ScrollView style={styles.modalScrollView}>
                    {buscandoPacotes ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Carregando pacotes...</Text>
                      </View>
                    ) : todosPacotes.length === 0 ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Nenhum pacote cadastrado</Text>
                      </View>
                    ) : (
                      todosPacotes
                        .filter(pacote => 
                          pacote.nome.toLowerCase().includes(pesquisaPacote.toLowerCase())
                        )
                        .map(pacote => {
                          const jaSelecionado = pacotesSelecionados.find(p => p.id === pacote.id);
                          
                          // Log para debug
                          logger.debug('Renderizando pacote:', {
                            nome: pacote.nome,
                            valor: pacote.valor,
                            duracao_total: pacote.duracao_total
                          });
                          
                          return (
                            <TouchableOpacity
                              key={pacote.id}
                              style={[
                                styles.modalServicoItem,
                                jaSelecionado && styles.modalServicoItemSelecionado
                              ]}
                              onPress={() => {
                                logger.debug('Pacote selecionado:', pacote);
                                handleSelecionarPacote(pacote);
                              }}
                            >
                              <View style={styles.modalServicoInfo}>
                                <Text 
                                  style={styles.modalServicoNome}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
                                >
                                  {pacote.nome}
                                </Text>
                                {pacote.descricao && (
                                  <Text 
                                    style={styles.servicoDescricao}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                  >
                                    {pacote.descricao}
                                  </Text>
                                )}
                                <View style={styles.pacoteValorContainer}>
                                  <Text style={styles.modalServicoPreco}>
                                    R$ {pacote.valor.toLocaleString('pt-BR', { 
                                      minimumFractionDigits: 2, 
                                      maximumFractionDigits: 2 
                                    })}
                                  </Text>
                                  {pacote.duracao_total && (
                                    <Text style={styles.servicoDuracao}>
                                      ?? {pacote.duracao_total} min
                                    </Text>
                                  )}
                                </View>
                                {pacote.servicos && pacote.servicos.length > 0 && (
                                  <Text style={styles.pacoteItens}>
                                    ?? {pacote.servicos.length} servi�o(s) inclu�do(s)
                                  </Text>
                                )}
                              </View>
                              {jaSelecionado && (
                                <View style={styles.modalServicoCheck}>
                                  <FontAwesome5 name="check-circle" size={24} color={colors.primary} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })
                    )}
                  </ScrollView>

                  {pacotesSelecionados.length > 0 && (
                    <View style={styles.servicosSelecionadosContainer}>
                      <Text style={styles.servicosSelecionadosTitle}>Pacotes Selecionados:</Text>
                      {pacotesSelecionados.map(pacote => (
                        <View key={pacote.id} style={styles.servicoSelecionadoItem}>
                          <View style={styles.servicoSelecionadoInfo}>
                            <Text style={styles.servicoSelecionadoNome}>{pacote.nome}</Text>
                            <Text style={styles.servicoSelecionadoPreco}>
                              R$ {(pacote.valor * pacote.quantidade).toLocaleString('pt-BR', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </Text>
                          </View>
                          <View style={styles.servicoSelecionadoControles}>
                            <TouchableOpacity
                              style={styles.quantidadeButton}
                              onPress={() => handleQuantidadePacote(pacote.id, 'diminuir')}
                            >
                              <Text style={styles.quantidadeButtonText}>-</Text>
                            </TouchableOpacity>

                            <Text style={styles.quantidadeText}>{pacote.quantidade}</Text>

                            <TouchableOpacity
                              style={styles.quantidadeButton}
                              onPress={() => handleQuantidadePacote(pacote.id, 'aumentar')}
                            >
                              <Text style={styles.quantidadeButtonText}>+</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.removerButton}
                              onPress={() => handleRemoverPacote(pacote.id)}
                            >
                              <FontAwesome5 name="trash-alt" size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelarButton}
                      onPress={() => setModalPacotesVisible(false)}
                    >
                      <Text style={styles.modalCancelarButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalAdicionarButton,
                        pacotesSelecionados.length === 0 && styles.modalAdicionarButtonDisabled
                      ]}
                      onPress={() => setModalPacotesVisible(false)}
                      disabled={pacotesSelecionados.length === 0}
                    >
                      <Text style={styles.modalAdicionarButtonText}>
                        Adicionar ({pacotesSelecionados.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </Modal>

          {showDatePicker && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              locale="pt-BR"
            />
          )}

          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <FontAwesome5 name="clipboard-list" size={20} color={colors.primary} />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Criar comanda para o dia do agendamento?</Text>
                  <Text style={styles.switchSubtext}>Uma comanda ser� criada automaticamente no dia marcado</Text>
                </View>
              </View>
              <Switch
                value={criarComandaAutomatica}
                onValueChange={setCriarComandaAutomatica}
                trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                thumbColor={criarComandaAutomatica ? colors.primary : colors.borderLight}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observa��es</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observacoes}
              onChangeText={(text) => {
                if (text.length <= 500) { // Limite de 500 caracteres
                  setObservacoes(text);
                }
              }}
              placeholder="Observa��es sobre o agendamento"
              mode="outlined"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.caracteresRestantes}>
              {500 - observacoes.length} caracteres restantes
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bot�o Salvar com KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={salvarAgendamento}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <View style={styles.savingLoadingContainer}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={[styles.saveButtonText, styles.savingLoadingText]}>
                Salvando...
              </Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>
              Salvar Agendamento
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Modal de Sele��o de Hor�rio */}
      <Modal
        visible={mostrarSeletorHorario}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarSeletorHorario(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => setMostrarSeletorHorario(false)}
        >
          <View style={styles.modalHorarioContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Hor�rio</Text>
              <TouchableOpacity 
                onPress={() => setMostrarSeletorHorario(false)}
                style={styles.fecharModal}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.legendaContainer}>
              <Text style={styles.legendaTitulo}>Legenda:</Text>
              <View style={styles.legendaItem}>
                <View style={styles.legendaCor} />
                <Text style={styles.legendaTexto}>Hor�rio dispon�vel</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaCorParcial]} />
                <Text style={styles.legendaTexto}>Parcialmente ocupado</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaCorOcupado]} />
                <Text style={styles.legendaTexto}>Hor�rio esgotado</Text>
              </View>
            </View>

            <FlatList
              data={horariosDisponiveis}
              keyExtractor={(item) => item.horario}
              style={styles.horariosList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.horarioItem,
                    hora === item.horario && styles.horarioItemSelecionado,
                    item.ocupado && styles.horarioItemOcupado,
                    item.quantidade > 0 && !item.ocupado && styles.horarioItemParcial
                  ]}
                  onPress={() => {
                    if (!item.ocupado) {
                      selecionarHorario(item.horario);
                    }
                  }}
                  disabled={item.ocupado}
                >
                  <View>
                    <Text style={[
                      styles.horarioItemText,
                      hora === item.horario && styles.horarioItemTextSelecionado,
                      item.ocupado && styles.horarioItemTextOcupado
                    ]}>
                      {item.horario}
                    </Text>
                    {item.quantidade > 0 && (
                      <Text style={[
                        styles.horarioItemStatus,
                        item.ocupado ? styles.horarioItemStatusOcupado : styles.horarioItemStatusParcial
                      ]}>
                        {item.ocupado 
                          ? 'Hor�rio esgotado' 
                          : `${item.quantidade}/${limiteSimultaneos} agendamentos`}
                      </Text>
                    )}
                  </View>
                  {(hora === item.horario && !item.ocupado) && (
                    <FontAwesome5 name="check" size={16} color={colors.primary} />
                  )}
                  {item.ocupado && (
                    <FontAwesome5 name="ban" size={16} color={colors.error} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.semHorariosContainer}>
                  <FontAwesome5 name="calendar-times" size={36} color={colors.textTertiary} />
                  <Text style={styles.semHorariosText}>
                    N�o h� hor�rios dispon�veis para esta data
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Sele��o de Hor�rio de T�rmino */}
      <Modal
        visible={mostrarSeletorHorarioTermino}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarSeletorHorarioTermino(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => setMostrarSeletorHorarioTermino(false)}
        >
          <View style={styles.modalHorarioContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Hor�rio de T�rmino</Text>
              <TouchableOpacity 
                onPress={() => setMostrarSeletorHorarioTermino(false)}
                style={styles.fecharModal}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={(() => {
                if (!hora) return [];
                const [horaInicio, minutoInicio] = hora.split(':').map(Number);
                const horarios = [];
                
                // Gera hor�rios a partir de 15 minutos ap�s o in�cio
                for (let i = horaInicio; i <= 23; i++) {
                  for (let j = 0; j < 60; j += 15) {
                    const horarioAtual = `${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`;
                    
                    // S� adiciona se for ap�s o hor�rio de in�cio (pelo menos 15 min)
                    if (i > horaInicio || (i === horaInicio && j > minutoInicio)) {
                      horarios.push(horarioAtual);
                    }
                  }
                }
                
                return horarios;
              })()}
              keyExtractor={(item) => item}
              style={styles.horariosList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.horarioItem,
                    horaTermino === item && styles.horarioItemSelecionado
                  ]}
                  onPress={() => {
                    setHoraTermino(item);
                    setMostrarSeletorHorarioTermino(false);
                    setErrors({...errors, horaTermino: ''});
                  }}
                >
                  <Text style={[
                    styles.horarioItemText,
                    horaTermino === item && styles.horarioItemTextSelecionado
                  ]}>
                    {item}
                  </Text>
                  {horaTermino === item && (
                    <FontAwesome5 name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.semHorariosContainer}>
                  <FontAwesome5 name="calendar-times" size={36} color={colors.textTertiary} />
                  <Text style={styles.semHorariosText}>
                    Selecione um hor�rio de in�cio primeiro
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Fun��o auxiliar para criar estilos din�micos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textTertiary,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalContentInner: {
    flex: 1,
  },
  modalHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
    height: 48,
  },
  servicosLista: {
    maxHeight: 350,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  modalScrollView: {
    maxHeight: 250,
    paddingHorizontal: 16,
  },
  modalServicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalServicoItemSelecionado: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primary,
  },
  modalServicoInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalServicoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalServicoPreco: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  modalServicoCheck: {
    marginLeft: 12,
  },
  servicosSelecionadosContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: 16,
  },
  servicosSelecionadosTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 12,
  },
  servicoSelecionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  servicoSelecionadoInfo: {
    flex: 1,
  },
  servicoSelecionadoNome: {
    fontSize: 14,
    color: colors.text,
  },
  servicoSelecionadoPreco: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  servicoSelecionadoControles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantidadeButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  quantidadeText: {
    fontSize: 14,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removerButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalCancelarButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelarButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  modalAdicionarButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAdicionarButtonDisabled: {
    backgroundColor: colors.border,
  },
  modalAdicionarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  servicoButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  servicoPacoteContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  servicoButtonMetade: {
    flex: 1,
  },
  pacoteButton: {
    // Estilos espec�ficos para o bot�o de pacotes, se necess�rio
  },
  pacoteDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  pacoteItens: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pacoteValorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  servicoItemSelecionado: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primary,
  },
  servicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  servicoInfo: {
    flex: 1,
  },
  servicoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  servicoDescricao: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  servicoPreco: {
    fontSize: 14,
    color: colors.primaryContrast,
    fontWeight: '500',
  },
  servicoDuracao: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  checkIcon: {
    marginLeft: 12,
  },
  selecionadosContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: 16,
  },
  selecionadosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selecionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selecionadoInfo: {
    flex: 1,
  },
  selecionadoNome: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  selecionadoPreco: {
    fontSize: 14,
    color: colors.primaryContrast,
    fontWeight: '500',
    marginTop: 2,
  },
  quantidadeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicoButtonSelecionado: {
    backgroundColor: colors.primaryBackground,
  },
  servicoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicoIcon: {
    marginRight: 8,
  },
  servicoButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  servicoButtonTextSelecionado: {
    color: colors.primary,
  },
  servicoPrecoButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  inputBloqueado: {
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  inputTextBloqueado: {
    color: colors.error,
  },
  alertIcon: {
    marginLeft: 4,
  },
  inputAlertText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  inputDisabled: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
    opacity: 0.6,
  },
  inputTextDisabled: {
    color: colors.textSecondary,
  },
  inputHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itensSelecionadosContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itensSelecionadosLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  itemSelecionadoTexto: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  totalContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primaryBackground,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryContrast,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  modalHorarioContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingBottom: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  horariosList: {
    maxHeight: 300,
  },
  horarioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  horarioItemSelecionado: {
    backgroundColor: colors.primaryBackground,
  },
  horarioItemText: {
    fontSize: 16,
    color: colors.text,
  },
  horarioItemTextSelecionado: {
    color: colors.primaryContrast,
    fontWeight: '600',
  },
  horarioItemOcupado: {
    backgroundColor: colors.errorBackground,
    opacity: 0.7,
  },
  horarioItemParcial: {
    backgroundColor: colors.warningBackground,
  },
  horarioItemTextOcupado: {
    color: colors.error,
  },
  horarioItemStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  horarioItemStatusOcupado: {
    color: colors.error,
  },
  horarioItemStatusParcial: {
    color: colors.warning,
  },
  semHorariosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  semHorariosText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
  fecharModal: {
    padding: 4,
  },
  legendaContainer: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  legendaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendaCor: {
    width: 16,
    height: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    borderRadius: 4,
  },
  legendaCorParcial: {
    backgroundColor: colors.warningBackground,
  },
  legendaCorOcupado: {
    backgroundColor: colors.errorBackground,
  },
  legendaTexto: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  clienteFoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  clienteFotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWithFoto: {
    paddingLeft: 48,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  caracteresRestantes: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  savingLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingLoadingText: {
    marginLeft: 8,
  },
  clienteContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sugestoesList: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  listLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  listLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  sugestaoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sugestaoItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sugestaoFoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  sugestaoFotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sugestaoIcon: {
    marginRight: 12,
  },
  sugestaoInfo: {
    flex: 1,
  },
  sugestaoNome: {
    fontSize: 14,
    color: colors.text,
  },
  sugestaoTelefone: {
    fontSize: 14,
    color: colors.primary,
  },
  semResultados: {
    padding: 16,
    alignItems: 'center',
  },
  semResultadosText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  botaoCadastrar: {
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoCadastrarIcon: {
    marginRight: 8,
  },
  botaoCadastrarText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inputPreenchido: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBackground,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  inputTextPreenchido: {
    color: colors.primary,
  },
  // Estilos para o date picker no Web
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerWebContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 300,
    zIndex: 9999,
  },
  datePickerWebTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  datePickerWebCloseButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerWebCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
