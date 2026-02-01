import React, { useState, useEffect , useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, Dimensions, Linking } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { logger } from '../../../utils/logger';
import { Cliente as ClienteBase } from '@types';
import { formatarTelefoneInput, formatarDataInput, somenteNumeros } from '../../../utils/validators';
import { offlineUpdate, offlineDelete, getOfflineFeedback } from '../../../services/offlineSupabase';
import { CacheManager, CacheNamespaces } from '../../../utils/cacheManager';

type ClienteDetalhes = Pick<ClienteBase, 'id' | 'nome' | 'telefone' | 'email' | 'observacoes' | 'estabelecimento_id'> & {
  foto_url: string | null;
  data_nascimento?: string;
  created_at?: string;
};

export default function EditarClienteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { estabelecimentoId, user } = useAuth();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dados');
  const [cliente, setCliente] = useState<ClienteDetalhes | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [dataNascimento, setDataNascimento] = useState('');

  // Estados para as outras abas
  const [saldoAtual, setSaldoAtual] = useState('0,00');
  const [modalCreditoVisible, setModalCreditoVisible] = useState(false);
  const [modalExtratoVisible, setModalExtratoVisible] = useState(false);
  const [extrato, setExtrato] = useState<{ data: string; valor: number; descricao: string; tipo: string; usuario?: string }[]>([]);
  const [valorCredito, setValorCredito] = useState('');
  const [descricaoCredito, setDescricaoCredito] = useState('');
  const [dataCredito, setDataCredito] = useState<string>('');
  const [salvandoCredito, setSalvandoCredito] = useState(false);
  const [tipoCredito, setTipoCredito] = useState<'credito' | 'debito'>('credito');
  const valorInputRef = useRef<TextInput>(null);
  const [agendamentos, setAgendamentos] = useState<{ id: string; data: string; hora: string; servico: string; status: string; usuario: string }[]>([]);
  const [historico, setHistorico] = useState<{ id: string; data: string; servico: string; valor: number; profissional: string; status: string }[]>([]);
  const [pacotes, setPacotes] = useState<{ id: string; nome: string; valor: number; sessoes_total: number; sessoes_usadas: number; validade: string; ativo: boolean }[]>([]);
  const [comandas, setComandas] = useState<{ id: string; data: string; valor: number; status: string; itens_count: number }[]>([]);
  const [galeria, setGaleria] = useState<{ id: string; url: string; data: string; descricao: string }[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  
  // Estados para estatísticas do cliente
  const [estatisticas, setEstatisticas] = useState({
    total_visitas: 0,
    total_gasto: 0,
    ticket_medio: 0,
    ultima_visita: '',
    servicos_favoritos: [] as { nome: string; quantidade: number }[],
  });
  const [modalInfoVisible, setModalInfoVisible] = useState(false);
  const [loadingModalInfo, setLoadingModalInfo] = useState(false);

  // Estado para modal de detalhes do agendamento
  const [modalAgendamentoVisible, setModalAgendamentoVisible] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);

  // Estado para modal de detalhes do histórico
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<any>(null);

  // Estado para modal de visualização de foto
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [fotoSelecionada, setFotoSelecionada] = useState<any>(null);

  const abrirModalInfo = async () => {
    setModalInfoVisible(true);
    setLoadingModalInfo(true);
    await carregarEstatisticas();
    setLoadingModalInfo(false);
  };

  useEffect(() => {
    carregarCliente();
  }, [id]);

  // Calcula saldo sempre que cliente muda ou quando activeTab for 'saldo'
  useEffect(() => {
    const calcularSaldo = async () => {
      if (!cliente?.id) return;
      const { data, error } = await supabase
        .from('crediario_movimentacoes')
        .select('valor')
        .eq('cliente_id', cliente.id);
      if (!error && data) {
        const soma = data.reduce((acc, mov) => acc + (typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor)), 0);
        setSaldoAtual(soma.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      }
    };
    calcularSaldo();
  }, [cliente, activeTab]);

  const carregarCliente = async () => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error) {
        logger.error('Erro ao carregar cliente:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do cliente');
        return;
      }

      if (data) {
        setCliente(data);
        setNome(data.nome);
        setTelefone(data.telefone);
        setEmail(data.email || '');
        setObservacoes(data.observacoes || '');
        setFotoUrl(data.foto_url);
        
        if (data.data_nascimento) {
          const [ano, mes, dia] = data.data_nascimento.split('-');
          setDataNascimento(`${dia}/${mes}/${ano}`);
        } else {
          setDataNascimento('');
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar os dados do cliente');
    } finally {
      setCarregando(false);
    }
  };

  const selecionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setFoto(result.assets[0].base64);
      }
    } catch (error) {
      logger.error('Erro ao selecionar foto:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    }
  };

  const formatarTelefone = (telefone: string) => {
    const numeroLimpo = somenteNumeros(telefone);
    const numeroBR = numeroLimpo.replace(/^55/, '');
    if (numeroBR.length < 10) return null;
    return numeroBR.slice(-11);
  };

  const excluirCliente = async () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Erro', 'Usuário não autenticado');
                return;
              }

              const { error, fromCache } = await offlineDelete(
                'clientes',
                id as string,
                estabelecimentoId!
              );

              if (error) {
                logger.error('Erro ao excluir cliente:', error);
                Alert.alert('Erro', 'Não foi possível excluir o cliente');
                return;
              }

              // Limpar cache da lista de clientes para forçar atualização
              if (estabelecimentoId) {
                const cacheKey = `lista_${estabelecimentoId}`;
                await CacheManager.remove(CacheNamespaces.CLIENTES, cacheKey);
              }

              const feedback = getOfflineFeedback(fromCache, 'delete');
              Alert.alert(feedback.title, feedback.message);
              router.back();
            } catch (error) {
              logger.error('Erro ao excluir cliente:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o cliente');
            }
          }
        }
      ]
    );
  };

  const salvarCliente = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório.');
      return;
    }

    const telefoneFormatado = formatarTelefone(telefone);
    if (!telefoneFormatado) {
      Alert.alert('Atenção', 'Digite um número de telefone válido.');
      return;
    }

    // Validar data de nascimento se preenchida
    let dataFormatada = null;
    if (dataNascimento.trim()) {
      const [dia, mes, ano] = dataNascimento.split('/');
      
      // Validar se a data é válida
      const dataValida = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
      
      if (isNaN(dataValida.getTime())) {
        Alert.alert('Atenção', 'Data de nascimento inválida.');
        return;
      }
      
      // Formatar para ISO 8601 (YYYY-MM-DD) usando UTC
      dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    try {
      setSalvando(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      let nova_foto_url = fotoUrl;
      if (foto) {
        const fotoNome = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .upload(fotoNome, decode(foto), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          logger.error('Erro ao fazer upload da foto:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fotoNome);
          nova_foto_url = publicUrl;
        }
      }

      const { error, fromCache } = await offlineUpdate(
        'clientes',
        id as string,
        {
          nome: nome.trim(),
          telefone: telefoneFormatado,
          email: email.trim() || null,
          observacoes: observacoes.trim() || null,
          foto_url: nova_foto_url,
          data_nascimento: dataFormatada,
        },
        estabelecimentoId!
      );

      if (error) {
        logger.error('Erro ao atualizar cliente:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o cliente');
        return;
      }

      // Limpar cache da lista de clientes para forçar atualização
      if (estabelecimentoId) {
        const cacheKey = `lista_${estabelecimentoId}`;
        await CacheManager.remove(CacheNamespaces.CLIENTES, cacheKey);
      }

      const feedback = getOfflineFeedback(fromCache, 'update');
      Alert.alert(
        feedback.title,
        feedback.message,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Erro ao atualizar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o cliente');
    } finally {
      setSalvando(false);
    }
  };

  // Carregar dados quando mudar de aba
  useEffect(() => {
    if (cliente?.id) {
      carregarDadosDaAba(activeTab);
    }
  }, [activeTab, cliente]);

  const carregarDadosDaAba = async (aba: string) => {
    if (!cliente?.id) return;
    setLoadingTab(true);

    try {
      switch (aba) {
        case 'dados':
          await carregarEstatisticas();
          break;
        case 'agendamentos':
          await carregarAgendamentos();
          break;
        case 'historico':
          await carregarHistorico();
          break;
        case 'pacotes':
          await carregarPacotes();
          break;
        case 'comandas':
          await carregarComandas();
          break;
        case 'fotos':
          await carregarGaleria();
          break;
      }
    } catch (error) {
      logger.error('Erro ao carregar dados da aba:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const carregarEstatisticas = async () => {
    if (!cliente?.id) return;

    try {
      // Total de comandas fechadas (visitas)
      const { data: comandasData, count: totalVisitas } = await supabase
        .from('comandas')
        .select('id, valor_total, created_at', { count: 'exact' })
        .eq('cliente_id', cliente.id)
        .eq('status', 'fechada')
        .order('created_at', { ascending: false });

      const totalGasto = comandasData?.reduce((sum, c) => sum + (c.valor_total || 0), 0) || 0;
      const ticketMedio = totalVisitas && totalVisitas > 0 ? totalGasto / totalVisitas : 0;
      const ultimaVisita = comandasData && comandasData.length > 0 ? comandasData[0].created_at : '';

      // Serviços mais realizados
      const { data: servicosData } = await supabase
        .from('comandas_itens')
        .select('nome, comanda_id')
        .in('comanda_id', comandasData?.map(c => c.id) || [])
        .eq('tipo', 'servico');

      const servicosContagem: { [key: string]: number } = {};
      servicosData?.forEach(item => {
        servicosContagem[item.nome] = (servicosContagem[item.nome] || 0) + 1;
      });

      const servicosFavoritos = Object.entries(servicosContagem)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      setEstatisticas({
        total_visitas: totalVisitas || 0,
        total_gasto: totalGasto,
        ticket_medio: ticketMedio,
        ultima_visita: ultimaVisita,
        servicos_favoritos: servicosFavoritos,
      });
    } catch (error) {
      logger.error('Erro ao carregar estatísticas:', error);
    }
  };

  const carregarAgendamentos = async () => {
    if (!cliente?.id || !estabelecimentoId) return;

    try {
      console.log('🔍 Buscando agendamentos para:', { 
        cliente_id: cliente.id, 
        cliente_nome: cliente.nome,
        estabelecimento: estabelecimentoId 
      });

      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          servicos,
          status,
          observacoes,
          usuario_id,
          usuarios:usuario_id(nome_completo)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .or(`cliente_id.eq.${cliente.id},cliente.eq.${cliente.nome}`)
        .order('data_hora', { ascending: false })
        .limit(50);

      console.log('📋 Resultado da query:', { 
        total: agendamentosData?.length || 0,
        erro: agendamentosError,
        dados: agendamentosData 
      });

      if (agendamentosError) {
        logger.error('Erro ao carregar agendamentos:', agendamentosError);
        return;
      }

      if (agendamentosData) {
        const agendamentosFormatados = agendamentosData.map(a => {
          // Extrair primeiro serviço do array JSON
          let nomeServico = 'Sem serviço';
          try {
            if (typeof a.servicos === 'string') {
              const servicosArray = JSON.parse(a.servicos);
              nomeServico = servicosArray[0]?.nome || 'Sem serviço';
            } else if (Array.isArray(a.servicos) && a.servicos.length > 0) {
              nomeServico = a.servicos[0]?.nome || 'Sem serviço';
            }
          } catch (e) {
            logger.error('Erro ao parsear servicos:', e);
          }

          return {
            id: a.id,
            data: new Date(a.data_hora).toLocaleDateString('pt-BR'),
            hora: new Date(a.data_hora).toLocaleTimeString('pt-BR').substr(0, 5),
            servico: nomeServico,
            status: a.status || 'pendente',
            usuario: a.usuarios?.nome_completo || 'Não definido',
            observacoes: a.observacoes || null,
          };
        });
        
        console.log('✅ Agendamentos formatados:', agendamentosFormatados);
        setAgendamentos(agendamentosFormatados);
      }
    } catch (error) {
      logger.error('Erro ao carregar agendamentos:', error);
      console.error('❌ Erro completo:', error);
    }
  };

  const carregarHistorico = async () => {
    if (!cliente?.id) return;

    try {
      console.log('🔍 [HISTÓRICO] Buscando comandas para cliente:', cliente.id);
      
      // Buscar comandas fechadas
      const { data: comandasData, error: comandasError } = await supabase
        .from('comandas')
        .select('id, created_at, valor_total, valor_pago, troco, forma_pagamento, formas_pagamento_detalhes, troco_para_credito')
        .eq('cliente_id', cliente.id)
        .eq('status', 'fechada')
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('📋 [HISTÓRICO] Comandas encontradas:', {
        total: comandasData?.length || 0,
        erro: comandasError,
        comandas: comandasData
      });

      if (comandasData && comandasData.length > 0) {
        const comandaIds = comandasData.map(c => c.id);
        
        console.log('🔍 [HISTÓRICO] Buscando itens das comandas:', comandaIds);
        
        // Buscar TODOS os itens dessas comandas
        const { data: itensData, error: itensError } = await supabase
          .from('comandas_itens')
          .select('*')
          .in('comanda_id', comandaIds)
          .order('created_at', { ascending: false });

        console.log('📦 [HISTÓRICO] Itens encontrados:', {
          total: itensData?.length || 0,
          erro: itensError,
          itens: itensData
        });

        if (itensData && itensData.length > 0) {
          // Mapear itens com informações da comanda
          const historicoFormatado = itensData.map(item => {
            const comanda = comandasData.find(c => c.id === item.comanda_id);
            
            return {
              id: item.id,
              comanda_id: item.comanda_id,
              data: new Date(comanda?.created_at || item.created_at).toLocaleDateString('pt-BR'),
              hora: new Date(comanda?.created_at || item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              nome: item.nome,
              tipo: item.tipo, // servico, produto, pacote
              valor: item.preco_unitario || 0,
              quantidade: item.quantidade || 1,
              profissional: comanda?.usuarios?.nome_completo || 'Não informado',
              // Dados completos da comanda para o modal
              comanda: {
                valor_total: comanda?.valor_total || 0,
                valor_pago: comanda?.valor_pago || 0,
                troco: comanda?.troco || 0,
                troco_para_credito: comanda?.troco_para_credito || 0,
                forma_pagamento: comanda?.forma_pagamento || 'Não informado',
                formas_pagamento_detalhes: comanda?.formas_pagamento_detalhes,
                created_at: comanda?.created_at,
              },
            };
          });
          
          console.log('✅ [HISTÓRICO] Histórico formatado:', historicoFormatado);
          setHistorico(historicoFormatado);
        } else {
          console.log('⚠️ [HISTÓRICO] Nenhum item encontrado nas comandas');
          setHistorico([]);
        }
      } else {
        console.log('⚠️ [HISTÓRICO] Nenhuma comanda fechada encontrada');
        setHistorico([]);
      }
    } catch (error) {
      logger.error('Erro ao carregar histórico:', error);
      console.error('❌ [HISTÓRICO] Erro completo:', error);
    }
  };

  const carregarPacotes = async () => {
    if (!cliente?.id) return;

    try {
      const { data: pacotesData } = await supabase
        .from('cliente_pacotes')
        .select(`
          id,
          sessoes_total,
          sessoes_usadas,
          data_expiracao,
          ativo,
          pacotes:pacote_id(nome, valor)
        `)
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false });

      if (pacotesData) {
        const pacotesFormatados = pacotesData.map(p => ({
          id: p.id,
          nome: p.pacotes?.nome || 'Pacote',
          valor: p.pacotes?.valor || 0,
          sessoes_total: p.sessoes_total || 0,
          sessoes_usadas: p.sessoes_usadas || 0,
          validade: p.data_expiracao || '',
          ativo: p.ativo || false,
        }));
        setPacotes(pacotesFormatados);
      }
    } catch (error) {
      logger.error('Erro ao carregar pacotes:', error);
    }
  };

  const carregarComandas = async () => {
    if (!cliente?.id) return;

    try {
      const { data: comandasData } = await supabase
        .from('comandas')
        .select(`
          id,
          created_at,
          valor_total,
          status
        `)
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (comandasData) {
        const comandasFormatadas = await Promise.all(
          comandasData.map(async (c) => {
            const { count } = await supabase
              .from('comandas_itens')
              .select('id', { count: 'exact', head: true })
              .eq('comanda_id', c.id);

            return {
              id: c.id,
              data: new Date(c.created_at).toLocaleDateString('pt-BR'),
              valor: c.valor_total || 0,
              status: c.status,
              itens_count: count || 0,
            };
          })
        );
        setComandas(comandasFormatadas);
      }
    } catch (error) {
      logger.error('Erro ao carregar comandas:', error);
    }
  };

  const carregarGaleria = async () => {
    if (!cliente?.id) return;

    try {
      const { data: fotosData } = await supabase
        .from('cliente_fotos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false });

      if (fotosData) {
        setGaleria(fotosData.map(f => ({
          id: f.id,
          url: f.foto_url,
          data: new Date(f.created_at).toLocaleDateString('pt-BR'),
          descricao: f.descricao || '',
        })));
      }
    } catch (error) {
      logger.error('Erro ao carregar galeria:', error);
    }
  };

  const tabs = [
    { id: 'dados', icon: 'pen', label: 'Dados' },
    { id: 'saldo', icon: 'sync-alt', label: 'Saldo na casa' },
    { id: 'agendamentos', icon: 'calendar-alt', label: 'Agendamentos' },
    { id: 'historico', icon: 'history', label: 'Histórico' },
    { id: 'comandas', icon: 'receipt', label: 'Comandas' },
    { id: 'fotos', icon: 'images', label: 'Fotos' },
  ];

  const renderContent = () => {
    if (loadingTab) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'dados':
        return (
          <>
            <TouchableOpacity 
              style={styles.fotoContainer}
              onPress={selecionarFoto}
            >
              {foto ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${foto}` }}
                  style={styles.fotoPerfil}
                />
              ) : fotoUrl ? (
                <Image 
                  source={{ uri: fotoUrl }}
                  style={styles.fotoPerfil}
                />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <FontAwesome5 name="camera" size={24} color={colors.textTertiary} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="user" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Digite o nome do cliente"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="phone" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={telefone}
                  onChangeText={setTelefone}
                  placeholder="Digite o telefone"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Digite o e-mail"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="calendar" size={16} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={dataNascimento}
                  onChangeText={(texto) => setDataNascimento(formatarDataInput(texto))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observação</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Digite observações sobre o cliente"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        );

      case 'saldo':
        return (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={styles.saldoCard}
              activeOpacity={0.7}
              onPress={async () => {
                // Busca movimentações do cliente
                if (!cliente?.id) return;
                const { data, error } = await supabase
                  .from('crediario_movimentacoes')
                  .select(`
                    data,
                    valor,
                    descricao,
                    tipo,
                    usuario_id,
                    usuarios:usuario_id(nome_completo)
                  `)
                  .eq('cliente_id', cliente.id)
                  .order('data', { ascending: false });
                if (!error && data) {
                  const extratoFormatado = data.map((mov: any) => ({
                    ...mov,
                    usuario: mov.usuarios?.nome_completo || 'Sistema'
                  }));
                  setExtrato(extratoFormatado);
                }
                setModalExtratoVisible(true);
              }}
            >
              <Text style={styles.saldoLabel}>Saldo Atual</Text>
              <Text
                style={[
                  styles.saldoValor,
                  parseFloat(saldoAtual.replace('.', '').replace(',', '.')) < 0
                    ? { color: '#EF4444' }
                    : { color: '#10B981' }
                ]}
              >
                R$ {saldoAtual}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={modalExtratoVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setModalExtratoVisible(false)}
            >
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '92%', maxHeight: '80%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Extrato do Saldo</Text>
                  <ScrollView style={{ maxHeight: 350 }}>
                    {extrato.length === 0 && (
                      <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 24 }}>Nenhuma movimentação encontrada.</Text>
                    )}
                    {extrato.map((mov, idx) => (
                      <View key={idx} style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            {(() => {
                              if (!mov.data) return '';
                              const date = new Date(mov.data);
                              return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            })()}
                          </Text>
                          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                            {(() => {
                              if (!mov.data) return '';
                              const date = new Date(mov.data);
                              return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: 'bold', color: mov.valor >= 0 ? '#10B981' : '#EF4444', fontSize: 16 }}>
                          {mov.valor >= 0 ? '+' : '-'} R$ {Math.abs(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        {mov.descricao ? (
                          <Text style={{ color: colors.text, fontSize: 14, marginTop: 2 }}>{mov.descricao}</Text>
                        ) : null}
                        {mov.usuario ? (
                          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
                            <FontAwesome5 name="user" size={10} color={colors.textTertiary} /> {mov.usuario}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32 }}
                    onPress={() => setModalExtratoVisible(false)}
                  >
                    <Text style={{ color: colors.text, fontWeight: '500', fontSize: 16 }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setModalCreditoVisible(true)}
            >
              <FontAwesome5 name="plus" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Adicionar Crédito</Text>
            </TouchableOpacity>

            <Modal
              visible={modalCreditoVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setModalCreditoVisible(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '90%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Adicionar Crédito/Débito</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: tipoCredito === 'credito' ? '#E8FFF3' : '#F3F4F6',
                        borderRadius: 8,
                        padding: 10,
                        marginRight: 4,
                        borderWidth: tipoCredito === 'credito' ? 2 : 1,
                        borderColor: tipoCredito === 'credito' ? '#10B981' : '#E5E7EB',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setTipoCredito('credito');
                        if (valorCredito.startsWith('-')) setValorCredito(valorCredito.replace('-', ''));
                        setTimeout(() => valorInputRef.current?.focus(), 100);
                      }}
                    >
                      <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Crédito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: tipoCredito === 'debito' ? '#FFF1F2' : '#F3F4F6',
                        borderRadius: 8,
                        padding: 10,
                        marginLeft: 4,
                        borderWidth: tipoCredito === 'debito' ? 2 : 1,
                        borderColor: tipoCredito === 'debito' ? '#EF4444' : '#E5E7EB',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setTipoCredito('debito');
                        if (!valorCredito.startsWith('-')) setValorCredito('-' + valorCredito.replace('-', ''));
                        setTimeout(() => valorInputRef.current?.focus(), 100);
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Débito</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Valor</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 18, color: colors.primary, marginLeft: 12 }}>R$</Text>
                    <TextInput
                      ref={valorInputRef}
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 18 }]}
                      placeholder="0,00"
                      value={valorCredito}
                      onChangeText={txt => {
                        // Máscara automática para moeda (R$ 0,00)
                        let v = txt.replace(/\D/g, '');
                        if (!v) {
                          setValorCredito('');
                          return;
                        }
                        // Limita a 8 dígitos (até 99.999,99)
                        v = v.slice(0, 8);
                        let num = parseInt(v, 10);
                        let cents = (num % 100).toString().padStart(2, '0');
                        let reais = Math.floor(num / 100).toString();
                        // Adiciona separador de milhar
                        reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        let formatted = reais + ',' + cents;
                        if (tipoCredito === 'debito' && !formatted.startsWith('-')) formatted = '-' + formatted;
                        if (tipoCredito === 'credito' && formatted.startsWith('-')) formatted = formatted.replace('-', '');
                        setValorCredito(formatted);
                      }}
                      keyboardType="numeric"
                      maxLength={12}
                    />
                  </View>
                  <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Descrição</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16 }]}
                      placeholder="Ex: Pagamento, ajuste, desconto..."
                      value={descricaoCredito}
                      onChangeText={setDescricaoCredito}
                      maxLength={60}
                    />
                  </View>
                  <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Data</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, marginBottom: 18, borderWidth: 1, borderColor: colors.border }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16 }]}
                      placeholder="DD/MM/AAAA (opcional)"
                      value={dataCredito}
                      onChangeText={txt => setDataCredito(formatarDataInput(txt))}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.footerButton, { marginRight: 8 }]}
                      onPress={() => {
                        setModalCreditoVisible(false);
                        setValorCredito('');
                        setDescricaoCredito('');
                        setTipoCredito('credito');
                      }}
                    >
                      <Text style={styles.footerButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.footerButton, styles.footerButtonSalvar, { opacity: !valorCredito.trim() || salvandoCredito ? 0.6 : 1 }]}
                      onPress={async () => {
                        if (!valorCredito.trim()) {
                          Alert.alert('Atenção', 'Informe o valor do crédito/débito.');
                          return;
                        }
                        // Remove formatação: pontos de milhar e substitui vírgula por ponto
                        let valorLimpo = valorCredito.replace(/\./g, '').replace(',', '.');
                        // Remove o sinal de menos se houver (já será tratado pelo tipo)
                        valorLimpo = valorLimpo.replace('-', '');
                        
                        let valor = parseFloat(valorLimpo);
                        if (isNaN(valor) || valor === 0) {
                          Alert.alert('Atenção', 'Informe um valor válido diferente de zero.');
                          return;
                        }
                        if (tipoCredito === 'debito' && valor > 0) valor = -valor;
                        if (tipoCredito === 'credito' && valor < 0) valor = Math.abs(valor);
                        setSalvandoCredito(true);
                        try {
                          // Buscar dados do usuário
                          const { data: { user: currentUser } } = await supabase.auth.getUser();
                          
                          // Determina data: sempre usa horário local sem conversão UTC
                          let dataMov;
                          if (dataCredito && dataCredito.length === 10) {
                            // Se data foi informada, usa ela com hora atual
                            const [dia, mes, ano] = dataCredito.split('/');
                            const agora = new Date();
                            const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), agora.getHours(), agora.getMinutes(), agora.getSeconds());
                            // Formata como YYYY-MM-DD HH:MM:SS sem timezone
                            dataMov = dataLocal.getFullYear() + '-' + 
                                     String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + 
                                     String(dataLocal.getDate()).padStart(2, '0') + ' ' + 
                                     String(dataLocal.getHours()).padStart(2, '0') + ':' + 
                                     String(dataLocal.getMinutes()).padStart(2, '0') + ':' + 
                                     String(dataLocal.getSeconds()).padStart(2, '0');
                          } else {
                            // Se não, usa timestamp atual no formato local
                            const agora = new Date();
                            dataMov = agora.getFullYear() + '-' + 
                                     String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                                     String(agora.getDate()).padStart(2, '0') + ' ' + 
                                     String(agora.getHours()).padStart(2, '0') + ':' + 
                                     String(agora.getMinutes()).padStart(2, '0') + ':' + 
                                     String(agora.getSeconds()).padStart(2, '0');
                          }
                          
                          // Insere movimentação
                          const { error: movError } = await supabase
                            .from('crediario_movimentacoes')
                            .insert({
                              cliente_id: cliente?.id,
                              valor,
                              tipo: tipoCredito,
                              descricao: descricaoCredito,
                              data: dataMov,
                              usuario_id: currentUser?.id || null,
                            });
                          if (movError) {
                            console.error('Erro ao inserir movimentação:', movError);
                            throw movError;
                          }
                          
                          // Recalcula saldo do banco de dados
                          const { data: movimentacoes, error: saldoError } = await supabase
                            .from('crediario_movimentacoes')
                            .select('valor')
                            .eq('cliente_id', cliente?.id);
                          
                          if (!saldoError && movimentacoes) {
                            const soma = movimentacoes.reduce((acc, mov) => acc + (typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor)), 0);
                            setSaldoAtual(soma.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                          }
                          
                          setModalCreditoVisible(false);
                          setValorCredito('');
                          setDescricaoCredito('');
                          setTipoCredito('credito');
                          setDataCredito('');
                          Alert.alert('Sucesso', 'Movimentação registrada!');
                        } catch (err) {
                          Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
                        } finally {
                          setSalvandoCredito(false);
                        }
                      }}
                      disabled={!valorCredito.trim() || salvandoCredito}
                    >
                      <Text style={[styles.footerButtonText, styles.footerButtonTextSalvar]}>
                        {salvandoCredito ? 'Salvando...' : 'Salvar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        );

      case 'agendamentos':
        return (
          <View style={styles.tabContent}>
            {agendamentos.length > 0 ? (
              agendamentos.map((agendamento) => (
                <TouchableOpacity
                  key={agendamento.id}
                  style={styles.agendamentoCard}
                  onPress={() => {
                    setAgendamentoSelecionado(agendamento);
                    setModalAgendamentoVisible(true);
                  }}
                >
                  <View style={styles.agendamentoHeader}>
                    <View style={styles.agendamentoDataHora}>
                      <FontAwesome5 name="calendar" size={14} color={colors.textSecondary} />
                      <Text style={styles.agendamentoData}>{agendamento.data}</Text>
                      <FontAwesome5 name="clock" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
                      <Text style={styles.agendamentoHora}>{agendamento.hora}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      agendamento.status === 'confirmado' && styles.statusConfirmado,
                      agendamento.status === 'concluido' && styles.statusConcluido,
                      agendamento.status === 'cancelado' && styles.statusCancelado,
                      agendamento.status === 'falta' && styles.statusFalta,
                    ]}>
                      <Text style={styles.statusText}>
                        {agendamento.status === 'confirmado' ? 'Confirmado' :
                         agendamento.status === 'concluido' ? 'Concluído' :
                         agendamento.status === 'cancelado' ? 'Cancelado' :
                         agendamento.status === 'falta' ? 'Falta' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.agendamentoServico}>{agendamento.servico}</Text>
                  <View style={styles.agendamentoProfissional}>
                    <FontAwesome5 name="user" size={12} color={colors.textTertiary} />
                    <Text style={styles.agendamentoProfissionalText}>{agendamento.usuario}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="calendar-alt" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>Nenhum agendamento encontrado</Text>
              </View>
            )}
          </View>
        );

      case 'historico':
        return (
          <View style={styles.tabContent}>
            {historico.length > 0 ? (
              <>
                <View style={styles.resumoHistorico}>
                  <Text style={styles.resumoTitle}>
                    {historico.length} item{historico.length !== 1 ? 'ns' : ''} vendido{historico.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {historico.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.historicoCard}
                    onPress={() => {
                      console.log('🔘 [MODAL HISTÓRICO] Item clicado:', item);
                      console.log('🔘 [MODAL HISTÓRICO] Dados da comanda:', item.comanda);
                      setHistoricoSelecionado(item);
                      setModalHistoricoVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historicoHeader}>
                      <View>
                        <Text style={styles.historicoData}>{item.data}</Text>
                        <Text style={styles.historicoHora}>{item.hora}</Text>
                      </View>
                      <Text style={styles.historicoValor}>
                        R$ {(item.valor * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.historicoServico}>{item.nome}</Text>
                      {item.quantidade > 1 && (
                        <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 8 }}>
                          x{item.quantidade}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={styles.historicoProfissional}>
                        <FontAwesome5 name="user" size={12} color={colors.textTertiary} />
                        <Text style={styles.historicoProfissionalText}>{item.profissional}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { paddingHorizontal: 8, paddingVertical: 2 }
                      ]}>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                          {item.tipo === 'servico' ? '✂️ Serviço' : 
                           item.tipo === 'produto' ? '📦 Produto' : 
                           '🎁 Pacote'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="history" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>Nenhum atendimento realizado ainda</Text>
                <Text style={styles.emptyStateSubtext}>
                  O histórico será criado automaticamente quando uma comanda for fechada
                </Text>
              </View>
            )}
          </View>
        );

      case 'pacotes':
        return (
          <View style={styles.tabContent}>
            {pacotes.length > 0 ? (
              pacotes.map((pacote) => {
                const progresso = pacote.sessoes_total > 0 
                  ? (pacote.sessoes_usadas / pacote.sessoes_total) * 100 
                  : 0;
                const sessoesRestantes = pacote.sessoes_total - pacote.sessoes_usadas;
                
                return (
                  <View key={pacote.id} style={[styles.pacoteCard, !pacote.ativo && styles.pacoteInativo]}>
                    <View style={styles.pacoteHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pacoteNome}>{pacote.nome}</Text>
                        <Text style={styles.pacoteValor}>
                          R$ {pacote.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      {!pacote.ativo && (
                        <View style={styles.pacoteInativoBadge}>
                          <Text style={styles.pacoteInativoText}>Inativo</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.pacoteSessoes}>
                      <Text style={styles.pacoteSessoesText}>
                        {pacote.sessoes_usadas} de {pacote.sessoes_total} sessões utilizadas
                      </Text>
                      <Text style={styles.pacoteSessoesRestantes}>
                        {sessoesRestantes} restante{sessoesRestantes !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progresso}%` }]} />
                    </View>
                    
                    {pacote.validade && (
                      <View style={styles.pacoteValidade}>
                        <FontAwesome5 name="calendar" size={12} color={colors.textTertiary} />
                        <Text style={styles.pacoteValidadeText}>
                          Válido até {new Date(pacote.validade).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="box" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>Nenhum pacote adquirido</Text>
                <Text style={styles.emptyStateSubtext}>
                  Pacotes podem ser vendidos através da tela de Pacotes
                </Text>
              </View>
            )}
          </View>
        );

      case 'comandas':
        return (
          <View style={styles.tabContent}>
            {comandas.length > 0 ? (
              <>
                <View style={styles.resumoComandas}>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoLabel}>Total</Text>
                    <Text style={styles.resumoNumber}>{comandas.length}</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoLabel}>Abertas</Text>
                    <Text style={[styles.resumoNumber, { color: '#F59E0B' }]}>
                      {comandas.filter(c => c.status === 'aberta').length}
                    </Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoLabel}>Fechadas</Text>
                    <Text style={[styles.resumoNumber, { color: '#10B981' }]}>
                      {comandas.filter(c => c.status === 'fechada').length}
                    </Text>
                  </View>
                </View>
                {comandas.map((comanda) => (
                  <TouchableOpacity 
                    key={comanda.id} 
                    style={styles.comandaCard}
                    onPress={() => router.push(`/comandas`)}
                  >
                    <View style={styles.comandaHeader}>
                      <View>
                        <Text style={styles.comandaData}>{comanda.data}</Text>
                        <Text style={styles.comandaItens}>{comanda.itens_count} ite{comanda.itens_count !== 1 ? 'ns' : 'm'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.comandaValor}>
                          R$ {comanda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={[
                          styles.comandaStatusBadge,
                          comanda.status === 'aberta' && styles.comandaAberta,
                          comanda.status === 'fechada' && styles.comandaFechada,
                        ]}>
                          <Text style={styles.comandaStatusText}>
                            {comanda.status === 'aberta' ? 'Aberta' : 'Fechada'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="receipt" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>Nenhuma comanda encontrada</Text>
              </View>
            )}
          </View>
        );

      case 'fotos':
        return (
          <View style={styles.tabContent}>
            {galeria.length > 0 ? (
              <View style={styles.galeriaGrid}>
                {galeria.map((foto) => (
                  <TouchableOpacity 
                    key={foto.id} 
                    style={styles.galeriaItem}
                    onPress={() => {
                      setFotoSelecionada(foto);
                      setModalFotoVisible(true);
                    }}
                    onLongPress={() => {
                      Alert.prompt(
                        'Descrição da Foto',
                        'Digite uma descrição para esta foto',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Salvar',
                            onPress: async (text) => {
                              try {
                                const { error } = await supabase
                                  .from('cliente_fotos')
                                  .update({ descricao: text })
                                  .eq('id', foto.id);
                                
                                if (error) throw error;
                                
                                carregarGaleria();
                                Alert.alert('Sucesso', 'Descrição atualizada!');
                              } catch (error) {
                                Alert.alert('Erro', 'Não foi possível atualizar a descrição');
                              }
                            }
                          }
                        ],
                        'plain-text',
                        foto.descricao
                      );
                    }}
                  >
                    <Image source={{ uri: foto.url }} style={styles.galeriaImagem} resizeMode="cover" />
                    <View style={styles.galeriaInfo}>
                      <Text style={styles.galeriaData} numberOfLines={1}>{foto.data}</Text>
                      {foto.descricao && (
                        <Text style={{ fontSize: 10, color: '#fff', marginTop: 2 }} numberOfLines={1}>
                          {foto.descricao}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="images" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>Nenhuma foto na galeria</Text>
                <Text style={styles.emptyStateSubtext}>
                  Adicione fotos de antes/depois dos atendimentos
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Toque longo na foto para adicionar descrição
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.addButton, { marginTop: 16 }]}
              onPress={async () => {
                try {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria.');
                    return;
                  }

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    allowsEditing: false,
                    quality: 1.0,
                    base64: true,
                  });

                  console.log('📸 [FOTO] Resultado da seleção:', result);

                  if (!result.canceled && result.assets[0]) {
                    if (!result.assets[0].base64) {
                      Alert.alert('Erro', 'Não foi possível processar a imagem');
                      return;
                    }

                    console.log('📸 [FOTO] Fazendo upload...');
                    const fotoNome = `${user?.id}/${Date.now()}.jpg`;
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('cliente-galeria')
                      .upload(fotoNome, decode(result.assets[0].base64), {
                        contentType: 'image/jpeg',
                      });

                    console.log('📸 [FOTO] Resultado upload:', { uploadData, uploadError });

                    if (uploadError) {
                      console.error('❌ [FOTO] Erro no upload:', uploadError);
                      Alert.alert('Erro', `Não foi possível fazer upload da foto: ${uploadError.message}`);
                      return;
                    }

                    const { data: { publicUrl } } = supabase.storage
                      .from('cliente-galeria')
                      .getPublicUrl(fotoNome);

                    console.log('📸 [FOTO] URL pública:', publicUrl);

                    const { error } = await supabase
                      .from('cliente_fotos')
                      .insert({
                        cliente_id: cliente?.id,
                        foto_url: publicUrl,
                        descricao: '',
                        estabelecimento_id: estabelecimentoId,
                      });

                    if (error) {
                      console.error('❌ [FOTO] Erro ao salvar no banco:', error);
                      Alert.alert('Erro', 'Não foi possível salvar a foto');
                      return;
                    }

                    Alert.alert('Sucesso', 'Foto adicionada!');
                    carregarGaleria();
                  }
                } catch (error) {
                  logger.error('Erro ao adicionar foto:', error);
                  Alert.alert('Erro', 'Não foi possível adicionar a foto');
                }
              }}
            >
              <FontAwesome5 name="camera" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Adicionar Foto</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  if (carregando) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Carregando...</Text>
          <View style={[styles.headerButton, { opacity: 0 }]} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Cliente</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButtonInfo}
              onPress={abrirModalInfo}
            >
              <FontAwesome5 name="info-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, styles.headerButtonDelete]}
              onPress={excluirCliente}
            >
              <FontAwesome5 name="trash-alt" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContentContainer}
        >
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
                accessibilityLabel={tab.label}
              >
                <FontAwesome5
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.id ? colors.primary : "#666"}
                />
                <Text 
                  style={[
                    styles.tabText, 
                    activeTab === tab.id && styles.tabTextActive,
                    { marginTop: 4 }
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView style={styles.form}>
          {renderContent()}
        </ScrollView>

        {/* Modal de Detalhes do Agendamento */}
        <Modal
          visible={modalAgendamentoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalAgendamentoVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalAgendamentoVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes do Agendamento</Text>
                <TouchableOpacity 
                  onPress={() => setModalAgendamentoVisible(false)}
                  style={styles.closeButton}
                >
                  <FontAwesome5 name="times" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {agendamentoSelecionado && (
                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="calendar" size={16} color="#6366F1" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Data</Text>
                      <Text style={styles.statValue}>{agendamentoSelecionado.data}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="clock" size={16} color="#10B981" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Horário</Text>
                      <Text style={styles.statValue}>{agendamentoSelecionado.hora}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="cut" size={16} color="#8B5CF6" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Serviço</Text>
                      <Text style={styles.statValue}>{agendamentoSelecionado.servico}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="user" size={16} color="#F59E0B" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Profissional</Text>
                      <Text style={styles.statValue}>{agendamentoSelecionado.usuario}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 
                        name={
                          agendamentoSelecionado.status === 'confirmado' ? 'check-circle' :
                          agendamentoSelecionado.status === 'concluido' ? 'check-double' :
                          agendamentoSelecionado.status === 'cancelado' ? 'times-circle' :
                          agendamentoSelecionado.status === 'falta' ? 'exclamation-circle' : 'clock'
                        }
                        size={16}
                        color={
                          agendamentoSelecionado.status === 'confirmado' ? '#10B981' :
                          agendamentoSelecionado.status === 'concluido' ? '#3B82F6' :
                          agendamentoSelecionado.status === 'cancelado' ? '#EF4444' :
                          agendamentoSelecionado.status === 'falta' ? '#F59E0B' : '#6B7280'
                        }
                      />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Status</Text>
                      <Text style={styles.statValue}>
                        {agendamentoSelecionado.status === 'confirmado' ? 'Confirmado' :
                         agendamentoSelecionado.status === 'concluido' ? 'Concluído' :
                         agendamentoSelecionado.status === 'cancelado' ? 'Cancelado' :
                         agendamentoSelecionado.status === 'falta' ? 'Falta' : 'Pendente'}
                      </Text>
                    </View>
                  
                  {agendamentoSelecionado.observacoes && (
                    <View style={styles.statRow}>
                      <View style={styles.statIconContainer}>
                        <FontAwesome5 name="comment" size={16} color="#6B7280" />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={styles.statLabel}>Observações</Text>
                        <Text style={styles.statValue}>{agendamentoSelecionado.observacoes}</Text>
                      </View>
                    </View>
                  )}
                  </View>
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Detalhes do Histórico */}
        <Modal
          visible={modalHistoricoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalHistoricoVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalHistoricoVisible(false)}
          >
            <View 
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes da Comanda</Text>
                <TouchableOpacity 
                  onPress={() => setModalHistoricoVisible(false)}
                  style={styles.closeButton}
                >
                  <FontAwesome5 name="times" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {historicoSelecionado && (
                <ScrollView 
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {console.log('📱 [MODAL] historicoSelecionado completo:', JSON.stringify(historicoSelecionado, null, 2))}
                  {console.log('📱 [MODAL] comanda existe?', !!historicoSelecionado.comanda)}
                  {console.log('📱 [MODAL] dados da comanda:', historicoSelecionado.comanda)}
                  
                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="calendar" size={16} color="#6366F1" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Data</Text>
                      <Text style={styles.statValue}>{historicoSelecionado.data}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="clock" size={16} color="#6366F1" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Horário</Text>
                      <Text style={styles.statValue}>{historicoSelecionado.hora}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 
                        name={
                          historicoSelecionado.tipo === 'servico' ? 'cut' :
                          historicoSelecionado.tipo === 'produto' ? 'box' : 'gift'
                        }
                        size={16}
                        color="#8B5CF6"
                      />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Item</Text>
                      <Text style={styles.statValue}>
                        {historicoSelecionado.nome}
                        {historicoSelecionado.quantidade > 1 && ` (x${historicoSelecionado.quantidade})`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="tag" size={16} color="#10B981" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Tipo</Text>
                      <Text style={styles.statValue}>
                        {historicoSelecionado.tipo === 'servico' ? '✂️ Serviço' :
                         historicoSelecionado.tipo === 'produto' ? '📦 Produto' : '🎁 Pacote'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="user" size={16} color="#F59E0B" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Profissional</Text>
                      <Text style={styles.statValue}>{historicoSelecionado.profissional}</Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="money-bill-wave" size={16} color="#10B981" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Valor do Item</Text>
                      <Text style={styles.statValue}>
                        R$ {(historicoSelecionado.valor * historicoSelecionado.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {historicoSelecionado.comanda && (
                    <>
                      <View style={styles.modalDivider} />

                      <View style={styles.statRow}>
                        <View style={styles.statIconContainer}>
                          <FontAwesome5 name="receipt" size={16} color="#6366F1" />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Text style={styles.statLabel}>Valor Total da Comanda</Text>
                          <Text style={styles.statValue}>
                            R$ {historicoSelecionado.comanda.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.statRow}>
                        <View style={styles.statIconContainer}>
                          <FontAwesome5 name="money-bill-wave" size={16} color="#10B981" />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Text style={styles.statLabel}>Valor Pago</Text>
                          <Text style={styles.statValue}>
                            R$ {historicoSelecionado.comanda.valor_pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </Text>
                        </View>
                      </View>

                      {historicoSelecionado.comanda.troco > 0 && (
                        <View style={styles.statRow}>
                          <View style={styles.statIconContainer}>
                            <FontAwesome5 name="hand-holding-usd" size={16} color="#F59E0B" />
                          </View>
                          <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Troco</Text>
                            <Text style={styles.statValue}>
                              R$ {historicoSelecionado.comanda.troco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {(historicoSelecionado.comanda.valor_pago < historicoSelecionado.comanda.valor_total) && (
                        <View style={styles.statRow}>
                          <View style={styles.statIconContainer}>
                            <FontAwesome5 name="exclamation-circle" size={16} color="#EF4444" />
                          </View>
                          <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Falta (Saldo Devedor)</Text>
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>
                              R$ {(historicoSelecionado.comanda.valor_total - historicoSelecionado.comanda.valor_pago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {historicoSelecionado.comanda.troco_para_credito > 0 && (
                        <View style={styles.statRow}>
                          <View style={styles.statIconContainer}>
                            <FontAwesome5 name="piggy-bank" size={16} color="#8B5CF6" />
                          </View>
                          <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Troco Convertido em Crédito</Text>
                            <Text style={styles.statValue}>
                              R$ {historicoSelecionado.comanda.troco_para_credito?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.statRow}>
                        <View style={styles.statIconContainer}>
                          <FontAwesome5 name="credit-card" size={16} color="#8B5CF6" />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Text style={styles.statLabel}>Forma de Pagamento</Text>
                          <Text style={styles.statValue}>
                            {historicoSelecionado.comanda.forma_pagamento === 'dinheiro' ? 'Dinheiro' :
                             historicoSelecionado.comanda.forma_pagamento === 'cartao_credito' ? 'Cartão de Crédito' :
                             historicoSelecionado.comanda.forma_pagamento === 'cartao_debito' ? 'Cartão de Débito' :
                             historicoSelecionado.comanda.forma_pagamento === 'pix' ? 'PIX' :
                             historicoSelecionado.comanda.forma_pagamento === 'crediario' ? 'Crediário' :
                             historicoSelecionado.comanda.forma_pagamento === 'multiplo' ? 'Múltiplas Formas' :
                             'Não informado'}
                          </Text>
                        </View>
                      </View>

                      {historicoSelecionado.comanda.forma_pagamento === 'multiplo' && historicoSelecionado.comanda.formas_pagamento_detalhes && (
                        <View style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.background, borderRadius: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Detalhamento:</Text>
                          {historicoSelecionado.comanda.formas_pagamento_detalhes.map((detalhe: any, index: number) => (
                            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                {detalhe.forma_pagamento === 'dinheiro' ? 'Dinheiro' :
                                 detalhe.forma_pagamento === 'cartao_credito' ? 'Cartão Crédito' :
                                 detalhe.forma_pagamento === 'cartao_debito' ? 'Cartão Débito' :
                                 detalhe.forma_pagamento === 'pix' ? 'PIX' :
                                 detalhe.forma_pagamento === 'crediario' ? 'Crediário' : detalhe.forma_pagamento}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                                R$ {detalhe.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Visualização de Foto */}
        <Modal
          visible={modalFotoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalFotoVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
            {/* Botão Fechar */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 10 }}
              onPress={() => setModalFotoVisible(false)}
            >
              <FontAwesome5 name="times" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Imagem em tela cheia com zoom nativo */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.95)' }}>
              {fotoSelecionada && (
                <ScrollView
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                  maximumZoomScale={5}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  bounces={true}
                  bouncesZoom={true}
                  scrollEnabled={true}
                  pinchGestureEnabled={true}
                  centerContent={true}
                >
                  <Image 
                    source={{ uri: fotoSelecionada.url }} 
                    style={{ 
                      width: Dimensions.get('window').width, 
                      height: Dimensions.get('window').height * 0.7
                    }}
                    resizeMode="contain"
                  />
                </ScrollView>
              )}
            </View>

            {/* Informações e Ações */}
            {fotoSelecionada && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, paddingBottom: 40 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>
                    {fotoSelecionada.data}
                  </Text>
                  {fotoSelecionada.descricao && (
                    <Text style={{ color: '#ccc', fontSize: 13 }}>
                      {fotoSelecionada.descricao}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                  {/* Botão Adicionar Descrição */}
                  <TouchableOpacity
                    style={{ backgroundColor: '#6366F1', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center', width: 42, height: 42 }}
                    onPress={() => {
                      Alert.prompt(
                        'Descrição da Foto',
                        'Digite uma descrição para esta foto',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Salvar',
                            onPress: async (text) => {
                              try {
                                const { error } = await supabase
                                  .from('cliente_fotos')
                                  .update({ descricao: text })
                                  .eq('id', fotoSelecionada.id);
                                
                                if (error) throw error;
                                
                                await carregarGaleria();
                                setModalFotoVisible(false);
                                Alert.alert('Sucesso', 'Descrição atualizada!');
                              } catch (error) {
                                Alert.alert('Erro', 'Não foi possível atualizar a descrição');
                              }
                            }
                          }
                        ],
                        'plain-text',
                        fotoSelecionada.descricao
                      );
                    }}
                  >
                    <FontAwesome5 name="edit" size={16} color="#fff" />
                  </TouchableOpacity>

                  {/* Botão Download */}
                  <TouchableOpacity
                    style={{ backgroundColor: '#10B981', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center', width: 42, height: 42 }}
                    onPress={() => {
                      // Abrir imagem no navegador para download
                      Linking.openURL(fotoSelecionada.url);
                    }}
                  >
                    <FontAwesome5 name="download" size={16} color="#fff" />
                  </TouchableOpacity>

                  {/* Botão Excluir */}
                  <TouchableOpacity
                    style={{ backgroundColor: '#EF4444', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center', width: 42, height: 42 }}
                    onPress={() => {
                      Alert.alert(
                        'Excluir Foto',
                        'Tem certeza que deseja excluir esta foto?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const { error } = await supabase
                                  .from('cliente_fotos')
                                  .delete()
                                  .eq('id', fotoSelecionada.id);
                                
                                if (error) throw error;
                                
                                await carregarGaleria();
                                setModalFotoVisible(false);
                                Alert.alert('Sucesso', 'Foto excluída com sucesso!');
                              } catch (error) {
                                Alert.alert('Erro', 'Não foi possível excluir a foto');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <FontAwesome5 name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* Modal de Informações do Cliente */}
        <Modal
          visible={modalInfoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalInfoVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalInfoVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Informações do Cliente</Text>
                <TouchableOpacity 
                  onPress={() => setModalInfoVisible(false)}
                  style={styles.closeButton}
                >
                  <FontAwesome5 name="times" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {loadingModalInfo ? (
                <View style={styles.modalLoading}>
                  <Text style={styles.loadingText}>Carregando...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="user-plus" size={16} color="#6366F1" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Cliente desde</Text>
                      <Text style={styles.statValue}>
                        {cliente?.created_at 
                          ? new Date(cliente.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })
                          : 'Data não disponível'
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="calendar-check" size={16} color={colors.success} />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Última Visita</Text>
                      <Text style={styles.statValue}>
                        {estatisticas.ultima_visita 
                          ? new Date(estatisticas.ultima_visita).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : 'Nunca'
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="redo" size={16} color="#3B82F6" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Total de Visitas</Text>
                      <Text style={styles.statValue}>
                        {estatisticas.total_visitas || 0} {estatisticas.total_visitas === 1 ? 'visita' : 'visitas'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="dollar-sign" size={16} color={colors.warning} />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Valor Total Gasto</Text>
                      <Text style={styles.statValue}>
                        R$ {(estatisticas.total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statIconContainer}>
                      <FontAwesome5 name="chart-bar" size={16} color="#8B5CF6" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Ticket Médio</Text>
                      <Text style={styles.statValue}>
                        R$ {(estatisticas.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {estatisticas.servicos_favoritos.length > 0 && (
                    <View style={styles.statRow}>
                      <View style={styles.statIconContainer}>
                        <FontAwesome5 name="star" size={16} color={colors.error} />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={styles.statLabel}>Serviço Favorito</Text>
                        <Text style={styles.statValue}>
                          {estatisticas.servicos_favoritos[0].nome}
                        </Text>
                        <Text style={styles.statSubValue}>
                          {estatisticas.servicos_favoritos[0].quantidade}x realizado
                        </Text>
                      </View>
                    </View>
                  )}

                  {estatisticas.total_visitas === 0 && (
                    <View style={styles.modalEmptyNote}>
                      <FontAwesome5 name="info-circle" size={14} color={colors.textTertiary} />
                      <Text style={styles.emptyNoteText}>
                        Cliente sem histórico de compras
                      </Text>
                    </View>
                  )}
                  </ScrollView>
                )}
              </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.footerButtonText}>Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.footerButton, styles.footerButtonSalvar]}
            onPress={salvarCliente}
            disabled={salvando}
          >
            <Text style={[styles.footerButtonText, styles.footerButtonTextSalvar]}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerButtonImport: {
    backgroundColor: 'transparent',
  },
  headerButtonDelete: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 72,
  },
  tabsContentContainer: {
    flexGrow: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    minWidth: 80,
    backgroundColor: colors.background,
    height: 56,
  },
  tabActive: {
    backgroundColor: '#EDE9FE',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fotoPerfil: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  footerButtonSalvar: {
    backgroundColor: '#E8FFF3',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  footerButtonTextSalvar: {
    color: '#10B981',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  saldoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  saldoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  saldoValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  agendamentoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  agendamentoData: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  agendamentoHora: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  agendamentoServico: {
    fontSize: 16,
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: colors.textTertiary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  // Estilos para estatísticas
  estatisticasCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estatisticasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  estatisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  estatItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  estatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 4,
  },
  estatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  servicosFavoritos: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  servicosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  servicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  servicoNome: {
    fontSize: 14,
    color: colors.text,
  },
  servicoQuantidade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  // Estilos para agendamentos
  agendamentoDataHora: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendamentoProfissional: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  agendamentoProfissionalText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusConfirmado: {
    backgroundColor: '#D1FAE5',
  },
  statusConcluido: {
    backgroundColor: '#DBEAFE',
  },
  statusCancelado: {
    backgroundColor: '#FEE2E2',
  },
  statusFalta: {
    backgroundColor: '#FEF3C7',
  },
  verDetalhesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  verDetalhesText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
    marginRight: 6,
  },
  // Estilos para histórico
  resumoHistorico: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  resumoTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resumoValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  historicoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historicoData: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  historicoHora: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  historicoValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  historicoServico: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 6,
  },
  historicoProfissional: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historicoProfissionalText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 6,
  },
  // Estilos para pacotes
  pacoteCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pacoteInativo: {
    opacity: 0.6,
  },
  pacoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pacoteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pacoteValor: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  pacoteInativoBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pacoteInativoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  pacoteSessoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pacoteSessoesText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pacoteSessoesRestantes: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  pacoteValidade: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pacoteValidadeText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 6,
  },
  // Estilos para comandas
  resumoComandas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumoItem: {
    alignItems: 'center',
  },
  resumoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resumoNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  comandaCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comandaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comandaData: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  comandaItens: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  comandaValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  comandaStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comandaAberta: {
    backgroundColor: '#FEF3C7',
  },
  comandaFechada: {
    backgroundColor: '#D1FAE5',
  },
  comandaStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  // Estilos para galeria de fotos
  galeriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galeriaItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  galeriaImagem: {
    width: '100%',
    height: '85%',
  },
  galeriaInfo: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  galeriaData: {
    fontSize: 11,
    color: '#fff',
  },
  // Estilos para o header com múltiplas ações
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButtonInfo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para o modal de informações
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalEmptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    gap: 8,
  },
  emptyNoteText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statSubValue: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
});