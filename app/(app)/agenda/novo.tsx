import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, PanResponder, Animated, Platform, ActivityIndicator, Image, DeviceEventEmitter, FlatList, BackHandler, KeyboardAvoidingView, GestureResponderEvent, NativeSyntheticEvent, Switch } from 'react-native';
import { TextInput } from 'react-native-paper';
import { format } from 'date-fns';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MaskInput from 'react-native-mask-input';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../contexts/AuthContext';

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
  const { estabelecimentoId, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [horaTermino, setHoraTermino] = useState(''); // Novo campo para horário de término
  const [criarComandaAutomatica, setCriarComandaAutomatica] = useState(true); // Padrão: Sim
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

  // Novos estados para busca de serviços
  const [servicosEncontrados, setServicosEncontrados] = useState<Servico[]>([]);
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [buscandoServicos, setBuscandoServicos] = useState(false);
  const [mostrarListaServicos, setMostrarListaServicos] = useState(false);

  // Estados para o modal de serviços
  const [modalVisible, setModalVisible] = useState(false);
  const [pesquisaServico, setPesquisaServico] = useState('');

  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);

  // Novo estado para animação do modal
  const translateY = useRef(new Animated.Value(500)).current;
  
  // Configuração do PanResponder para o cabeçalho do modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Só permite arrastar para baixo
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // Se arrastar mais que 100px, fecha o modal
          Animated.timing(translateY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setModalVisible(false);
            translateY.setValue(500);
          });
        } else {
          // Se não arrastar o suficiente, volta para a posição inicial
          Animated.spring(translateY, {
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

  // Estados para usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [presencaUsuarios, setPresencaUsuarios] = useState<Record<string, boolean>>({});
  const [mostrarListaUsuarios, setMostrarListaUsuarios] = useState(false);

  // Adicionar estados para controle de dias bloqueados
  const [diasSemanaBloqueados, setDiasSemanaBloqueados] = useState<number[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);

  // Adicionar estado para armazenar o limite de agendamentos simultâneos
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

  // Sincronização com o estado de presença da tela de agenda
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('atualizarPresencaUsuarios', (novoEstado: Record<string, boolean>) => {
      setPresencaUsuarios(novoEstado);
      
      // Se o usuário selecionado foi marcado como ausente, desseleciona ele
      if (usuarioSelecionado && !novoEstado[usuarioSelecionado.id]) {
        setUsuarioSelecionado(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [usuarioSelecionado]);

  // Garantir que o loading seja resetado quando a tela for focada
  // E limpar o formulário quando sair da tela
  useFocusEffect(
    useCallback(() => {
      // Resetar loading ao entrar na tela
      setLoading(false);
      console.log('Tela de novo agendamento focada - loading resetado');
      
      // Função de cleanup quando sair da tela
      return () => {
        console.log('Saindo da tela de novo agendamento - limpando formulário');
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

  const formatarData = (texto: string) => {
    const numeros = texto.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4, 8)}`;
  };

  const formatarHora = (texto: string) => {
    const numeros = texto.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
  };

  const formatarTelefone = (texto: string) => {
    const numeros = texto.replace(/\D/g, '');
    if (numeros.length <= 2) return `(${numeros}`;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
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
      console.log('Carregando usuários para novo agendamento - estabelecimento:', estabelecimentoId);
      
      if (!estabelecimentoId) {
        console.error('ID do estabelecimento não disponível');
        return;
      }

      // Tenta usar RPC function primeiro (pode não existir já)
      const { data: usuariosRpc, error: rpcError } = await supabase
        .rpc('get_usuarios_estabelecimento', { estabelecimento_uuid: estabelecimentoId });

      if (!rpcError && usuariosRpc) {
        console.log('✅ Usuários carregados via RPC:', usuariosRpc.length);
        console.log('📋 Lista completa de usuários RPC:', JSON.stringify(usuariosRpc, null, 2));
        // TODOS os usuários do estabelecimento, não apenas quem faz atendimento
        setUsuarios(usuariosRpc || []);
        
        // Inicializa o estado de presença para todos os usuários
        const presencaInicial = (usuariosRpc || []).reduce((acc: Record<string, boolean>, usuario: any) => {
          acc[usuario.id] = true; // Por padrão, todos estão presentes
          return acc;
        }, {} as Record<string, boolean>);
        setPresencaUsuarios(presencaInicial);
        console.log('✅ Total de usuários carregados:', usuariosRpc.length);
        return;
      }

      console.log('⚠️ Erro RPC ou dados vazios, tentando fallback...');

      console.log('⚠️ Erro RPC ou dados vazios, tentando fallback...');

      // Fallback para consulta direta
      console.log('🔍 RPC não disponível, usando consulta direta...');
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_completo');

      if (error) throw error;

      console.log('✅ Usuários encontrados via consulta direta:', data?.length);
      console.log('📋 Lista completa de usuários (fallback):', JSON.stringify(data, null, 2));
      setUsuarios(data || []);
      
      // Inicializa o estado de presença para todos os usuários
      const presencaInicial = (data || []).reduce((acc, usuario) => {
        acc[usuario.id] = true; // Por padrão, todos estão presentes
        return acc;
      }, {} as Record<string, boolean>);
      setPresencaUsuarios(presencaInicial);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de usuários');
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
      console.error('Erro ao carregar serviços:', error);
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
      
      // Carregar datas específicas bloqueadas
      const { data: datasData, error: datasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'datas_bloqueadas');
        
      if (datasError) throw datasError;
      
      if (datasData && datasData.length > 0 && datasData[0].valor) {
        setDatasBloqueadas(JSON.parse(datasData[0].valor));
      }
      
      // Carregar limite de agendamentos simultâneos
      const { data: limiteData, error: limiteError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'limite_simultaneos');
        
      if (limiteError) throw limiteError;
      
      if (limiteData && limiteData.length > 0 && limiteData[0].valor) {
        setLimiteSimultaneos(limiteData[0].valor);
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  // Função para verificar se uma data está bloqueada
  const isDataBloqueada = (dataStr: string) => {
    try {
      const dataParts = dataStr.split('/');
      if (dataParts.length !== 3) return false;
      
      const dia = parseInt(dataParts[0]);
      const mes = parseInt(dataParts[1]) - 1;
      const ano = parseInt(dataParts[2]);
      
      const data = new Date(ano, mes, dia);
      
      // Verifica se o dia da semana está bloqueado
      const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      if (diasSemanaBloqueados.includes(diaSemana)) {
        return true;
      }
      
      // Verifica se a data específica está bloqueada
      const formattedDate = format(data, 'yyyy-MM-dd');
      return datasBloqueadas.includes(formattedDate);
    } catch (error) {
      console.error('Erro ao verificar data bloqueada:', error);
      return false;
    }
  };

  const validarFormulario = () => {
    const novosErros: {[key: string]: string} = {};

    if (!cliente.trim()) {
      novosErros.cliente = 'Nome do cliente é obrigatório';
    }

    if (!telefone.trim()) {
      novosErros.telefone = 'Telefone é obrigatório';
    } else if (telefone.replace(/\D/g, '').length < 10) {
      novosErros.telefone = 'Telefone inválido';
    }

    if (!data.trim()) {
      novosErros.data = 'Data é obrigatória';
    } else if (!validarData(data)) {
      novosErros.data = 'Data inválida';
    } else if (isDataBloqueada(data)) {
      novosErros.data = 'Esta data está bloqueada para agendamentos';
    }

    if (!hora.trim()) {
      novosErros.hora = 'Hora é obrigatória';
    } else if (!validarHora(hora)) {
      novosErros.hora = 'Hora inválida';
    }

    if (!horaTermino.trim()) {
      novosErros.horaTermino = 'Horário de término é obrigatório';
    } else if (!validarHora(horaTermino)) {
      novosErros.horaTermino = 'Horário de término inválido';
    } else if (hora && horaTermino) {
      // Validar que término seja após início
      const [horaIni, minIni] = hora.split(':').map(Number);
      const [horaTerm, minTerm] = horaTermino.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;
      const minutosTermino = horaTerm * 60 + minTerm;
      
      if (minutosTermino <= minutosInicio) {
        novosErros.horaTermino = 'Horário de término deve ser após o início';
      }
    }

    if (!usuarioSelecionado) {
      novosErros.usuario = 'Selecione um profissional';
    }

    // Remover validação obrigatória de serviços
    // if (servicosSelecionados.length === 0) {
    //   novosErros.servico = 'Selecione pelo menos um serviço';
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
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const [dia, mes, ano] = data.split('/');
      const [hora_agendamento, minuto] = hora.split(':');
      const dataHoraAgendamento = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora_agendamento),
        parseInt(minuto)
      );

      // Verificar se o horário já atingiu o limite de agendamentos simultâneos
      const horaInicio = dataHoraAgendamento.toISOString();
      
      // Buscar agendamentos para o mesmo horário
      const { data: agendamentosExistentes, error: erroConsulta } = await supabase
        .from('agendamentos')
        .select('id, data_hora, cliente')
        .gte('data_hora', new Date(
          parseInt(ano),
          parseInt(mes) - 1,
          parseInt(dia),
          parseInt(hora_agendamento),
          parseInt(minuto) - 15
        ).toISOString())
        .lte('data_hora', new Date(
          parseInt(ano),
          parseInt(mes) - 1,
          parseInt(dia),
          parseInt(hora_agendamento),
          parseInt(minuto) + 15
        ).toISOString());
        
      if (erroConsulta) throw erroConsulta;

      console.log(`Encontrados ${agendamentosExistentes?.length || 0} agendamentos no mesmo horário`);

      // Verificar se atingiu o limite
      const limiteTotal = parseInt(limiteSimultaneos || '1');
      if (agendamentosExistentes && agendamentosExistentes.length >= limiteTotal) {
        Alert.alert(
          'Horário Indisponível', 
          `Este horário já atingiu o limite de ${limiteTotal} agendamento(s) simultâneo(s).\n\nJá agendado para: ${
            agendamentosExistentes.map(a => a.cliente).join(', ')
          }`
        );
        setLoading(false);
        return;
      }

      // Preparar os detalhes dos serviços (pode estar vazio)
      const detalhesServicos = servicosSelecionados.map(s => ({
        nome: s.nome,
        quantidade: s.quantidade,
        preco: s.preco,
        servico_id: s.id
      }));

      const valorTotalAgendamento = servicosSelecionados.length > 0 
        ? servicosSelecionados.reduce((total, s) => total + (s.preco * s.quantidade), 0)
        : 0;

      // Preparar horário de término no formato TIME (HH:MM:SS)
      let horarioTerminoFormatado = null;
      if (horaTermino) {
        horarioTerminoFormatado = `${horaTermino}:00`; // Adiciona segundos ao formato HH:MM
      }

      const { error } = await supabase
        .from('agendamentos')
        .insert({
          cliente,
          telefone: telefone.replace(/\D/g, ''),
          data_hora: dataHoraAgendamento.toISOString(),
          horario_termino: horarioTerminoFormatado,
          servicos: detalhesServicos,
          valor_total: valorTotalAgendamento,
          observacoes: observacoes.trim() || null,
          estabelecimento_id: estabelecimentoId,
          status: 'agendado',
          usuario_id: usuarioSelecionado?.id || null,
          criar_comanda_automatica: criarComandaAutomatica
        });

      if (error) throw error;

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
      console.error('Erro ao criar agendamento:', error);
      Alert.alert('Erro', 'Não foi possível criar o agendamento');
    } finally {
      // Sempre resetar loading, independente de sucesso ou erro
      setLoading(false);
    }
  };

  // Atualizar a função limparFormulario
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
    
    // Limpar seleções
    setClienteSelecionado(null);
    setServicosSelecionados([]);
    setUsuarioSelecionado(null);
    
    // Resetar flags
    setCriarComandaAutomatica(true); // Voltar ao padrão
    
    // Limpar erros
    setErrors({});
    
    // Resetar estados de UI
    setMostrarLista(false);
    setMostrarListaServicos(false);
    setMostrarListaUsuarios(false);
    setMostrarSeletorHorario(false);
    setMostrarSeletorHorarioTermino(false);
    setModalVisible(false);
    
    // Resetar listas de resultados
    setClientesEncontrados([]);
    setPesquisaServico('');
    
    // Resetar data
    setDateValue(new Date());
    
    // Resetar horários disponíveis
    atualizarHorariosDisponiveis();
    
    // Resetar loading (importante para destravar o botão)
    setLoading(false);
    
    console.log('Formulário limpo com sucesso');
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
      console.log('Clientes encontrados:', data?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
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
    if (servicosSelecionados.length > 0) {
      const servicosTexto = servicosSelecionados
        .map(s => `${s.nome} (${s.quantidade}x)`)
        .join(', ');
      
      const total = servicosSelecionados.reduce(
        (sum, s) => sum + (s.preco * s.quantidade), 
        0
      );

      setServico(servicosTexto);
      setValorTotal(total);
      setErrors(prev => ({ ...prev, servico: '' }));
    } else {
      setServico('');
      setValorTotal(0);
    }
  };

  useEffect(() => {
    atualizarServicosSelecionados();
  }, [servicosSelecionados]);

  useEffect(() => {
    if (modalVisible) {
      carregarServicos();
    }
  }, [modalVisible]);

  useEffect(() => {
    carregarUsuarios();
    carregarServicos();
    carregarBloqueios();
  }, []);

  // Adicionar função para carregar configurações de horários
  const carregarConfiguracoesHorarios = async () => {
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado ao carregar configurações de horários');
        inicializarHorariosPadrao();
        return;
      }
      
      // Carregar configurações de horários
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
        console.error('Erro ao carregar configurações de horários:', error);
        inicializarHorariosPadrao();
        return;
      }
      
      let foiAtualizado = false;
      
      // Mapear os valores das configurações para os estados
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
      
      // Se não houve atualização, inicializar com valores padrão
      if (!foiAtualizado) {
        inicializarHorariosPadrao();
      } else {
        // Atualizar a lista de horários disponíveis
        atualizarHorariosDisponiveis();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de horários:', error);
      inicializarHorariosPadrao();
    }
  };

  // Função para inicializar horários com valores padrão
  const inicializarHorariosPadrao = () => {
    setHorarioInicio('08:00');
    setHorarioFim('18:00');
    setIntervaloAgendamentos('30');
    setTemIntervalo(false);
    
    // Gerar horários disponíveis com valores padrão
    const horariosIniciais = gerarHorarios('08:00', '18:00', 30, false, '', '');
    setHorariosDisponiveis(horariosIniciais.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
  };

  // Função para converter hora no formato "HH:MM" para minutos
  const converterHoraParaMinutos = (hora: string) => {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  };

  // Função para converter minutos para hora no formato "HH:MM"
  const converterMinutosParaHora = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Função para gerar lista de horários disponíveis
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
      
      for (let i = inicioMinutos; i < fimMinutos; i += intervalo) {
        // Pular horários durante o intervalo
        if (temIntervalo && i >= intervaloInicioMinutos && i < intervaloFimMinutos) {
          continue;
        }
        
        horarios.push(converterMinutosParaHora(i));
      }
      
      return horarios;
    } catch (error) {
      console.error('Erro ao gerar horários:', error);
      return [];
    }
  };

  // Função para atualizar a lista de horários disponíveis
  const atualizarHorariosDisponiveis = () => {
    try {
      console.log('Atualizando horários disponíveis com as configurações:');
      console.log(`- Horário início: ${horarioInicio}`);
      console.log(`- Horário fim: ${horarioFim}`);
      console.log(`- Tem intervalo: ${temIntervalo}`);
      if (temIntervalo) {
        console.log(`- Intervalo início: ${horarioIntervaloInicio}`);
        console.log(`- Intervalo fim: ${horarioIntervaloFim}`);
      }
      console.log(`- Intervalo entre agendamentos: ${intervaloAgendamentos} minutos`);
      
      const intervalo = parseInt(intervaloAgendamentos);
      const novosHorarios = gerarHorarios(
        horarioInicio, 
        horarioFim, 
        intervalo, 
        temIntervalo, 
        horarioIntervaloInicio, 
        horarioIntervaloFim
      );
      
      // Checar disponibilidade dos horários (quando uma data estiver selecionada)
      if (data && validarData(data)) {
        verificarDisponibilidadeHorarios(novosHorarios);
      } else {
        setHorariosDisponiveis(novosHorarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
      }
      
      console.log('Lista de horários atualizada:', novosHorarios.length);
      console.log('Horários gerados:', novosHorarios.join(', '));
    } catch (error) {
      console.error('Erro ao atualizar lista de horários:', error);
      inicializarHorariosPadrao();
    }
  };

  // Função para verificar disponibilidade de horários para a data selecionada
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
      
      const inicioDia = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        0, 0, 0
      ).toISOString();
      
      const fimDia = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        23, 59, 59
      ).toISOString();
      
      // Buscar agendamentos para o dia selecionado
      const { data: agendamentosDia, error } = await supabase
        .from('agendamentos')
        .select('id, data_hora, cliente')
        .gte('data_hora', inicioDia)
        .lte('data_hora', fimDia);
        
      if (error) {
        console.error('Erro ao verificar disponibilidade de horários:', error);
        setHorariosDisponiveis(horarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
        return;
      }
      
      console.log(`Encontrados ${agendamentosDia?.length || 0} agendamentos para o dia ${data}`);
      
      // Verificar disponibilidade de cada horário
      const horariosComStatus = horarios.map(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        
        // Contar agendamentos para este horário
        const agendamentosNoHorario = agendamentosDia?.filter(agendamento => {
          const dataAgendamento = new Date(agendamento.data_hora);
          return (
            dataAgendamento.getHours() === horas &&
            Math.abs(dataAgendamento.getMinutes() - minutos) < 15
          );
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
      
      // Se o horário atual não está disponível, limpar a seleção
      if (hora) {
        const horarioAtual = horariosComStatus.find(h => h.horario === hora);
        if (horarioAtual?.ocupado) {
          setHora('');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de horários:', error);
      setHorariosDisponiveis(horarios.map(h => ({ horario: h, ocupado: false, quantidade: 0 })));
    }
  };

  // Atualizar useEffect para carregar configurações de horários
  useEffect(() => {
    carregarUsuarios();
    carregarServicos();
    carregarBloqueios();
    carregarConfiguracoesHorarios();
  }, []);

  // Adicionar useEffect para atualizar horários quando a data mudar
  useEffect(() => {
    if (data && validarData(data)) {
      atualizarHorariosDisponiveis();
    }
  }, [data]);

  // Extrair uma função para verificar se há dados preenchidos
  const temDadosPreenchidos = () => 
    cliente.trim() !== '' || 
    telefone.trim() !== '' || 
    data.trim() !== '' || 
    hora.trim() !== '' || 
    servicosSelecionados.length > 0 ||
    observacoes.trim() !== '';

  // Função para confirmar se o usuário quer descartar as alterações
  const confirmarDescarte = () => {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Descartar alterações',
        'Você tem dados não salvos. Deseja descartar as alterações?',
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

  // Modificar o useEffect que trata o botão de voltar
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
    
    // Adicionar o handler para o botão voltar no Android
    const backSubscription = BackHandler && BackHandler.addEventListener('hardwareBackPress', backHandler);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      backSubscription && backSubscription.remove();
    };
  }, [cliente, telefone, data, hora, servicosSelecionados, observacoes]);

  // Modificar o handleFecharModal para fechar o modal e aplicar serviços
  const handleFecharModal = (confirmar?: boolean) => {
    if (confirmar === false) {
      // Cancelar - limpar seleções e fechar modal
      setServicosSelecionados([]);
      setModalVisible(false);
    } else if (confirmar === true) {
      // Adicionar - manter seleções e fechar modal
      setModalVisible(false);
    } else {
      // Fechar modal sem parâmetro - apenas fechar
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
    Animated.spring(translateY, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const fecharModalComAnimacao = () => {
    Animated.timing(translateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      translateY.setValue(500);
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateValue(selectedDate);
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      setData(formattedDate);
      
      // Verifica se a data selecionada está bloqueada
      if (isDataBloqueada(formattedDate)) {
        setErrors({ ...errors, data: 'Esta data está bloqueada para agendamentos' });
        Alert.alert('Data Bloqueada', 'Esta data não está disponível para agendamentos.');
      } else {
        setErrors({ ...errors, data: '' });
        // Atualiza os horários disponíveis para a nova data
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
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>
          
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
                    <FontAwesome5 name="user" size={12} color="#7C3AED" />
                  </View>
                ) : (
                  <FontAwesome5 name="user" size={16} color="#9CA3AF" style={styles.inputIcon} />
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
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {renderError('cliente')}
            </View>

            {mostrarLista && (
              <View style={styles.sugestoesList}>
                {buscandoClientes ? (
                  <View style={styles.listLoadingContainer}>
                    <ActivityIndicator size="small" color="#7C3AED" />
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
                            <FontAwesome5 name="user" size={16} color="#7C3AED" />
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
                      <FontAwesome5 name="user-plus" size={16} color="#fff" style={styles.botaoCadastrarIcon} />
                      <Text style={styles.botaoCadastrarText}>Cadastrar Novo Cliente</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="phone" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <MaskInput
                  style={styles.input}
                  value={telefone}
                  onChangeText={(text) => {
                    setTelefone(formatarTelefone(text));
                    setErrors({ ...errors, telefone: '' });
                  }}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={15}
                />
              </View>
              {renderError('telefone')}
            </View>
          </View>
        </View>

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
                    <FontAwesome5 name="user" size={12} color="#7C3AED" />
                  </View>
                ) : null}
                <Text style={[styles.selectText, !usuarioSelecionado && styles.placeholder]}>
                  {usuarioSelecionado ? usuarioSelecionado.nome_completo : 'Selecione um Profissional'}
                </Text>
              </View>
              <FontAwesome5 name="chevron-down" size={16} color="#9CA3AF" />
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
                          <FontAwesome5 name="user" size={16} color="#7C3AED" />
                        </View>
                      )}
                      <Text style={styles.sugestaoNome}>{usuario.nome_completo}</Text>
                    </View>
                    {usuarioSelecionado?.id === usuario.id && (
                      <FontAwesome5 name="check" size={16} color="#7C3AED" />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Agendamento</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity
              style={[
                styles.input,
                errors.data ? styles.inputError : null,
                data ? styles.inputPreenchido : null,
                isDataBloqueada(data) ? styles.inputBloqueado : null
              ]}
              onPress={abrirSeletorData}
            >
              <View style={styles.inputContent}>
                <FontAwesome5 
                  name="calendar" 
                  size={16} 
                  color={data ? (isDataBloqueada(data) ? '#FF6B6B' : '#7C3AED') : '#9CA3AF'} 
                  style={styles.inputIcon} 
                />
                <Text 
                  style={[
                    styles.inputText,
                    data ? styles.inputTextPreenchido : null,
                    isDataBloqueada(data) ? styles.inputTextBloqueado : null
                  ]}
                >
                  {data || 'Selecionar Data'}
                </Text>
                {isDataBloqueada(data) && (
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" style={styles.alertIcon} />
                )}
              </View>
            </TouchableOpacity>
            {renderError('data')}
            {isDataBloqueada(data) && !errors.data && (
              <Text style={styles.inputAlertText}>Esta data está bloqueada para agendamentos</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Horário de Início *</Text>
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
                  Alert.alert('Selecionar Data', 'Por favor, selecione uma data válida primeiro.');
                }
              }}
            >
              <FontAwesome5 name="clock" size={16} color={hora ? '#7C3AED' : '#9CA3AF'} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                hora ? styles.inputTextPreenchido : null
              ]}>
                {hora || 'Selecionar Horário de Início'}
              </Text>
            </TouchableOpacity>
            {renderError('hora')}
            {horariosDisponiveis.length === 0 && data && validarData(data) && !isDataBloqueada(data) && (
              <Text style={styles.infoText}>Não há horários disponíveis para esta data</Text>
            )}
            {horariosDisponiveis.every(h => h.ocupado) && data && validarData(data) && !isDataBloqueada(data) && (
              <Text style={styles.infoText}>Todos os horários estão ocupados para esta data</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Horário de Término *</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                errors.horaTermino && styles.inputError,
                horaTermino ? styles.inputPreenchido : null
              ]}
              onPress={() => {
                if (!hora) {
                  Alert.alert('Atenção', 'Por favor, selecione o horário de início primeiro.');
                  return;
                }
                setMostrarSeletorHorarioTermino(true);
              }}
            >
              <FontAwesome5 name="clock" size={16} color={horaTermino ? '#7C3AED' : '#9CA3AF'} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                horaTermino ? styles.inputTextPreenchido : null
              ]}>
                {horaTermino || 'Selecionar Horário de Término'}
              </Text>
            </TouchableOpacity>
            {renderError('horaTermino')}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Serviço</Text>
            <TouchableOpacity
              style={[
                styles.servicoButton,
                servicosSelecionados.length > 0 ? styles.servicoButtonSelecionado : null
              ]}
              onPress={abrirModal}
            >
              <View style={styles.servicoButtonContent}>
                <FontAwesome5 
                  name="cut" 
                  size={16} 
                  color={servicosSelecionados.length > 0 ? '#7C3AED' : '#9CA3AF'} 
                  style={styles.servicoIcon} 
                />
                <Text 
                  style={[
                    styles.servicoButtonText,
                    servicosSelecionados.length > 0 ? styles.servicoButtonTextSelecionado : null
                  ]}
                >
                  {servico || 'Selecionar Serviço'}
                </Text>
              </View>
              {valorTotal > 0 && (
                <Text style={styles.servicoPrecoButton}>
                  R$ {valorTotal.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
              )}
            </TouchableOpacity>
            {renderError('servico')}
          </View>

          {/* Modal de Seleção de Serviços */}
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
                    transform: [{ translateY }]
                  }
                ]}
              >
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()}
                >
                  <View {...panResponder.panHandlers} style={styles.modalHeader}>
                    <View style={styles.modalDragIndicator} />
                    <Text style={styles.modalTitle}>Selecionar Serviços</Text>
                  </View>
                  
                  <TextInput
                    style={styles.searchInput}
                    value={pesquisaServico}
                    onChangeText={(text) => {
                      setPesquisaServico(text);
                      buscarServicos(text);
                    }}
                    placeholder="Buscar serviços..."
                    placeholderTextColor="#9CA3AF"
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
                            <FontAwesome5 name="check" size={16} color="#7C3AED" />
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
                              <Text style={styles.quantidadeButtonText}>−</Text>
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
                              <FontAwesome5 name="trash-alt" size={16} color="#374151" />
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
                <FontAwesome5 name="clipboard-list" size={20} color="#7C3AED" />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Criar comanda para o dia do agendamento?</Text>
                  <Text style={styles.switchSubtext}>Uma comanda será criada automaticamente no dia marcado</Text>
                </View>
              </View>
              <Switch
                value={criarComandaAutomatica}
                onValueChange={setCriarComandaAutomatica}
                trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                thumbColor={criarComandaAutomatica ? '#7C3AED' : '#F3F4F6'}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observacoes}
              onChangeText={(text) => {
                if (text.length <= 500) { // Limite de 500 caracteres
                  setObservacoes(text);
                }
              }}
              placeholder="Observações sobre o agendamento"
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

      {/* Botão Salvar com KeyboardAvoidingView */}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
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

      {/* Modal de Seleção de Horário */}
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
              <Text style={styles.modalTitle}>Selecionar Horário</Text>
              <TouchableOpacity 
                onPress={() => setMostrarSeletorHorario(false)}
                style={styles.fecharModal}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.legendaContainer}>
              <Text style={styles.legendaTitulo}>Legenda:</Text>
              <View style={styles.legendaItem}>
                <View style={styles.legendaCor} />
                <Text style={styles.legendaTexto}>Horário disponível</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaCorParcial]} />
                <Text style={styles.legendaTexto}>Parcialmente ocupado</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaCorOcupado]} />
                <Text style={styles.legendaTexto}>Horário esgotado</Text>
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
                      setHora(item.horario);
                      setMostrarSeletorHorario(false);
                      setErrors({...errors, hora: ''});
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
                          ? 'Horário esgotado' 
                          : `${item.quantidade}/${limiteSimultaneos} agendamentos`}
                      </Text>
                    )}
                  </View>
                  {(hora === item.horario && !item.ocupado) && (
                    <FontAwesome5 name="check" size={16} color="#7C3AED" />
                  )}
                  {item.ocupado && (
                    <FontAwesome5 name="ban" size={16} color="#FF6B6B" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.semHorariosContainer}>
                  <FontAwesome5 name="calendar-times" size={36} color="#9CA3AF" />
                  <Text style={styles.semHorariosText}>
                    Não há horários disponíveis para esta data
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Seleção de Horário de Término */}
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
              <Text style={styles.modalTitle}>Selecionar Horário de Término</Text>
              <TouchableOpacity 
                onPress={() => setMostrarSeletorHorarioTermino(false)}
                style={styles.fecharModal}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={(() => {
                if (!hora) return [];
                const [horaInicio, minutoInicio] = hora.split(':').map(Number);
                const horarios = [];
                
                // Gera horários a partir de 15 minutos após o início
                for (let i = horaInicio; i <= 23; i++) {
                  for (let j = 0; j < 60; j += 15) {
                    const horarioAtual = `${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`;
                    
                    // Só adiciona se for após o horário de início (pelo menos 15 min)
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
                    <FontAwesome5 name="check" size={16} color="#7C3AED" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.semHorariosContainer}>
                  <FontAwesome5 name="calendar-times" size={36} color="#9CA3AF" />
                  <Text style={styles.semHorariosText}>
                    Selecione um horário de início primeiro
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  formContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  selectText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 16,
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
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalServicoItemSelecionado: {
    backgroundColor: '#F3E8FF',
  },
  modalServicoInfo: {
    flex: 1,
  },
  modalServicoNome: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  modalServicoPreco: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  modalServicoCheck: {
    marginLeft: 12,
  },
  servicosSelecionadosContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  servicosSelecionadosTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    color: '#111827',
  },
  servicoSelecionadoPreco: {
    fontSize: 14,
    color: '#7C3AED',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  quantidadeText: {
    fontSize: 14,
    color: '#111827',
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
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancelarButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelarButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  modalAdicionarButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAdicionarButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  modalAdicionarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  servicoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  servicoButtonSelecionado: {
    backgroundColor: '#F3E8FF',
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
    color: '#111827',
  },
  servicoButtonTextSelecionado: {
    color: '#7C3AED',
  },
  servicoPrecoButton: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  inputBloqueado: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFEEEE',
  },
  inputTextBloqueado: {
    color: '#FF6B6B',
  },
  alertIcon: {
    marginLeft: 4,
  },
  inputAlertText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  modalHorarioContent: {
    backgroundColor: '#FFFFFF',
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
    shadowRadius: 3.84,
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
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  horarioItemSelecionado: {
    backgroundColor: '#F3E8FF',
  },
  horarioItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  horarioItemTextSelecionado: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  horarioItemOcupado: {
    backgroundColor: '#FEE2E2',
    opacity: 0.7,
  },
  horarioItemParcial: {
    backgroundColor: '#FFFBEB',
  },
  horarioItemTextOcupado: {
    color: '#B91C1C',
  },
  horarioItemStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  horarioItemStatusOcupado: {
    color: '#B91C1C',
  },
  horarioItemStatusParcial: {
    color: '#C2410C',
  },
  semHorariosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  semHorariosText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  fecharModal: {
    padding: 4,
  },
  legendaContainer: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  legendaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    borderRadius: 4,
  },
  legendaCorParcial: {
    backgroundColor: '#FFFBEB',
  },
  legendaCorOcupado: {
    backgroundColor: '#FEE2E2',
  },
  legendaTexto: {
    fontSize: 12,
    color: '#4B5563',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  caracteresRestantes: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#6B7280',
    marginLeft: 8,
  },
  sugestaoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: '#F3E8FF',
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
    color: '#111827',
  },
  sugestaoTelefone: {
    fontSize: 14,
    color: '#7C3AED',
  },
  semResultados: {
    padding: 16,
    alignItems: 'center',
  },
  semResultadosText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  botaoCadastrar: {
    padding: 12,
    backgroundColor: '#7C3AED',
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
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  inputTextPreenchido: {
    color: '#7C3AED',
  },
}); 