import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, DeviceEventEmitter, Modal, TextInput, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { format, isValid } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useRouter } from 'expo-router';

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

// Array de horários para a agenda
// const HORARIOS = Array.from({ length: 31 }, (_, i) => {
//   const hora = Math.floor(i / 2) + 7;
//   const minutos = i % 2 === 0 ? '00' : '30';
//   return `${hora.toString().padStart(2, '0')}:${minutos}`;
// });

type Usuario = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url?: string | null;
  faz_atendimento: boolean | null;
};

type Agendamento = {
  id: string;
  data_hora: string;
  cliente: string;
  servicos: any[];
  estabelecimento_id: string;
  observacoes?: string;
};

export default function AgendaScreen() {
  const { session, estabelecimentoId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [agendamentosMes, setAgendamentosMes] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPresencaModal, setShowPresencaModal] = useState(false);
  const [presencaUsuarios, setPresencaUsuarios] = useState<Record<string, boolean>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});
  
  // Novos estados para bloqueio de datas
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  const [diasSemanaBloqueados, setDiasSemanaBloqueados] = useState<number[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  const [novaDataBloqueada, setNovaDataBloqueada] = useState('');
  
  // Estado para mensagem de sucesso
  const [successMessage, setSuccessMessage] = useState('');
  
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
  const [agendamentosDoHorarioSelecionado, setAgendamentosDoHorarioSelecionado] = useState<Agendamento[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState('');

  // Estado para controlar a confirmação de exclusão
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    carregarUsuarios();
    
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
      console.log('Usuário atualizado, recarregando lista...');
      carregarUsuarios();
    });

    const subscription = supabase
      .channel('public:usuarios')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'usuarios' 
        }, 
        () => {
          console.log('Mudança detectada na tabela usuarios, recarregando...');
          carregarUsuarios();
        }
      )
      .subscribe();

    return () => {
      subscriptionPresenca.remove();
      subscriptionBloqueio.remove();
      subscriptionHorarios.remove();
      subscriptionUsuario.remove();
      subscription.unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    carregarAgendamentos();
  }, [selectedDate, selectedUser]);

  useEffect(() => {
    carregarAgendamentosMes();
  }, [selectedDate]);

  useEffect(() => {
    const marked: {[key: string]: any} = {};
    
    // Marcar a data selecionada
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    marked[selectedDateStr] = { selected: true, selectedColor: '#7C3AED' };
    
    // Marcar datas com agendamentos
    agendamentosMes.forEach(ag => {
      const dataAg = new Date(ag.data_hora);
      const dataStr = format(dataAg, 'yyyy-MM-dd');
      
      if (dataStr === selectedDateStr) {
        marked[dataStr] = { 
          ...marked[dataStr],
          marked: true, 
          dotColor: '#7C3AED'
        };
      } else {
        marked[dataStr] = { 
          ...marked[dataStr],
          marked: true, 
          dotColor: '#7C3AED'
        };
      }
    });
    
    // Marcar datas bloqueadas
    datasBloqueadas.forEach(data => {
      marked[data] = { 
        ...marked[data],
        selected: data === selectedDateStr ? true : false,
        disableTouchEvent: false,
        selectedColor: data === selectedDateStr ? '#7C3AED' : undefined,
        dotColor: '#FF6B6B',
        marked: true
      };
    });
    
    console.log('Datas marcadas:', Object.keys(marked).length);
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
      console.log('Recebido evento para atualizar agendamentos');
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
      console.log('Recebido evento de agendamento criado:', mensagem);
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
      
      console.log('Carregando usuários...');
      
      // Primeiro, obtém o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      // Busca os dados do usuário para obter o estabelecimento_id
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
        return;
      }

      if (!userData?.estabelecimento_id) {
        console.error('Usuário não tem estabelecimento associado');
        return;
      }

      // Agora busca os usuários do mesmo estabelecimento
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento')
        .eq('estabelecimento_id', userData.estabelecimento_id)
        .eq('faz_atendimento', true)
        .order('nome_completo');

      if (error) {
        console.error('Erro ao carregar usuários:', error);
        return;
      }

      console.log('Usuários encontrados:', usuarios?.length);
      console.log('Detalhes dos usuários:', usuarios);
      setUsuarios(usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarAgendamentos = async () => {
    try {
      setLoading(true);
      
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado');
        return;
      }
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0).toISOString())
        .lt('data_hora', new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59).toISOString());


      const { data, error } = await query;

      if (error) throw error;

      console.log('Agendamentos carregados:', data?.length || 0);
      console.log('Agendamentos brutos:', JSON.stringify(data));
      console.log('Estrutura do primeiro agendamento:', data?.[0] ? Object.keys(data[0]) : 'Nenhum agendamento');
      
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setAgendamentos([]); // Limpar os agendamentos em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const carregarAgendamentosMes = async () => {
    try {
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado');
        return;
      }
      
      // Determinar o primeiro e último dia do mês
      const primeiroDiaMes = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const ultimoDiaMes = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', primeiroDiaMes.toISOString())
        .lte('data_hora', ultimoDiaMes.toISOString());

      if (error) throw error;

      console.log('Agendamentos do mês carregados:', data?.length || 0);
      setAgendamentosMes(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos do mês:', error);
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

      // Se o usuário selecionado foi marcado como ausente, desseleciona ele
      if (selectedUser === usuarioId && !novoEstado[usuarioId]) {
        setSelectedUser(null);
      }

      // Emite o evento de atualização de presença
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

  // Função para carregar bloqueios salvos
  const carregarBloqueios = async () => {
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado ao carregar bloqueios');
        return;
      }
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado ao carregar bloqueios');
        return;
      }
      
      // Carregar dias da semana bloqueados
      const { data: diasData, error: diasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'dias_semana_bloqueados')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
        
      if (diasError) {
        console.error('Erro ao carregar dias bloqueados:', diasError);
      } else if (diasData && diasData.valor) {
        try {
          setDiasSemanaBloqueados(JSON.parse(diasData.valor));
        } catch (e) {
          console.error('Erro ao fazer parse dos dias bloqueados:', e);
        }
      }
      
      // Carregar datas específicas bloqueadas
      const { data: datasData, error: datasError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'datas_bloqueadas')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
        
      if (datasError) {
        console.error('Erro ao carregar datas bloqueadas:', datasError);
      } else if (datasData && datasData.valor) {
        try {
          setDatasBloqueadas(JSON.parse(datasData.valor));
        } catch (e) {
          console.error('Erro ao fazer parse das datas bloqueadas:', e);
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
    }
  };
  
  // Função para salvar bloqueios
  const salvarBloqueios = async () => {
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      if (!estabelecimentoId) throw new Error('Estabelecimento ID não encontrado');
      
      // Verificar se os registros já existem
      const { data: registros, error: checkError } = await supabase
        .from('configuracoes')
        .select('id, chave')
        .in('chave', ['dias_semana_bloqueados', 'datas_bloqueadas'])
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (checkError) {
        console.error('Erro ao verificar registros existentes:', checkError);
        if (checkError.code === '42P01') {
          alert('A tabela de configurações não existe. Entre em contato com o suporte.');
          throw checkError;
        }
      }
      
      // Mapeamento de chaves para registros existentes
      const registrosMap = (registros || []).reduce((acc, reg) => {
        acc[reg.chave] = reg.id;
        return acc;
      }, {} as Record<string, string>);
      
      // Salvar dias da semana bloqueados
      console.log('Salvando dias bloqueados:', diasSemanaBloqueados);
      
      const dias = JSON.stringify(diasSemanaBloqueados);
      let sucessoDias = false;
      
      if (registrosMap['dias_semana_bloqueados']) {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from('configuracoes')
          .update({ valor: dias })
          .eq('id', registrosMap['dias_semana_bloqueados']);
          
        if (updateError) {
          console.error('Erro ao atualizar dias bloqueados:', updateError);
        } else {
          sucessoDias = true;
        }
      } else {
        // Criar novo registro
        const { error: insertError } = await supabase
          .from('configuracoes')
          .insert({
            chave: 'dias_semana_bloqueados',
            valor: dias,
            estabelecimento_id: estabelecimentoId
          });
          
        if (insertError) {
          console.error('Erro ao inserir dias bloqueados:', insertError);
        } else {
          sucessoDias = true;
        }
      }
      
      // Salvar datas específicas
      console.log('Salvando datas bloqueadas:', datasBloqueadas);
      
      const datas = JSON.stringify(datasBloqueadas);
      let sucessoDatas = false;
      
      if (registrosMap['datas_bloqueadas']) {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from('configuracoes')
          .update({ valor: datas })
          .eq('id', registrosMap['datas_bloqueadas']);
          
        if (updateError) {
          console.error('Erro ao atualizar datas bloqueadas:', updateError);
        } else {
          sucessoDatas = true;
        }
      } else {
        // Criar novo registro
        const { error: insertError } = await supabase
          .from('configuracoes')
          .insert({
            chave: 'datas_bloqueadas',
            valor: datas,
            estabelecimento_id: estabelecimentoId
          });
          
        if (insertError) {
          console.error('Erro ao inserir datas bloqueadas:', insertError);
        } else {
          sucessoDatas = true;
        }
      }
      
      if (sucessoDias && sucessoDatas) {
        console.log('Bloqueios salvos com sucesso!');
        alert('Bloqueios salvos com sucesso!');
      } else {
        throw new Error('Não foi possível salvar todos os bloqueios');
      }
    } catch (error: any) {
      console.error('Erro ao salvar bloqueios:', error);
      console.error('Detalhes adicionais:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar: ${error.message || 'Verifique o console para mais detalhes'}`);
    }
  };
  
  // Função para alternar dia da semana
  const toggleDiaSemana = (dia: number) => {
    setDiasSemanaBloqueados(prev => {
      if (prev.includes(dia)) {
        return prev.filter(d => d !== dia);
      } else {
        return [...prev, dia];
      }
    });
  };
  
  // Função para adicionar data específica
  const adicionarDataBloqueada = () => {
    if (!novaDataBloqueada) return;
    
    try {
      // Parse manual da data no formato DD/MM/YYYY
      const [diaStr, mesStr, anoStr] = novaDataBloqueada.split('/');
      const dia = Number(diaStr);
      const mes = Number(mesStr);
      const ano = Number(anoStr);
      const parsedDate = new Date(ano, mes - 1, dia);
      
      if (!isValid(parsedDate)) {
        console.error('Data inválida');
        return;
      }
      
      const dataFormatada = format(parsedDate, 'yyyy-MM-dd');
      
      if (!datasBloqueadas.includes(dataFormatada)) {
        setDatasBloqueadas(prev => [...prev, dataFormatada]);
        setNovaDataBloqueada('');
      }
    } catch (error) {
      console.error('Erro ao adicionar data:', error);
    }
  };
  
  // Função para remover data específica
  const removerDataBloqueada = (data: string) => {
    setDatasBloqueadas(prev => prev.filter(d => d !== data));
  };
  
  // Função para formatar a entrada da data
  const formatarDataInput = (text: string) => {
    // Remove caracteres não numéricos
    const numerico = text.replace(/[^0-9]/g, '');
    
    // Aplica a máscara DD/MM/YYYY
    if (numerico.length <= 2) {
      return numerico;
    } else if (numerico.length <= 4) {
      return `${numerico.slice(0, 2)}/${numerico.slice(2)}`;
    } else {
      return `${numerico.slice(0, 2)}/${numerico.slice(2, 4)}/${numerico.slice(4, 8)}`;
    }
  };

  // Verificar se uma data está bloqueada
  const isDataBloqueada = (data: Date) => {
    // Verifica se o dia da semana está bloqueado
    const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    if (diasSemanaBloqueados.includes(diaSemana)) {
      return true;
    }
    
    // Verifica se a data específica está bloqueada
    const dataStr = format(data, 'yyyy-MM-dd');
    return datasBloqueadas.includes(dataStr);
  };

  // Função para carregar configurações de horários
  const carregarHorarios = async () => {
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado ao carregar horários');
        // Inicializar com valores padrão
        inicializarHorariosPadrao();
        return;
      }
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado ao carregar horários');
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
          'intervalo_agendamentos',
          'limite_simultaneos'
        ])
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (error) {
        console.error('Erro ao carregar configurações de horários:', error);
        // Inicializar com valores padrão
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
            case 'limite_simultaneos':
              setLimiteSimultaneos(config.valor || '1');
              break;
          }
        });
      }
      
      // Se não houve atualização, inicializar com valores padrão
      if (!foiAtualizado) {
        inicializarHorariosPadrao();
      } else {
        // Atualizar a lista de horários baseada nas configurações
        atualizarListaHorarios();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de horários:', error);
      // Inicializar com valores padrão
      inicializarHorariosPadrao();
    }
  };
  
  // Função para inicializar os horários com valores padrão
  const inicializarHorariosPadrao = () => {
    const horariosIniciais = Array.from({ length: 22 }, (_, i) => {
      const hora = Math.floor(i / 2) + 8; // 8:00 a 18:30
      const minutos = i % 2 === 0 ? '00' : '30';
      return `${hora.toString().padStart(2, '0')}:${minutos}`;
    });
    setHorarios(horariosIniciais);
  };
  
  // Atualizar a função atualizarListaHorarios para atualizar o estado horarios
  const atualizarListaHorarios = () => {
    try {
      console.log('Atualizando lista de horários com as configurações:');
      console.log(`- Horário início: ${horarioInicio}`);
      console.log(`- Horário fim: ${horarioFim}`);
      console.log(`- Tem intervalo: ${temIntervalo}`);
      if (temIntervalo) {
        console.log(`- Intervalo início: ${horarioIntervaloInicio}`);
        console.log(`- Intervalo fim: ${horarioIntervaloFim}`);
      }
      console.log(`- Intervalo entre agendamentos: ${intervaloAgendamentos} minutos`);
      console.log(`- Limite de agendamentos simultâneos: ${limiteSimultaneos}`);
      
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
        // Pular horários durante o intervalo
        if (temIntervalo && i >= intervaloInicioMinutos && i < intervaloFimMinutos) {
          console.log(`Pulando horário ${converterMinutosParaHora(i)} (dentro do intervalo)`);
          continue;
        }
        
        novosHorarios.push(converterMinutosParaHora(i));
      }
      
      // Atualizar o estado com os novos horários
      setHorarios(novosHorarios);
      console.log('Lista de horários atualizada:', novosHorarios.length);
      console.log('Horários gerados:', novosHorarios.join(', '));
    } catch (error) {
      console.error('Erro ao atualizar lista de horários:', error);
      inicializarHorariosPadrao();
    }
  };
  
  // Adicionar useEffect para atualizar a lista de horários quando as configurações mudarem
  useEffect(() => {
    atualizarListaHorarios();
  }, [horarioInicio, horarioFim, intervaloAgendamentos, temIntervalo, horarioIntervaloInicio, horarioIntervaloFim]);
  
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
  
  // Função para formatar a entrada de hora
  const formatarHoraInput = (text: string) => {
    // Remove caracteres não numéricos
    const numeros = text.replace(/[^0-9]/g, '');
    
    // Aplica a máscara HH:MM
    if (numeros.length <= 2) {
      return numeros;
    } else {
      return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
    }
  };

  // Função para salvar configurações de horários
  const salvarHorarios = async () => {
    try {
      // Validar horários
      if (!validarHorarios()) {
        return;
      }
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      if (!estabelecimentoId) throw new Error('Estabelecimento ID não encontrado');
      
      // Preparar configurações para salvar
      const configs = [
        { chave: 'horario_inicio', valor: horarioInicio },
        { chave: 'horario_fim', valor: horarioFim },
        { chave: 'intervalo_agendamentos', valor: intervaloAgendamentos },
        { chave: 'limite_simultaneos', valor: limiteSimultaneos }
      ];
      
      // Adicionar configurações de intervalo se habilitado
      if (temIntervalo) {
        configs.push({ chave: 'horario_intervalo_inicio', valor: horarioIntervaloInicio });
        configs.push({ chave: 'horario_intervalo_fim', valor: horarioIntervaloFim });
      } else {
        configs.push({ chave: 'horario_intervalo_inicio', valor: '' });
        configs.push({ chave: 'horario_intervalo_fim', valor: '' });
      }
      
      // Verificar se os registros já existem
      const { data: registros, error: checkError } = await supabase
        .from('configuracoes')
        .select('id, chave')
        .in('chave', configs.map(c => c.chave))
        .eq('estabelecimento_id', estabelecimentoId);
        
      if (checkError) {
        console.error('Erro ao verificar registros existentes:', checkError);
        if (checkError.code === '42P01') {
          alert('A tabela de configurações não existe. Entre em contato com o suporte.');
          throw checkError;
        }
      }
      
      // Mapeamento de chaves para registros existentes
      const registrosMap = (registros || []).reduce((acc, reg) => {
        acc[reg.chave] = reg.id;
        return acc;
      }, {} as Record<string, string>);
      
      // Salvar cada configuração
      const promises = configs.map(async (config) => {
        const { chave, valor } = config;
        
        if (registrosMap[chave]) {
          // Atualizar registro existente
          const { error } = await supabase
            .from('configuracoes')
            .update({ valor })
            .eq('id', registrosMap[chave]);
            
          if (error) {
            console.error(`Erro ao atualizar configuração ${chave}:`, error);
            return false;
          }
          return true;
        } else {
          // Criar novo registro
          const { error } = await supabase
            .from('configuracoes')
            .insert({
              chave,
              valor,
              estabelecimento_id: estabelecimentoId
            });
            
          if (error) {
            console.error(`Erro ao inserir configuração ${chave}:`, error);
            return false;
          }
          return true;
        }
      });
      
      // Aguardar todas as operações
      const resultados = await Promise.all(promises);
      
      if (resultados.every(r => r === true)) {
        console.log('Configurações de horários salvas com sucesso!');
        alert('Configurações de horários salvas com sucesso!');
        
        // Fechar o modal
        setShowHorariosModal(false);
        
        // Atualizar a lista de horários
        atualizarListaHorarios();
      } else {
        throw new Error('Não foi possível salvar todas as configurações');
      }
    } catch (error: any) {
      console.error('Erro ao salvar configurações de horários:', error);
      console.error('Detalhes adicionais:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar: ${error.message || 'Verifique o console para mais detalhes'}`);
    }
  };

  // Função para validar os horários
  const validarHorarios = () => {
    try {
      // Validar formato dos horários
      const regexHora = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      
      if (!regexHora.test(horarioInicio)) {
        alert('Horário de início inválido. Use o formato HH:MM.');
        return false;
      }
      
      if (!regexHora.test(horarioFim)) {
        alert('Horário de encerramento inválido. Use o formato HH:MM.');
        return false;
      }
      
      // Validar intervalo
      if (temIntervalo) {
        if (!regexHora.test(horarioIntervaloInicio)) {
          alert('Horário de início do intervalo inválido. Use o formato HH:MM.');
          return false;
        }
        
        if (!regexHora.test(horarioIntervaloFim)) {
          alert('Horário de fim do intervalo inválido. Use o formato HH:MM.');
          return false;
        }
        
        // Validar que o intervalo está dentro do horário de funcionamento
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
      
      // Validar que o horário de início é antes do horário de fim
      const inicio = converterHoraParaMinutos(horarioInicio);
      const fim = converterHoraParaMinutos(horarioFim);
      
      if (inicio >= fim) {
        alert('O horário de início deve ser antes do horário de encerramento.');
        return false;
      }
      
      // Validar intervalo entre agendamentos
      const intervalo = parseInt(intervaloAgendamentos);
      if (isNaN(intervalo) || intervalo <= 0) {
        alert('O intervalo entre agendamentos deve ser um número positivo.');
        return false;
      }
      
      // Validar limite de agendamentos simultâneos
      const limite = parseInt(limiteSimultaneos);
      if (isNaN(limite) || limite <= 0) {
        alert('O limite de agendamentos simultâneos deve ser um número positivo.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro na validação de horários:', error);
      alert('Erro ao validar horários. Verifique o formato e tente novamente.');
      return false;
    }
  };

  // Nova função para abrir modal de detalhes de agendamentos
  const abrirModalAgendamentos = (horario: string, agendamentosDoHorario: Agendamento[]) => {
    setHorarioSelecionado(horario);
    setAgendamentosDoHorarioSelecionado(agendamentosDoHorario);
    setShowAgendamentosModal(true);
  };

  // Função para iniciar o processo de exclusão
  const iniciarExclusao = (agendamentoId: string) => {
    setAgendamentoParaExcluir(agendamentoId);
  };

  // Função para confirmar a exclusão
  const confirmarExclusao = async () => {
    if (!agendamentoParaExcluir) return;
    
    try {
      // Iniciar exclusão
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoParaExcluir);
        
      if (error) throw error;
      
      // Remover o agendamento da lista local
      const novosAgendamentosDoHorario = agendamentosDoHorarioSelecionado.filter(
        ag => ag.id !== agendamentoParaExcluir
      );
      
      setAgendamentosDoHorarioSelecionado(novosAgendamentosDoHorario);
      
      // Se não há mais agendamentos no horário, fechar o modal
      if (novosAgendamentosDoHorario.length === 0) {
        setShowAgendamentosModal(false);
      }
      
      // Recarregar os agendamentos da tela
      carregarAgendamentos();
      carregarAgendamentosMes();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage('Agendamento excluído com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error: any) {
      console.error('Erro ao excluir agendamento:', error);
      alert(`Erro ao excluir agendamento: ${error.message}`);
    } finally {
      // Limpar o agendamento para exclusão
      setAgendamentoParaExcluir(null);
    }
  };

  // Função para cancelar a exclusão
  const cancelarExclusao = () => {
    setAgendamentoParaExcluir(null);
  };

  return (
    <View style={styles.container}>
      {/* Seletor de data */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => navegarData('anterior')}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dateContainer}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar-outline" size={20} color="#000" />
          <Text style={styles.dateText}>
            {format(selectedDate, "EEE, dd/MM/yyyy")}
          </Text>
          <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navegarData('proximo')}>
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Calendário */}
      {showCalendar && (
        <TouchableOpacity
          style={styles.calendarOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.calendarContainer}
            onPress={(e) => e.stopPropagation()} // Prevenir que o clique se propague
          >
            <Calendar
              current={formatSelectedDateString()}
              onDayPress={handleDateSelect}
              markedDates={markedDates}
              theme={{
                selectedDayBackgroundColor: '#7C3AED',
                todayTextColor: '#7C3AED',
                arrowColor: '#7C3AED',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Lista de avatares */}
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
                    <Ionicons name="person" size={24} color="#666" />
                  )}
                </View>
                <Text style={styles.avatarName}>{usuario.nome_completo}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Grade de horários */}
      <ScrollView style={styles.timeGrid}>
        {isDataBloqueada(selectedDate) ? (
          <View style={styles.diaBloqueadoContainer}>
            <Ionicons name="sunny-outline" size={48} color="#FF6B6B" />
            <Text style={styles.diaBloqueadoText}>Dia Bloqueado</Text>
            <Text style={styles.diaBloqueadoSubtext}>Não são permitidos agendamentos para este dia</Text>
          </View>
        ) : (
          horarios.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Carregando horários...</Text>
            </View>
          ) : (
            horarios.map((horario) => {
              // Converte horário formato 'HH:MM' para horas e minutos como números
              const [horasSlot, minutosSlot] = horario.split(':').map(Number);
              
              // Busca um agendamento que corresponda aproximadamente a este horário
              const agendamentoNoHorario = agendamentos.find(ag => {
                const dataAg = new Date(ag.data_hora);
                const horasAg = dataAg.getHours();
                const minutosAg = dataAg.getMinutes();
                
                // Verifica se o horário do agendamento está dentro de um intervalo de 30 minutos
                return horasAg === horasSlot && 
                       Math.abs(minutosAg - minutosSlot) < 30;
              });
              
              // Verificar se este horário já atingiu o limite de agendamentos simultâneos
              const limiteAtingido = (() => {
                if (!agendamentoNoHorario) return false;
                
                // Contar quantos agendamentos existem no mesmo horário
                const horarioExato = `${horasSlot.toString().padStart(2, '0')}:${minutosSlot.toString().padStart(2, '0')}`;
                const limite = parseInt(limiteSimultaneos);
                
                const contagem = agendamentos.filter(ag => {
                  const dataAg = new Date(ag.data_hora);
                  const horasAg = dataAg.getHours();
                  const minutosAg = dataAg.getMinutes();
                  
                  return horasAg === horasSlot && Math.abs(minutosAg - minutosSlot) < 30;
                }).length;
                
                return contagem >= limite;
              })();

              // Obter todos os agendamentos deste horário
              const agendamentosDoHorario = agendamentos.filter(ag => {
                const dataAg = new Date(ag.data_hora);
                const horasAg = dataAg.getHours();
                const minutosAg = dataAg.getMinutes();
                
                return horasAg === horasSlot && Math.abs(minutosAg - minutosSlot) < 30;
              });

              const temMultiplosAgendamentos = agendamentosDoHorario.length > 1;

              return (
                <TouchableOpacity 
                  key={horario} 
                  style={styles.timeSlot}
                  onPress={() => agendamentoNoHorario ? abrirModalAgendamentos(horario, agendamentosDoHorario) : null}
                  disabled={!agendamentoNoHorario}
                >
                  <Text style={styles.timeText}>{horario}</Text>
                  <View style={[
                    styles.timeLine,
                    agendamentoNoHorario && styles.timeLineAgendado,
                    limiteAtingido && styles.timeLineLimite,
                    temMultiplosAgendamentos && styles.timeLineMultiplo,
                    agendamentoNoHorario && !temMultiplosAgendamentos && styles.timeLineUnico
                  ]}>
                    {agendamentoNoHorario && (
                      <View style={styles.agendamentoInfo}>
                        {temMultiplosAgendamentos ? (
                          <>
                            <View style={styles.agendamentoHeader}>
                              <Text style={styles.agendamentoCliente}>
                                {agendamentoNoHorario.cliente}
                              </Text>
                              <View style={styles.agendamentoCounter}>
                                <Text style={styles.agendamentoCounterText}>
                                  {agendamentosDoHorario.length}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.agendamentoServicos}>
                              {JSON.stringify(agendamentoNoHorario.servicos)?.includes('nome') 
                                ? agendamentoNoHorario.servicos.map((s:any) => s.nome).join(', ')
                                : 'Serviço não especificado'}
                            </Text>
                            <View style={styles.agendamentoMultiploContainer}>
                              <Text style={styles.agendamentoMultiplo}>
                                +{agendamentosDoHorario.length - 1} outros agendamentos
                              </Text>
                              <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.agendamentoHeader}>
                              <Text style={styles.agendamentoCliente}>{agendamentoNoHorario.cliente}</Text>
                            </View>
                            <Text style={styles.agendamentoServicos}>
                              {JSON.stringify(agendamentoNoHorario.servicos)?.includes('nome') 
                                ? agendamentoNoHorario.servicos.map((s:any) => s.nome).join(', ')
                                : 'Serviço não especificado'}
                            </Text>
                            {limiteAtingido && (
                              <Text style={styles.agendamentoLimite}>Limite atingido</Text>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>

      <Modal
        visible={showPresencaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPresencaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Presença</Text>
              <TouchableOpacity 
                onPress={() => setShowPresencaModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
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
                        <Ionicons name="person" size={20} color="#666" />
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
          </View>
        </View>
      </Modal>

      {/* Modal de Bloqueio de Datas */}
      <Modal
        visible={showBloqueioModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBloqueioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Bloqueios</Text>
              <TouchableOpacity 
                onPress={() => setShowBloqueioModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalSubtitle}>Dias da Semana Bloqueados</Text>
              <View style={styles.diasSemanaContainer}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.diaSemanaItem,
                      diasSemanaBloqueados.includes(index) && styles.diaSemanaSelected
                    ]}
                    onPress={() => toggleDiaSemana(index)}
                  >
                    <Text style={[
                      styles.diaSemanaText,
                      diasSemanaBloqueados.includes(index) && styles.diaSemanaTextSelected
                    ]}>
                      {dia}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={[styles.modalSubtitle, { marginTop: 20 }]}>Datas Específicas</Text>
              <View style={styles.dataInputContainer}>
                <TextInput
                  style={styles.dataInput}
                  value={novaDataBloqueada}
                  onChangeText={(text) => setNovaDataBloqueada(formatarDataInput(text))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity 
                  style={styles.dataAddButton}
                  onPress={adicionarDataBloqueada}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.datasBloqueadasList}>
                {datasBloqueadas.map((data, index) => {
                  // Parse manual de yyyy-MM-dd
                  const [anoStr, mesStr, diaStr] = data.split('-');
                  const parsedDate = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr));
                  const dataFormatada = format(parsedDate, 'dd/MM/yyyy');
                  
                  return (
                    <View key={index} style={styles.dataBloqueadaItem}>
                      <Text style={styles.dataBloqueadaText}>{dataFormatada}</Text>
                      <TouchableOpacity
                        style={styles.dataRemoveButton}
                        onPress={() => removerDataBloqueada(data)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#C62828" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              
              <TouchableOpacity 
                style={styles.salvarButton}
                onPress={() => {
                  salvarBloqueios();
                  setShowBloqueioModal(false);
                }}
              >
                <Text style={styles.salvarButtonText}>Salvar Bloqueios</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuração de Horários */}
      <Modal
        visible={showHorariosModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHorariosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Horários</Text>
              <TouchableOpacity 
                onPress={() => setShowHorariosModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
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
                  placeholderTextColor="#9CA3AF"
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
                  placeholderTextColor="#9CA3AF"
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
                        placeholderTextColor="#9CA3AF"
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
                        placeholderTextColor="#9CA3AF"
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
                  {['15', '30', '60', '120'].map((valor) => (
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
                    <Ionicons name="remove" size={20} color="#7C3AED" />
                  </TouchableOpacity>
                  
                  <Text style={styles.counterValue}>{limiteSimultaneos}</Text>
                  
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const atual = parseInt(limiteSimultaneos);
                      setLimiteSimultaneos((atual + 1).toString());
                    }}
                  >
                    <Ionicons name="add" size={20} color="#7C3AED" />
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
          </View>
        </View>
      </Modal>

      {/* Botão de adicionar agendamento */}
      <TouchableOpacity
        style={[styles.addButton, { opacity: 0 }]}
        onPress={() => router.push('/(app)/agenda/novo')}
      >
        <Ionicons name="add" size={30} color="#fff" />
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {agendamentosDoHorarioSelecionado.length > 1 
                  ? `${agendamentosDoHorarioSelecionado.length} Agendamentos às ${horarioSelecionado}`
                  : `Agendamento às ${horarioSelecionado}`
                }
              </Text>
              <TouchableOpacity 
                onPress={() => setShowAgendamentosModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={agendamentosDoHorarioSelecionado}
              keyExtractor={(item) => item.id}
              renderItem={({item, index}) => (
                <View style={styles.agendamentoModalItem}>
                  <View style={styles.agendamentoModalHeader}>
                    <Text style={styles.agendamentoModalCliente}>{item.cliente}</Text>
                    <Text style={styles.agendamentoModalNumero}>{index + 1}/{agendamentosDoHorarioSelecionado.length}</Text>
                  </View>
                  
                  <View style={styles.agendamentoModalServicos}>
                    <Text style={styles.agendamentoModalServicosLabel}>Serviços:</Text>
                    {JSON.stringify(item.servicos)?.includes('nome') ? (
                      item.servicos.map((servico: any, i: number) => (
                        <Text key={i} style={styles.agendamentoModalServicoItem}>
                          • {servico.nome}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.agendamentoModalServicoItem}>
                        • Serviço não especificado
                      </Text>
                    )}
                  </View>
                  
                  {item.observacoes && (
                    <View style={styles.agendamentoModalObservacoes}>
                      <Text style={styles.agendamentoModalObservacoesLabel}>Observações:</Text>
                      <Text style={styles.agendamentoModalObservacoesText}>{item.observacoes}</Text>
                    </View>
                  )}
                  
                  <View style={styles.agendamentoModalFooter}>
                    <Text style={styles.agendamentoModalHorario}>
                      <Ionicons name="time-outline" size={14} color="#666" /> {format(new Date(item.data_hora), 'HH:mm')}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.agendamentoDeleteButton}
                      onPress={() => iniciarExclusao(item.id)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="trash-outline" size={22} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.flatlistContent}
              ItemSeparatorComponent={() => <View style={styles.agendamentoModalDivider} />}
              showsVerticalScrollIndicator={true}
            />
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
              <TouchableOpacity 
                onPress={() => setAgendamentoParaExcluir(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalList}>
              <Text style={styles.modalSubtitle}>Tem certeza que deseja excluir este agendamento?</Text>
              
              <View style={styles.confirmationButtonsContainer}>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => confirmarExclusao()}
                >
                  <Text style={styles.deleteButtonText}>Sim, excluir</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelarButton}
                  onPress={() => cancelarExclusao()}
                >
                  <Text style={styles.cancelarButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 12,
  },
  dateText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 8,
  },
  avatarListContainer: {
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    backgroundColor: '#FFF9E6',
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarName: {
    marginTop: 4,
    fontSize: 12,
  },
  timeGrid: {
    flex: 1,
    paddingHorizontal: 16,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  timeText: {
    width: 50,
    fontSize: 12,
    color: '#666',
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 8,
  },
  timeLineAgendado: {
    backgroundColor: '#F3E8FF',
    height: '100%',
    padding: 4,
  },
  timeLineLimite: {
    backgroundColor: '#FFEDD5',
  },
  timeLineMultiplo: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  timeLineUnico: {
    backgroundColor: '#F3E8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  agendamentoInfo: {
    flex: 1,
    padding: 4,
  },
  agendamentoCliente: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  agendamentoServicos: {
    fontSize: 10,
    color: '#666',
  },
  agendamentoLimite: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F97316',
  },
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agendamentoCounter: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  agendamentoCounterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  agendamentoMultiplo: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '500',
  },
  agendamentoMultiploContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#fff',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalList: {
    backgroundColor: '#F5F7FA',
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
    borderBottomColor: '#eee',
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presencaUserName: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#E8F5E9',
  },
  ausente: {
    backgroundColor: '#FFEBEE',
  },
  presencaStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  presenteText: {
    color: '#2E7D32',
  },
  ausenteText: {
    color: '#C62828',
  },
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 900,
  },
  calendarContainer: {
    position: 'absolute',
    top: 60, // Posicionar abaixo da barra de navegação
    left: 10,
    right: 10, 
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
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
    color: '#333',
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
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  diaSemanaSelected: {
    backgroundColor: '#7C3AED',
  },
  diaSemanaText: {
    fontSize: 14,
    color: '#666',
  },
  diaSemanaTextSelected: {
    color: '#fff',
  },
  dataInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dataInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  dataAddButton: {
    backgroundColor: '#7C3AED',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dataBloqueadaText: {
    fontSize: 16,
    color: '#333',
  },
  dataRemoveButton: {
    padding: 4,
  },
  salvarButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  salvarButtonText: {
    color: '#fff',
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
    color: '#FF6B6B',
    marginBottom: 8,
  },
  diaBloqueadoSubtext: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#7C3AED',
  },
  switchOff: {
    backgroundColor: '#D1D5DB',
  },
  switchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
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
    backgroundColor: '#F5F5F5',
  },
  selectOptionSelected: {
    backgroundColor: '#7C3AED',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#4B5563',
  },
  selectOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7C3AED',
    marginTop: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7C3AED',
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#FFF',
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
    marginBottom: 8,
  },
  agendamentoModalCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  agendamentoModalNumero: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  agendamentoModalServicos: {
    marginLeft: 4,
    backgroundColor: '#F9FAFB',
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
    color: '#666',
    marginLeft: 8,
    marginBottom: 4,
  },
  agendamentoModalObservacoes: {
    marginLeft: 4,
    backgroundColor: '#F9FAFB',
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
    color: '#666',
  },
  agendamentoModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  agendamentoModalHorario: {
    fontSize: 12,
    color: '#666',
  },
  agendamentoDeleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  agendamentoModalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agendamentoUnicoText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
}); 