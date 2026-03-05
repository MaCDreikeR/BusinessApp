import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Animated,
  PanResponder,
  Keyboard,
  DeviceEventEmitter,
  RefreshControl,
  Image,
  Platform,
  Pressable,
  Dimensions
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../../utils/logger';
import { Cliente as ClienteBase, Produto as ProdutoBase, Servico as ServicoBase, Pacote as PacoteBase, Comanda as ComandaBase } from '@types';
import { offlineInsert, offlineUpdate, offlineDelete, getOfflineFeedback } from '../../services/offlineSupabase';
import { Button } from '../../components/Button2';
import { SelectionButton, SELECTION_BUTTON_CONTAINER_STYLE } from '../../components/Buttons';

// Tipos específicos para comandas
type ClienteComanda = Pick<ClienteBase, 'id' | 'nome' | 'telefone' | 'email' | 'estabelecimento_id' | 'created_at'> & {
  foto_url?: string;
  saldo_crediario?: number;
};

type ProdutoComanda = Pick<ProdutoBase, 'id' | 'nome' | 'preco' | 'quantidade'>;

type ServicoComanda = Pick<ServicoBase, 'id' | 'nome' | 'preco'>;

type PacoteComanda = Pick<PacoteBase, 'id' | 'nome' | 'valor'> & {
  desconto: number;
};

type ItemComanda = {
  id: string;
  tipo: 'produto' | 'servico' | 'pacote';
  nome: string;
  quantidade: number;
  preco?: number;
  preco_unitario?: number;
  preco_total: number;
  item_id: string;
};

type ItemSelecionado = {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  tipo: 'produto' | 'servico' | 'pacote' | 'pagamento';
  quantidade_disponivel?: number;
};

type ComandaDetalhada = Pick<ComandaBase, 'id' | 'cliente_id' | 'status' | 'valor_total' | 'observacoes' | 'usuario_id' | 'created_at'> & {
  cliente_nome: string;
  cliente_foto_url?: string;
  data_abertura: string;
  itens: ItemComanda[];
  usuario_nome?: string;
  forma_pagamento?: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario' | 'multiplo';
  formas_pagamento_detalhes?: string;
  valor_pago?: number;
  troco?: number;
  comprovante_pix?: string | null;
  parcelas?: number | null;
  created_by_user_id?: string;
  created_by_user_nome?: string;
  finalized_by_user_id?: string;
  finalized_by_user_nome?: string;
  finalized_at?: string;
  saldo_aplicado?: number;
  troco_para_credito?: number;
  falta_para_debito?: number;
};

type Pagamento = {
  forma_pagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario';
  valor_pago: number;
  troco: number;
  parcelas?: number;
  comprovante_pix?: string;
};

type PagamentoMultiplo = {
  forma_pagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario';
  valor: number;
  parcelas?: number;
  comprovante_pix?: string;
};

type RouteParams = {
  clienteId?: string;
  clienteNome?: string;
  returnTo?: string;
};

export default function ComandasScreen() {
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  // Estados para gerenciar comandas
  const [comandas, setComandas] = useState<ComandaDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'abertas' | 'fechadas' | 'canceladas'>('abertas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // Estado para verificar se o usuário é administrador

  // Estados para cliente e comanda
  const [clienteQuery, setClienteQuery] = useState('');
  const [clientes, setClientes] = useState<ClienteComanda[]>([]);
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteComanda[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteComanda | null>(null);
  const [observacoes, setObservacoes] = useState('');

  // Estados para itens da comanda
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
  const [valorTotal, setValorTotal] = useState(0);
  const [modalItensVisible, setModalItensVisible] = useState(false);
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico' | 'pacote' | 'pagamento' | null>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [isModalSearchFocused, setIsModalSearchFocused] = useState(false);
  const [itensEncontrados, setItensEncontrados] = useState<(ProdutoComanda | ServicoComanda | PacoteComanda)[]>([]);
  const [buscandoItens, setBuscandoItens] = useState(false);

  // Estados para modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNovaComandaVisible, setModalNovaComandaVisible] = useState(false);
  const [comandaEmEdicao, setComandaEmEdicao] = useState<ComandaDetalhada | null>(null);
  const [modalPagamentoVisible, setModalPagamentoVisible] = useState(false);
  
  // Estados para múltiplas formas de pagamento
  const [formasPagamentoSelecionadas, setFormasPagamentoSelecionadas] = useState<('dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario')[]>([]);
  const [pagamentosMultiplos, setPagamentosMultiplos] = useState<PagamentoMultiplo[]>([]);
  
  const [pagamento, setPagamento] = useState<Pagamento>({
    forma_pagamento: 'dinheiro',
    valor_pago: 0,
    troco: 0,
    parcelas: undefined
  });
  const [valorTotalPagamento, setValorTotalPagamento] = useState(0);
  // Estados para integração do crediário
  const [saldoCrediario, setSaldoCrediario] = useState<number | null>(null);
  const [mostrarModalSaldo, setMostrarModalSaldo] = useState(false);
  const [usarSaldoCrediario, setUsarSaldoCrediario] = useState(false);
  // Estados para edição de comanda aberta
  const [editandoComanda, setEditandoComanda] = useState(false);
  const [itensEditados, setItensEditados] = useState<ItemComanda[]>([]);
  const [observacoesEditadas, setObservacoesEditadas] = useState('');
  const [adicionandoItens, setAdicionandoItens] = useState(false);
  const [valorAplicadoSaldo, setValorAplicadoSaldo] = useState(0);

  // Dentro do componente, adicione:
  const [valorRecebido, setValorRecebido] = useState('');
  const [troco, setTroco] = useState(0);
  const [falta, setFalta] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Adicione após o estado uploading:
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  
  // Modal para adicionar troco/falta ao crediário
  const [modalTrocoFaltaVisible, setModalTrocoFaltaVisible] = useState(false);
  const [valorTrocoFalta, setValorTrocoFalta] = useState(0);
  const [tipoTrocoFalta, setTipoTrocoFalta] = useState<'troco' | 'falta'>('troco');

  // Animações para modais
  const translateY = useRef(new Animated.Value(500)).current;
  const scaleItensAnim = useRef(new Animated.Value(0)).current;
  const opacityItensAnim = useRef(new Animated.Value(0)).current;
  const translateXItensAnim = useRef(new Animated.Value(0)).current;
  const translateYItensAnim = useRef(new Animated.Value(0)).current;
  const origemModalItensRef = useRef({ x: 0, y: 0 });
  const produtoButtonNovaRef = useRef<any>(null);
  const servicoButtonNovaRef = useRef<any>(null);
  const pacoteButtonNovaRef = useRef<any>(null);
  const produtoButtonEditRef = useRef<any>(null);
  const servicoButtonEditRef = useRef<any>(null);
  const pacoteButtonEditRef = useRef<any>(null);
  const origemNovaComandaRef = useRef({ x: 0, y: 0 });
  const scaleNovaComandaAnim = useRef(new Animated.Value(0)).current;
  const opacityNovaComandaAnim = useRef(new Animated.Value(0)).current;
  const translateXNovaComandaAnim = useRef(new Animated.Value(0)).current;
  const translateYNovaComandaAnim = useRef(new Animated.Value(0)).current;

  const calcularDeslocamentoCentroItens = (origemX: number, origemY: number) => {
    const { width, height } = Dimensions.get('window');
    return {
      deltaX: origemX - (width / 2),
      deltaY: origemY - (height / 2),
    };
  };

  const calcularDeslocamentoCentroNovaComanda = (origemX: number, origemY: number) => {
    const { width, height } = Dimensions.get('window');
    return {
      deltaX: origemX - (width / 2),
      deltaY: origemY - (height / 2),
    };
  };

  const abrirModalNovaComandaComOrigem = (origem?: { x?: number; y?: number }) => {
    const { width, height } = Dimensions.get('window');
    const origemX = Number.isFinite(origem?.x) ? Number(origem?.x) : (width / 2);
    const origemY = Number.isFinite(origem?.y) ? Number(origem?.y) : (height / 2);
    const { deltaX, deltaY } = calcularDeslocamentoCentroNovaComanda(origemX, origemY);

    origemNovaComandaRef.current = { x: origemX, y: origemY };
    scaleNovaComandaAnim.setValue(0.25);
    opacityNovaComandaAnim.setValue(0);
    translateXNovaComandaAnim.setValue(deltaX);
    translateYNovaComandaAnim.setValue(deltaY);
    setModalNovaComandaVisible(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(scaleNovaComandaAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityNovaComandaAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateXNovaComandaAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(translateYNovaComandaAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const fecharModalNovaComandaComAnimacao = (onAfterClose?: () => void) => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroNovaComanda(origemNovaComandaRef.current.x, origemNovaComandaRef.current.y);

    Animated.parallel([
      Animated.timing(scaleNovaComandaAnim, {
        toValue: 0.25,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityNovaComandaAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateXNovaComandaAnim, {
        toValue: deltaX,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYNovaComandaAnim, {
        toValue: deltaY,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalNovaComandaVisible(false);
      scaleNovaComandaAnim.setValue(0);
      opacityNovaComandaAnim.setValue(0);
      translateXNovaComandaAnim.setValue(0);
      translateYNovaComandaAnim.setValue(0);
      onAfterClose?.();
    });
  };

  const iniciarAnimacaoAberturaItens = (origemX: number, origemY: number) => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroItens(origemX, origemY);
    origemModalItensRef.current = { x: origemX, y: origemY };

    scaleItensAnim.setValue(0.25);
    opacityItensAnim.setValue(0);
    translateXItensAnim.setValue(deltaX);
    translateYItensAnim.setValue(deltaY);
    setModalItensVisible(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(scaleItensAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityItensAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateXItensAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(translateYItensAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const router = useRouter();
  const { session, estabelecimentoId, role } = useAuth(); // Usando o hook useAuth para pegar a sessão, estabelecimento e role

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return;
      
      carregarComandas();
      carregarClientesIniciais();
      verificarPermissoes();

      const subscriptionAtualizar = DeviceEventEmitter.addListener('atualizarComandas', () => {
        carregarComandas();
      });
      
      const subscriptionNovaComanda = DeviceEventEmitter.addListener('novaComanda', (payload?: { x?: number; y?: number }) => {
        logger.debug("Evento novaComanda recebido");
        // Abrir o modal
        abrirModalNovaComandaComOrigem(payload);
        
        // Pré-carregar alguns clientes
        carregarClientesIniciais();
      });
      
      // Monitorar evento de navegação para retornar após cadastrar cliente
      const subscriptionNovoCliente = DeviceEventEmitter.addListener('clienteCadastrado', (data: RouteParams) => {
        logger.debug("Evento clienteCadastrado recebido", data);
        
        if (data.clienteId && data.clienteNome && data.returnTo === 'comandas') {
          // Selecionar o cliente recém-cadastrado
          const novoCliente: ClienteComanda = {
            id: data.clienteId,
            nome: data.clienteNome,
            estabelecimento_id: ''
          };
          
          selecionarCliente(novoCliente);
          
          // Atualizar lista de clientes
          carregarClientesIniciais();
        }
      });
      
      return () => {
        subscriptionAtualizar.remove();
        subscriptionNovaComanda.remove();
        subscriptionNovoCliente.remove();
      };
    }, [session?.user?.id, estabelecimentoId, role])
  );

  // useEffect para carregar comandas quando a aba ativa muda
  useEffect(() => {
    carregarComandas();
  }, [abaAtiva]);

  // useEffect para buscar clientes quando o texto de busca muda
  useEffect(() => {
    buscarClientes(clienteQuery);
  }, [clienteQuery]);

  // useEffect para carregar clientes quando o modal de nova comanda é aberto
  useEffect(() => {
    if (modalNovaComandaVisible) {
      carregarClientes();
    }
  }, [modalNovaComandaVisible]);

  // useEffect para garantir que a lista de clientes seja fechada quando um cliente é selecionado
  useEffect(() => {
    if (selectedCliente) {
      setMostrarListaClientes(false);
    }
  }, [selectedCliente]);

  // Configuração de PanResponder para os modais
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Fechar o modal se arrastar para baixo mais de 100px
          Animated.timing(translateY, {
            toValue: 500,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            fecharModal();
            translateY.setValue(500);
          });
        } else {
          // Retornar à posição original
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

  // Função para fechar o modal e resetar estados de edição
  const fecharModal = () => {
    setModalVisible(false);
    setEditandoComanda(false);
    setItensEditados([]);
    setObservacoesEditadas('');
  };
  
  const panResponderItens = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYItens.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Fechar o modal se arrastar para baixo mais de 100px
          fecharModalItens();
        } else {
          // Retornar à posição original
          Animated.spring(translateYItens, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Função para buscar produtos
  const buscarProdutos = async (query: string) => {
    try {
      setBuscandoItens(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, quantidade')
  .eq('estabelecimento_id', estabelecimentoId)
        .ilike('nome', `%${query}%`)
        .order('nome');

      if (error) throw error;
      
      // Adicionar logs para debug
      logger.debug('Query de busca:', query);
      logger.debug('Produtos encontrados:', data);
      
      // Verificar se a quantidade está presente
      if (data && data.length > 0) {
        logger.debug('Primeiro produto:', data[0]);
        logger.debug('Quantidade do primeiro produto:', data[0].quantidade);
      }
      
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar produtos:', error);
      return [];
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para buscar serviços
  const buscarServicos = async (query: string) => {
    try {
      setBuscandoItens(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('servicos')
        .select('*')
  .eq('estabelecimento_id', estabelecimentoId)
        .ilike('nome', `%${query}%`)
        .order('nome');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar serviços:', error);
      return [];
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para buscar pacotes
  const buscarPacotes = async (query: string) => {
    try {
      setBuscandoItens(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('pacotes')
        .select('id, nome, valor, desconto')
        .eq('estabelecimento_id', estabelecimentoId)
        .ilike('nome', `%${query}%`)
        .order('nome');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar pacotes:', error);
      return [];
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para carregar itens iniciais com base no tipo selecionado
  const carregarItensIniciais = async () => {
    setBuscandoItens(true);
    try {
      let resultados;
      switch (tipoItem) {
        case 'produto':
          resultados = await buscarProdutos('');
          break;
        case 'servico':
          resultados = await buscarServicos('');
          break;
        case 'pacote':
          resultados = await buscarPacotes('');
          break;
      }
      setItensEncontrados(resultados || []);
    } catch (error) {
      logger.error('Erro ao carregar itens iniciais:', error);
      setItensEncontrados([]);
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para buscar itens baseado no termo de busca
  const buscarItens = async (termo: string) => {
    if (termo.length < 3 && termo.length > 0) {
      return;
    }
    
    if (termo.length === 0) {
      await carregarItensIniciais();
      return;
    }

    setBuscandoItens(true);
    try {
      let resultados;
      switch (tipoItem) {
        case 'produto':
          resultados = await buscarProdutos(termo);
          break;
        case 'servico':
          resultados = await buscarServicos(termo);
          break;
        case 'pacote':
          resultados = await buscarPacotes(termo);
          break;
      }
      setItensEncontrados(resultados || []);
    } catch (error) {
      logger.error('Erro ao buscar itens:', error);
      setItensEncontrados([]);
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para selecionar um item
  const selecionarItem = (item: ProdutoComanda | ServicoComanda | PacoteComanda) => {
    // Se está editando uma comanda, usa a função de adicionar item em edição
    if (editandoComanda) {
      adicionarItemEdicao(item);
      return;
    }

    // Verifica se o item já foi selecionado
    const itemJaSelecionado = itensSelecionados.find(i => i.id === item.id);
    
    if (!itemJaSelecionado) {
      // Verifica se é um produto e se tem quantidade disponível
      if ('quantidade' in item && item.quantidade <= 0) {
        Alert.alert('Produto Indisponível', 'Este produto está sem estoque no momento.');
        return;
      }

      // Adiciona o item à lista de selecionados
      // Para pacotes, sempre usar o valor final (valor - desconto)
      const preco = tipoItem === 'pacote' ? Number((item as PacoteComanda).valor) - Number((item as PacoteComanda).desconto || 0) : 
                   ('valor' in item ? Number(item.valor) : Number((item as ProdutoComanda | ServicoComanda).preco));
      const itemSelecionado: ItemSelecionado = {
        id: item.id,
        nome: item.nome,
        preco: preco,
        quantidade: 1,
        tipo: tipoItem || 'produto'
      };
      
      if ('quantidade' in item) {
        logger.debug('Item com quantidade:', item);
        logger.debug('Quantidade:', item.quantidade);
        itemSelecionado.quantidade_disponivel = item.quantidade;
        logger.debug('Item selecionado com quantidade_disponivel:', itemSelecionado);
      }
      
      setItensSelecionados(prev => [...prev, itemSelecionado]);
    } else {
      // Remove o item da lista se já estiver selecionado
      setItensSelecionados(prev => prev.filter(i => i.id !== item.id));
    }
  };

  // Função para alterar a quantidade de um item selecionado
  const alterarQuantidadeItem = (id: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    
    setItensSelecionados(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  // Função para remover um item selecionado
  const removerItemSelecionado = (id: string) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== id));
  };

  // Função para adicionar pagamento como item da comanda
  const adicionarPagamento = () => {
    if (!valorPagamento) return;
    
    const valor = parseFloat(valorPagamento.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido para o pagamento.');
      return;
    }

    const novoItem: ItemSelecionado = {
      id: `pagamento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID único para uso interno
      nome: 'Pagamento',
      preco: valor,
      quantidade: 1,
      tipo: 'pagamento'
    };

    setItensSelecionados([...itensSelecionados, novoItem]);
    setValorPagamento('');
    setTipoItem('produto'); // Voltar para o tipo produto após adicionar
  };

  // Função para adicionar os itens selecionados à comanda
  const adicionarItensSelecionados = () => {
    // Fechar o modal de itens (o valor total será calculado automaticamente pelo useEffect)
    fecharModalItens();
  };

  // Função para limpar os itens selecionados
  const limparItensSelecionados = () => {
    setItensSelecionados([]);
    // O valorTotal será automaticamente calculado para 0 pelo useEffect
  };

  // useEffect para carregar itens quando o modal é aberto
  useEffect(() => {
    if (modalItensVisible) {
      carregarItensIniciais();
    }
  }, [modalItensVisible, tipoItem]);

  // useEffect para recalcular o valor total sempre que os itens selecionados mudarem
  useEffect(() => {
    const total = itensSelecionados.reduce((soma, item) => {
      return soma + (item.quantidade * item.preco);
    }, 0);
    setValorTotal(total);
  }, [itensSelecionados]);

  // Função para carregar comandas do banco de dados
  const carregarComandas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data_abertura', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "comandas" does not exist')) {
          setError('tabela_nao_existe');
          setLoading(false);
          return;
        }
        throw error;
      }

      const comandasFormatadas: ComandaDetalhada[] = await Promise.all((data || []).map(async (comanda) => {
        // Buscar itens da comanda
        const { data: itens, error: itensError } = await supabase
          .from('comandas_itens')
          .select('*')
          .eq('comanda_id', comanda.id);

        if (itensError) throw itensError;

        // Buscar nome do cliente
        const { data: cliente, error: clienteError } = await supabase
          .from('clientes')
          .select('nome, foto_url')
          .eq('id', comanda.cliente_id)
          .single();

        if (clienteError && clienteError.code !== 'PGRST116') throw clienteError;

        // Mapear os itens para garantir compatibilidade entre preco e preco_unitario
        const itensFormatados = itens ? itens.map(item => ({
          ...item,
          preco: item.preco || item.preco_unitario || 0, // Garantir que preco está presente para UI
        })) : [];

        return {
          ...comanda,
          cliente_nome: cliente?.nome || 'Cliente não encontrado',
          cliente_foto_url: cliente?.foto_url,
          itens: itensFormatados
        };
      }));

      setComandas(comandasFormatadas);
    } catch (error) {
      logger.error('Erro ao carregar comandas:', error);
      if ((error as any)?.message?.includes('relation "comandas" does not exist')) {
        setError('tabela_nao_existe');
      } else {
        Alert.alert('Erro', 'Não foi possível carregar as comandas');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar clientes
  const buscarClientes = async (query: string) => {
    try {
      setClienteQuery(query);
      
      // Se a query for igual ao nome do cliente selecionado, não mostrar a lista
      if (selectedCliente && query === selectedCliente.nome) {
        setMostrarListaClientes(false);
        return;
      }
      
      if (!query.trim()) {
        // Busca vazia: mantém a lista fechada para evitar modal longo ao abrir
        setClientesEncontrados(clientes);
        setMostrarListaClientes(false);
        return;
      }
      
      setBuscandoClientes(true);
      setMostrarListaClientes(true);
      
      logger.debug("Buscando cliente: ", query);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Tentar buscar por nome, ignorando maiúsculas/minúsculas
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nome', `%${query}%`)
  .eq('estabelecimento_id', estabelecimentoId)
        .limit(10);
      
      logger.debug("Clientes encontrados:", data ? data.length : 0);
        
      if (error) {
        logger.error("Erro na busca de clientes: ", error);
        
        // Tentar uma busca alternativa se a primeira falhar
        const { data: altData, error: altError } = await supabase
          .from('clientes')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .limit(10);
          
        if (altError) {
          logger.error("Erro na busca alternativa:", altError);
          throw altError;
        }
        
        logger.debug("Estrutura da tabela clientes:", altData?.[0] ? Object.keys(altData[0]) : "Sem dados");
        
        // Filtrar localmente se a consulta falhar
        const filteredData = altData?.filter(cliente => 
          cliente.nome?.toLowerCase().includes(query.toLowerCase())
        ) || [];
        
        setClientesEncontrados(filteredData);
        return;
      }
      
      setClientesEncontrados(data || []);
    } catch (error) {
      logger.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Falha ao buscar clientes');
    } finally {
      setBuscandoClientes(false);
    }
  };
  
  // Função para selecionar um cliente
  const selecionarCliente = async (cliente: ClienteComanda) => {
    // Definir o cliente selecionado e atualizar o campo de busca
    setClienteQuery(cliente.nome);
    
    // Ocultar a lista de sugestões
    setMostrarListaClientes(false);
    
    // Limpar os resultados da busca
    setClientesEncontrados([]);
    
    // Buscar o saldo do crediário do cliente
    try {
      const { data: movimentacoes, error } = await supabase
        .from('crediario_movimentacoes')
        .select('valor, tipo')
        .eq('cliente_id', cliente.id);
      
      if (error) {
        logger.error('Erro ao buscar saldo do crediário:', error);
      }
      
      // Calcular saldo (créditos são positivos, débitos são negativos)
      let saldo = 0;
      movimentacoes?.forEach(mov => {
        saldo += mov.valor;
      });
      
      // Atualizar o cliente com o saldo
      setSelectedCliente({
        ...cliente,
        saldo_crediario: saldo
      });
      
    } catch (error) {
      logger.error('Erro ao calcular saldo:', error);
      // Mesmo com erro, define o cliente (sem saldo)
      setSelectedCliente(cliente);
    }
    
    // Fechar o teclado
    Keyboard.dismiss();
  };
  
  // Função para criar nova comanda
  const criarNovaComanda = async () => {
    if (!selectedCliente) {
      Alert.alert('Atenção', 'Selecione um cliente para criar a comanda.');
      return;
    }

    // Validar se há pelo menos um item na comanda
    if (!itensSelecionados || itensSelecionados.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um item (produto, serviço ou pacote) antes de criar a comanda.');
      return;
    }

    if (!estabelecimentoId) {
      Alert.alert('Erro', 'Estabelecimento não identificado. Por favor, faça login novamente.');
      return;
    }

    try {
      // Obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      logger.debug('Criando comanda para usuário:', user.id);
      logger.debug('Estabelecimento ID:', estabelecimentoId);

      // Verificar se o usuário existe na tabela usuarios com estabelecimento_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nome_completo, estabelecimento_id')
        .eq('id', user.id)
        .single();

      if (usuarioError) {
        logger.error('Erro ao verificar usuário:', usuarioError);
        Alert.alert('Erro', 'Usuário não encontrado na base de dados. Entre em contato com o suporte.');
        return;
      }

      if (!usuarioData.estabelecimento_id) {
        logger.error('Usuário sem estabelecimento_id:', usuarioData);
        Alert.alert('Erro', 'Usuário não está associado a um estabelecimento. Entre em contato com o suporte.');
        return;
      }

      if (usuarioData.estabelecimento_id !== estabelecimentoId) {
        logger.error('Estabelecimento ID não confere:', {
          usuario: usuarioData.estabelecimento_id,
          contexto: estabelecimentoId
        });
        Alert.alert('Erro', 'Inconsistência nos dados do estabelecimento. Faça login novamente.');
        return;
      }

      logger.debug('Dados do usuário verificados:', usuarioData);

      // Criar comanda no banco de dados
      const comandaData = {
        cliente_id: selectedCliente.id,
        cliente_nome: selectedCliente.nome,
        status: 'aberta',
        valor_total: valorTotal,
        observacoes: observacoes || null,
        estabelecimento_id: estabelecimentoId,
        created_by_user_id: user.id,
        created_by_user_nome: usuarioData.nome_completo
      };

      logger.debug('Dados da comanda a ser criada:', comandaData);

      const { data, error } = await supabase
        .from('comandas')
        .insert(comandaData)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar comanda:', error);
        Alert.alert('Erro', 'Não foi possível criar a comanda. Tente novamente.');
        return;
      }

      // Adicionar itens à comanda (se houver)
      if (itensSelecionados.length > 0) {
        const itensComanda = itensSelecionados.map(item => {
          const baseItem = {
            comanda_id: data.id,
            tipo: item.tipo,
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            preco_unitario: item.preco,
            preco_total: item.quantidade * item.preco,
            estabelecimento_id: estabelecimentoId
          };

          // Para pagamentos, não incluir item_id
          if (item.tipo !== 'pagamento') {
            return {
              ...baseItem,
              item_id: item.id
            };
          }

          return baseItem;
        });

        logger.debug('DEBUG: Itens da comanda a serem inseridos:', JSON.stringify(itensComanda, null, 2));

        const { error: itensError } = await supabase
          .from('comandas_itens')
          .insert(itensComanda);

        if (itensError) {
          logger.error('Erro ao adicionar itens na comanda:', itensError);
          Alert.alert('Atenção', 'A comanda foi criada, mas houve um erro ao adicionar os itens.');
        }
      }

      // Adicionar a nova comanda à lista
      const novaComandaCompleta: ComandaDetalhada = {
        ...data,
        cliente_nome: selectedCliente.nome,
        itens: itensSelecionados.map(item => {
          const baseItem = {
            id: '', // Será preenchido pelo servidor, mas precisamos de um valor temporário
            tipo: item.tipo,
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            preco_unitario: item.preco, // Adicionado para compatibilidade com o banco de dados
            preco_total: item.quantidade * item.preco
          };

          // Para pagamentos, não incluir item_id
          if (item.tipo !== 'pagamento') {
            return {
              ...baseItem,
              item_id: item.id
            };
          }

          return baseItem;
        })
      };
      
      setComandas(prevComandas => [novaComandaCompleta, ...prevComandas]);

      // Fechar o modal
      fecharModalNovaComandaComAnimacao(() => {
        limparFormularioComanda();
      });
      
      // Mostrar mensagem de sucesso
      Alert.alert('Sucesso', 'Comanda criada com sucesso!');
      
      // Recarregar comandas para garantir que todos os dados estejam atualizados
      setTimeout(() => {
        carregarComandas();
      }, 1000);
    } catch (error) {
      logger.error('Erro ao criar comanda:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar a comanda. Tente novamente.');
    }
  };
  
  // Função para limpar o formulário de comanda
  const limparFormularioComanda = () => {
    setClienteQuery('');
    setSelectedCliente(null);
    setObservacoes('');
    setMostrarListaClientes(false);
    setItensSelecionados([]);
    setTipoItem(null); // Limpar seleção de tipo de item
    // O valorTotal será automaticamente calculado para 0 pelo useEffect
  };
  
  // Função para abrir uma comanda e exibir seus detalhes
  const abrirComanda = (comanda: ComandaDetalhada) => {
    setComandaEmEdicao(comanda);
    setModalVisible(true);
    
    // Animar a entrada do modal
    Animated.spring(translateY, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  // Função para fechar uma comanda
  const fecharComanda = async (comandaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar o nome completo do usuário na tabela de usuários
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nome_completo')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Buscar os itens da comanda
      const { data: itensComanda, error: itensError } = await supabase
        .from('comandas_itens')
        .select('*')
        .eq('comanda_id', comandaId);

      if (itensError) throw itensError;

      logger.debug('Itens da comanda:', itensComanda);

      // Verificar estoque para cada produto
      for (const item of itensComanda) {
        if (item.tipo === 'produto') {
          logger.debug('Verificando estoque do produto:', item.nome);
          
          // Buscar o produto atual
          const { data: produto, error: produtoError } = await supabase
            .from('produtos')
            .select('id, nome, quantidade')
            .eq('id', item.item_id)
            .single();

          if (produtoError) {
            logger.error('Erro ao buscar produto:', produtoError);
            throw produtoError;
          }

          logger.debug('Produto encontrado:', produto);
          logger.debug('Quantidade solicitada:', item.quantidade);
          logger.debug('Quantidade em estoque:', produto.quantidade);

          // Verificar se há estoque suficiente
          if (produto.quantidade < item.quantidade) {
            throw new Error(`Estoque insuficiente para o produto ${produto.nome}. Quantidade disponível: ${produto.quantidade}`);
          }
        }
      }

      // Se passou pela verificação, atualizar o estoque
      for (const item of itensComanda) {
        if (item.tipo === 'produto') {
          // Buscar o produto atual
          const { data: produto, error: produtoError } = await supabase
            .from('produtos')
            .select('quantidade')
            .eq('id', item.item_id)
            .single();

          if (produtoError) throw produtoError;

          // Calcular nova quantidade
          const novaQuantidade = produto.quantidade - item.quantidade;

          // Atualizar o estoque
          const { error: updateError } = await supabase
            .from('produtos')
            .update({ quantidade: novaQuantidade })
            .eq('id', item.item_id);

          if (updateError) throw updateError;
        }
      }

      // Atualizar o status da comanda
      const { error } = await supabase
        .from('comandas')
        .update({
          status: 'fechada',
          finalized_by_user_id: user.id,
          finalized_by_user_nome: userData?.nome_completo,
          finalized_at: new Date().toISOString(),
          forma_pagamento: formasPagamentoSelecionadas.length === 1 
            ? formasPagamentoSelecionadas[0] 
            : 'multiplo',
          formas_pagamento_detalhes: formasPagamentoSelecionadas.length > 1 || formasPagamentoSelecionadas.includes('crediario')
            ? JSON.stringify(
                formasPagamentoSelecionadas.includes('crediario')
                  ? [{ forma_pagamento: 'crediario', valor: valorTotalPagamento }]
                  : pagamentosMultiplos.filter(p => p.valor > 0)
              )
            : null,
          valor_total: valorTotalPagamento,
          valor_pago: formasPagamentoSelecionadas.includes('crediario') 
            ? 0 
            : pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0),
          troco: (() => {
            if (formasPagamentoSelecionadas.includes('crediario')) return 0;
            const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
            const diferenca = totalPagamentos - valorTotalPagamento;
            return diferenca > 0 ? diferenca : 0;
          })(),
          parcelas: pagamento.parcelas,
          comprovante_pix: null,
          saldo_aplicado: usarSaldoCrediario ? valorAplicadoSaldo : null
        })
        .eq('id', comandaId);

      if (error) throw error;

      // Registrar movimentação de crediário caso saldo tenha sido aplicado
      if (usarSaldoCrediario && valorAplicadoSaldo !== 0 && comandaEmEdicao?.cliente_id) {
        try {
          const tipoMov = saldoCrediario && saldoCrediario > 0 ? 'debito' : 'credito';
          const valorMov = saldoCrediario && saldoCrediario > 0 ? -Math.abs(valorAplicadoSaldo) : Math.abs(valorAplicadoSaldo);
          await offlineInsert(
            'crediario_movimentacoes',
            {
              cliente_id: comandaEmEdicao.cliente_id,
              valor: valorMov,
              tipo: tipoMov,
              descricao: 'Uso de saldo em comanda'
            },
            estabelecimentoId!
          );
        } catch (e) {
          logger.warn('Falha ao registrar movimentação de crediário:', e);
        }
      }

      // Se pagamento foi em Crediário, adicionar valor total como débito
      if (formasPagamentoSelecionadas.includes('crediario') && comandaEmEdicao?.cliente_id) {
        try {
          await offlineInsert(
            'crediario_movimentacoes',
            {
              cliente_id: comandaEmEdicao.cliente_id,
              valor: -valorTotalPagamento, // Valor negativo = débito
              tipo: 'debito',
              descricao: 'Compra a crediário',
              data: new Date().toISOString().slice(0, 10)
            },
            estabelecimentoId!
          );
        } catch (e) {
          logger.warn('Falha ao registrar compra a crediário:', e);
        }
      }

      await carregarComandas();
      setModalPagamentoVisible(false);
      setModalVisible(false);
      
      // Verificar se há troco ou falta e perguntar se deseja adicionar ao crediário
      // Não perguntar se pagamento foi em crediário
      if (comandaEmEdicao?.cliente_id && pagamento.forma_pagamento !== 'crediario') {
        // Calcular troco/falta com base no novo sistema
        let trocoCalculado = 0;
        let faltaCalculada = 0;
        
        if (formasPagamentoSelecionadas.includes('crediario')) {
          // Se crediário está selecionado, não mostra modal de troco/falta
          // pois o valor total já vai para o crediário
        } else {
          const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
          const diferenca = totalPagamentos - valorTotalPagamento;
          
          if (diferenca > 0) {
            trocoCalculado = diferenca;
          } else if (diferenca < 0) {
            faltaCalculada = Math.abs(diferenca);
          }
          
          // Só mostra o modal se tiver troco ou falta
          if (trocoCalculado > 0 || faltaCalculada > 0) {
            setValorTrocoFalta(trocoCalculado > 0 ? trocoCalculado : faltaCalculada);
            setTipoTrocoFalta(trocoCalculado > 0 ? 'troco' : 'falta');
            setModalTrocoFaltaVisible(true);
          }
        }
      }
    } catch (error: any) {
      logger.error('Erro ao fechar comanda:', error);
      Alert.alert('Erro', error.message || 'Não foi possível fechar a comanda');
    }
  };
  
  // Função para cancelar uma comanda
  const cancelarComanda = async (comandaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar o nome completo do usuário na tabela de usuários
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nome_completo')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { error } = await supabase
        .from('comandas')
        .update({
          status: 'cancelada',
          finalized_by_user_id: user.id,
          finalized_by_user_nome: userData?.nome_completo,
          finalized_at: new Date().toISOString()
        })
        .eq('id', comandaId);

      if (error) throw error;

      await carregarComandas();
      fecharModal();
    } catch (error) {
      logger.error('Erro ao cancelar comanda:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a comanda');
    }
  };

  // Função para atualizar itens de uma comanda aberta
  const atualizarComandaAberta = async () => {
    try {
      if (!comandaEmEdicao) return;

      // Deletar itens removidos
      const itensAtuaisIds = itensEditados.map(item => item.id);
      const itensOriginaisIds = comandaEmEdicao.itens.map(item => item.id);
      const itensParaRemover = itensOriginaisIds.filter(id => !itensAtuaisIds.includes(id));

      if (itensParaRemover.length > 0) {
        const { error: deleteError } = await supabase
          .from('comandas_itens')
          .delete()
          .in('id', itensParaRemover);

        if (deleteError) throw deleteError;
      }

      // Atualizar quantidades dos itens existentes e inserir novos
      for (const item of itensEditados) {
        // Verifica se é um item existente (não começa com "temp_")
        if (itensOriginaisIds.includes(item.id)) {
          // Atualizar item existente
          const { error: updateError } = await supabase
            .from('comandas_itens')
            .update({ 
              quantidade: item.quantidade,
              preco_total: (item.preco || item.preco_unitario || 0) * item.quantidade
            })
            .eq('id', item.id);

          if (updateError) throw updateError;
        } else {
          // Inserir novo item (ID começa com "temp_")
          const { error: insertError } = await supabase
            .from('comandas_itens')
            .insert({
              comanda_id: comandaEmEdicao.id,
              nome: item.nome,
              tipo: item.tipo,
              preco: item.preco || item.preco_unitario,
              preco_unitario: item.preco || item.preco_unitario,
              preco_total: (item.preco || item.preco_unitario || 0) * item.quantidade,
              quantidade: item.quantidade,
              item_id: item.item_id,
              estabelecimento_id: estabelecimentoId
            });

          if (insertError) throw insertError;
        }
      }

      // Recalcular valor total
      const novoValorTotal = itensEditados.reduce((total, item) => {
        return total + ((item.preco || item.preco_unitario || 0) * item.quantidade);
      }, 0);

      const { error: updateComandaError } = await supabase
        .from('comandas')
        .update({ 
          valor_total: novoValorTotal,
          observacoes: observacoesEditadas || null
        })
        .eq('id', comandaEmEdicao.id);

      if (updateComandaError) throw updateComandaError;

      // Recarregar comandas para atualizar a lista
      await carregarComandas();
      
      // Atualizar o objeto comandaEmEdicao com os novos valores
      const comandaAtualizada = {
        ...comandaEmEdicao,
        itens: itensEditados,
        valor_total: novoValorTotal,
        observacoes: observacoesEditadas || undefined
      };
      
      setComandaEmEdicao(comandaAtualizada as ComandaDetalhada);
      setEditandoComanda(false);
      
      Alert.alert('Sucesso', 'Comanda atualizada com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar comanda:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a comanda');
    }
  };
  // Função para adicionar item à comanda em edição
  const adicionarItemEdicao = (item: ProdutoComanda | ServicoComanda | PacoteComanda) => {
    // Verificar se já existe item com mesmo ID
    const itemExistente = itensEditados.find(i => i.item_id === item.id);
    
    if (itemExistente) {
      // Se já existe, aumenta a quantidade
      const novosItens = itensEditados.map(i => 
        i.item_id === item.id
          ? { ...i, quantidade: i.quantidade + 1, preco_total: (i.preco || i.preco_unitario || 0) * (i.quantidade + 1) }
          : i
      );
      setItensEditados(novosItens);
    } else {
      // Se não existe, adiciona como novo item
      // Determinar tipo do item dinamicamente
      const isPacote = 'valor' in item && 'desconto' in item;
      const isProduto = 'quantidade' in item;
      const tipo: 'produto' | 'servico' | 'pacote' = isPacote ? 'pacote' : (isProduto ? 'produto' : 'servico');
      
      const preco = isPacote 
        ? Number((item as PacoteComanda).valor) - Number((item as PacoteComanda).desconto || 0) 
        : Number((item as ProdutoComanda | ServicoComanda).preco);
      
      const novoItem: ItemComanda = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: item.nome,
        tipo: tipo,
        preco: preco,
        preco_unitario: preco,
        quantidade: 1,
        preco_total: preco,
        item_id: item.id,
      };
      
      setItensEditados([...itensEditados, novoItem]);
    }
    
    fecharModalItens();
  };

  // Função para excluir uma comanda
  const excluirComanda = async (comandaId: string) => {
    try {
      // Verificar se o usuário tem permissão (somente admin)
      if (role !== 'admin') {
        Alert.alert('Sem Permissão', 'Você não tem permissão para excluir comandas!');
        return;
      }

      logger.debug('Iniciando exclusão da comanda:', comandaId);
      
      // Confirmar exclusão
      Alert.alert(
        'Confirmação',
        'Tem certeza que deseja excluir esta comanda? Esta ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Excluir', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Primeiro excluir os itens da comanda
                logger.debug('Excluindo itens da comanda...');
                const { error: itensError } = await supabase
                  .from('comandas_itens')
                  .delete()
                  .eq('comanda_id', comandaId);
                
                if (itensError) {
                  logger.error('Erro ao excluir itens da comanda:', itensError);
                  Alert.alert('Erro', 'Não foi possível excluir os itens da comanda');
                  return;
                }
                
                logger.debug('Itens excluídos com sucesso');
                
                // Depois excluir a comanda
                logger.debug('Excluindo comanda...');
                const { error } = await supabase
                  .from('comandas')
                  .delete()
                  .eq('id', comandaId);
                
                if (error) {
                  logger.error('Erro ao excluir comanda:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a comanda. Verifique se você tem permissão para esta ação.');
                  return;
                }
                
                logger.debug('Comanda excluída com sucesso');
                
                // Fechar o modal e recarregar comandas
                setModalVisible(false);
                await carregarComandas();
                Alert.alert('Sucesso', 'Comanda excluída com sucesso');
              } catch (error) {
                logger.error('Erro durante a exclusão:', error);
                Alert.alert('Erro', 'Ocorreu um erro ao tentar excluir a comanda. Por favor, tente novamente.');
              }
            }
          }
        ]
      );
    } catch (error) {
      logger.error('Erro ao iniciar exclusão:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o processo de exclusão');
    }
  };

  // Função para diagnóstico da tabela clientes
  const diagnosticarTabelaClientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Listar alguns clientes para verificar a estrutura
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .limit(5);
        
      if (error) {
        logger.error("Erro ao listar clientes:", error);
        return;
      }
      
      logger.debug("Amostra de clientes:", data);
    } catch (error) {
      logger.error("Erro ao diagnosticar tabela clientes:", error);
    }
  };

  // Função para carregar clientes iniciais
  const carregarClientesIniciais = async () => {
    try {
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, foto_url, saldo_crediario, estabelecimento_id, created_at')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome')
        .limit(10);

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      logger.error('Erro ao carregar clientes iniciais:', error);
    }
  };

  // Função para carregar todos os clientes
  const carregarClientes = async () => {
    try {
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, foto_url, saldo_crediario, estabelecimento_id, created_at')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      logger.error('Erro ao carregar clientes:', error);
    }
  };

  const renderCardComanda = (item: any) => {
  const horarioFormatado = format(new Date(item.data_abertura), "dd/MM/yyyy 'às' HH:mm");
    
    return (
      <TouchableOpacity
        style={[
          styles.comandaCard,
          item.status === 'fechada' && styles.comandaFechada,
          item.status === 'cancelada' && styles.comandaCancelada,
        ]}
        onPress={() => abrirComanda(item)}
      >
        <View style={styles.comandaCardHeader}>
          <View style={styles.comandaCardClienteContainer}>
            {item.cliente_foto_url ? (
              <Image 
                source={{ uri: item.cliente_foto_url }} 
                style={styles.comandaCardFoto}
              />
            ) : (
              <View style={styles.comandaCardFotoPlaceholder}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
            )}
            <View style={styles.comandaCardClienteInfo}>
              <Text style={styles.comandaCardCliente}>{item.cliente_nome}</Text>
              <Text style={styles.comandaCardData}>
                {format(new Date(item.data_abertura), "dd/MM/yyyy 'às' HH:mm")}
              </Text>
            </View>
          </View>
          <Text style={styles.comandaCardDetails}>
            Criado por: {item.created_by_user_nome}{'\n'}
            {(item.status === 'fechada' || item.status === 'cancelada') && item.finalized_by_user_nome && (
              `Finalizado por: ${item.finalized_by_user_nome}${'\n'}`
            )}
            {(item.status === 'fechada' || item.status === 'cancelada') && item.finalized_at && (
              `Em: ${format(new Date(item.finalized_at), "dd/MM/yyyy 'às' HH:mm")}`
            )}
          </Text>
        </View>
        
        <View style={styles.comandaFooter}>
          <Text style={styles.comandaItens}>
            {item.itens?.length || 0} {item.itens?.length === 1 ? 'item' : 'itens'}
          </Text>
          <View style={styles.comandaAcoes}>
            <Text style={styles.comandaValor}>
              {item.valor_total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.excluirButton}
                onPress={() => excluirComanda(item.id)}
              >
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Função para abrir o modal de seleção de itens
  const abrirModalItens = (
    tipo: 'produto' | 'servico' | 'pacote',
    origemRef?: React.RefObject<any>
  ) => {
    setTipoItem(tipo);
    setTermoBusca('');

    const fallbackOrigem = () => {
      const { width, height } = Dimensions.get('window');
      iniciarAnimacaoAberturaItens(width / 2, height / 2);
    };

    if (origemRef?.current?.measureInWindow) {
      origemRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          iniciarAnimacaoAberturaItens(x + (width / 2), y + (height / 2));
          return;
        }
        fallbackOrigem();
      });
      return;
    }

    fallbackOrigem();
  };

  // Função para fechar o modal de seleção de itens
  const fecharModalItens = () => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroItens(origemModalItensRef.current.x, origemModalItensRef.current.y);

    Animated.parallel([
      Animated.timing(scaleItensAnim, {
        toValue: 0.25,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityItensAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateXItensAnim, {
        toValue: deltaX,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYItensAnim, {
        toValue: deltaY,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalItensVisible(false);
      scaleItensAnim.setValue(0);
      opacityItensAnim.setValue(0);
      translateXItensAnim.setValue(0);
      translateYItensAnim.setValue(0);
    });
  };

  // Função para verificar se o usuário é administrador
  const verificarPermissoes = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        if (error.code === '42703') { // Coluna não existe
          // Se a coluna não existe, considera como administrador
          setIsAdmin(true);
          return;
        }
        logger.error('Erro ao verificar permissões:', error);
        return;
      }

      // Verifica se o usuário é administrador (nivel_acesso_id = 1) ou se tem is_admin = true
      const temPermissao = !data?.nivel_acesso_id || data?.nivel_acesso_id === '1' || data?.is_admin === true;
      setIsAdmin(temPermissao);
    } catch (error) {
      logger.error('Erro ao verificar permissões:', error);
      setIsAdmin(false);
    }
  };

  // Função para abrir o modal de pagamento
  const abrirModalPagamento = (comanda: ComandaDetalhada) => {
    setComandaEmEdicao(comanda);
    setValorTotalPagamento(comanda.valor_total);
    
    // Resetar estados de múltiplos pagamentos
    setFormasPagamentoSelecionadas([]);
    setPagamentosMultiplos([]);
    
    setPagamento({
      forma_pagamento: 'dinheiro',
      valor_pago: comanda.valor_total,
      troco: 0,
      parcelas: undefined
    });
    setValorRecebido('');
    setTroco(0);
    setFalta(0);
    setUsarSaldoCrediario(false);
    setValorAplicadoSaldo(0);
    // Carrega saldo do crediário e decide exibir modal
    if (comanda.cliente_id) {
      carregarSaldoCrediario(comanda.cliente_id).then(saldo => {
        setSaldoCrediario(saldo);
        if (saldo !== 0) {
          setMostrarModalSaldo(true);
        } else {
          setModalPagamentoVisible(true);
        }
      });
    } else {
      setModalPagamentoVisible(true);
    }
  };

  // Função para toggle de forma de pagamento (múltipla seleção)
  const toggleFormaPagamento = (forma: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario') => {
    setFormasPagamentoSelecionadas(prev => {
      // Se selecionar crediário, limpa todas as outras
      if (forma === 'crediario') {
        if (prev.includes('crediario')) {
          // Remove crediário e limpa pagamentos
          setPagamentosMultiplos([]);
          return [];
        } else {
          // Seleciona apenas crediário e limpa todos os pagamentos
          setPagamentosMultiplos([]);
          return ['crediario'];
        }
      }
      
      // Se já tem crediário selecionado e tenta selecionar outro, remove crediário e adiciona o novo
      if (prev.includes('crediario')) {
        setPagamentosMultiplos([{ forma_pagamento: forma, valor: 0 }]);
        return [forma];
      }
      
      // Toggle normal para outras formas
      if (prev.includes(forma)) {
        // Remove a forma
        const novasFormas = prev.filter(f => f !== forma);
        // Remove também o pagamento correspondente
        setPagamentosMultiplos(pags => pags.filter(p => p.forma_pagamento !== forma));
        return novasFormas;
      } else {
        // Adiciona a forma
        const novasFormas = [...prev, forma];
        // Adiciona um novo pagamento vazio para essa forma
        setPagamentosMultiplos(pags => [...pags, { forma_pagamento: forma, valor: 0 }]);
        return novasFormas;
      }
    });
  };

  // Função para atualizar valor de uma forma de pagamento específica
  const atualizarValorPagamento = (forma: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario', valor: number) => {
    setPagamentosMultiplos(prev => 
      prev.map(p => p.forma_pagamento === forma ? { ...p, valor } : p)
    );
  };

  // Função para calcular o troco
  const calcularTroco = (valorPago: number) => {
    const troco = valorPago - valorTotalPagamento;
    setPagamento(prev => ({
      ...prev,
      valor_pago: valorPago,
      troco: troco > 0 ? troco : 0
    }));
  };

  // ======== INTEGRAÇÃO CREDIÁRIO ========
  const carregarSaldoCrediario = async (clienteId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('crediario_movimentacoes')
        .select('valor')
        .eq('cliente_id', clienteId);
      if (error) return 0;
      return (data || []).reduce((acc, mov) => acc + (typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor)), 0);
    } catch {
      return 0;
    }
  };

  const aplicarSaldoCrediario = () => {
    if (!saldoCrediario || saldoCrediario === 0) {
      setMostrarModalSaldo(false);
      setModalPagamentoVisible(true);
      return;
    }
    let total = comandaEmEdicao?.valor_total || 0;
    let aplicado = 0;
    if (saldoCrediario > 0) {
      aplicado = Math.min(saldoCrediario, total);
      total -= aplicado;
    } else {
      aplicado = Math.min(Math.abs(saldoCrediario), 9999999);
      total += aplicado;
    }
    setValorAplicadoSaldo(aplicado);
    setValorTotalPagamento(total);
    setUsarSaldoCrediario(true);
    setMostrarModalSaldo(false);
    setModalPagamentoVisible(true);
  };

  const ignorarSaldoCrediario = () => {
    setUsarSaldoCrediario(false);
    setValorAplicadoSaldo(0);
    setMostrarModalSaldo(false);
    setModalPagamentoVisible(true);
  };

  // Funções para adicionar troco/falta ao crediário
  const adicionarTrocoFaltaCrediario = async () => {
    if (!comandaEmEdicao?.cliente_id) return;
    
    try {
      const valor = tipoTrocoFalta === 'troco' ? valorTrocoFalta : -valorTrocoFalta;
      const tipo = tipoTrocoFalta === 'troco' ? 'credito' : 'debito';
      const descricao = tipoTrocoFalta === 'troco' 
        ? 'Troco convertido em crédito' 
        : 'Falta convertida em débito';
      
      await offlineInsert(
        'crediario_movimentacoes',
        {
          cliente_id: comandaEmEdicao.cliente_id,
          valor,
          tipo,
          descricao,
          data: new Date().toISOString().slice(0, 10)
        },
        estabelecimentoId!
      );

      // Atualizar a comanda com informação do troco/falta convertido
      const campoUpdate = tipoTrocoFalta === 'troco' 
        ? { troco_para_credito: valorTrocoFalta }
        : { falta_para_debito: valorTrocoFalta };
      
      await supabase
        .from('comandas')
        .update(campoUpdate)
        .eq('id', comandaEmEdicao.id);
      
      // Recarregar comandas para atualizar a visualização
      await carregarComandas();
      
      setModalTrocoFaltaVisible(false);
      Alert.alert('Sucesso', `${tipoTrocoFalta === 'troco' ? 'Troco' : 'Falta'} adicionado ao crediário do cliente!`);
    } catch (error) {
      logger.error('Erro ao adicionar ao crediário:', error);
      Alert.alert('Erro', 'Não foi possível adicionar ao crediário.');
    }
  };

  const ignorarTrocoFalta = () => {
    setModalTrocoFaltaVisible(false);
  };

  // Função para formatar valor em BRL
  const formatarValorBRL = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const valorNumerico = valor.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para obter os centavos
    const valorFloat = parseFloat(valorNumerico) / 100;
    
    // Formata para BRL
    return valorFloat.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para calcular troco/falta
  const calcularValores = (valor: string) => {
    // Limpar o valor recebido (remover R$ e espaços)
    const valorLimpo = valor.replace('R$', '').trim().replace(/\./g, '');
    
    // Converter para número
    const valorNumerico = parseFloat(valorLimpo.replace(',', '.')) || 0;
    
    // Atualizar o valor pago no estado de pagamento
    setPagamento(prev => ({
      ...prev,
      valor_pago: valorNumerico
    }));
    
    // Calcular troco ou falta
    const valorTotal = valorTotalPagamento;
    const diferenca = valorNumerico - valorTotal;
    
    if (diferenca >= 0) {
      setTroco(diferenca);
      setFalta(0);
    } else {
      setTroco(0);
      setFalta(Math.abs(diferenca));
    }
  };

  const uploadImageToSupabase = async (imageUri: string, fileName: string) => {
    try {
      // Ajusta a URI para Android
      const uri = Platform.OS === 'android' ? imageUri : imageUri.replace('file://', '');
      
      // Cria o FormData corretamente
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, formData, {
          contentType: 'multipart/form-data',
          upsert: true
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(fileName);

      // Atualizar a comanda com a URL do comprovante
      if (comandaEmEdicao?.id) {
        const { error: updateError } = await supabase
          .from('comandas')
          .update({ comprovante_pix: publicUrl })
          .eq('id', comandaEmEdicao.id);

        if (updateError) throw updateError;
      }

      return publicUrl;
    } catch (error) {
      logger.error('Erro no upload:', error);
      throw error;
    }
  };

  // Função para capturar/upload de imagem
  const handleComprovantePix = async (source: 'camera' | 'gallery') => {
    // Função removida
  };

  return (
    <View style={styles.container}>
      {/* Header com título e busca */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comandas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {/* Abas para filtrar comandas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, abaAtiva === 'abertas' && styles.tabActive]}
          onPress={() => setAbaAtiva('abertas')}
        >
          <Ionicons 
            name="ellipsis-horizontal-circle" 
            size={24} 
            color={abaAtiva === 'abertas' ? colors.white : colors.textSecondary} 
          />
          <Text style={[styles.tabText, abaAtiva === 'abertas' && styles.tabTextActive]}>
            Abertas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, abaAtiva === 'fechadas' && styles.tabActive]}
          onPress={() => setAbaAtiva('fechadas')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={abaAtiva === 'fechadas' ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.tabText, abaAtiva === 'fechadas' && styles.tabTextActive]}>
            Fechadas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, abaAtiva === 'canceladas' && styles.tabActive]}
          onPress={() => setAbaAtiva('canceladas')}
        >
          <Ionicons 
            name="close-circle" 
            size={24} 
            color={abaAtiva === 'canceladas' ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.tabText, abaAtiva === 'canceladas' && styles.tabTextActive]}>
            Canceladas
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Lista de comandas */}
      <View style={styles.comandasList}>
        <FlatList
          data={comandas.filter(comanda => {
            // Filtrar por status
            if (abaAtiva === 'abertas' && comanda.status !== 'aberta') return false;
            if (abaAtiva === 'fechadas' && comanda.status !== 'fechada') return false;
            if (abaAtiva === 'canceladas' && comanda.status !== 'cancelada') return false;
            
            // Filtrar pela busca
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                comanda.cliente_nome.toLowerCase().includes(query) ||
                comanda.id.toLowerCase().includes(query)
              );
            }
            
            return true;
          })}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={carregarComandas}
              colors={[colors.primary]}
            />
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderCardComanda(item)}
          contentContainerStyle={styles.comandasList}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : error === 'tabela_nao_existe' ? (
                <>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="warning-outline" size={60} color={colors.error} />
                  </View>
                  <Text style={styles.errorTitle}>Tabela não encontrada</Text>
                  <Text style={styles.errorText}>
                    A tabela de comandas não foi encontrada no banco de dados. 
                    Execute o script de migração para criar a estrutura necessária.
                  </Text>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={carregarComandas}
                  >
                    <Text style={styles.refreshButtonText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.emptyIconContainer}>
                    <FontAwesome5 name="clipboard-list" size={44} color={colors.borderLight} />
                  </View>
                  <Text style={styles.emptyText}>
                    {abaAtiva === 'abertas' 
                      ? 'Nenhuma comanda aberta encontrada'
                      : abaAtiva === 'fechadas'
                      ? 'Nenhuma comanda fechada encontrada'
                      : 'Nenhuma comanda cancelada encontrada'}
                  </Text>
                </>
              )}
            </View>
          }
        />
      </View>

      {/* Modal de Nova Comanda */}
      <Modal
        visible={modalNovaComandaVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
          fecharModalNovaComandaComAnimacao(() => {
            limparFormularioComanda();
          });
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              fecharModalNovaComandaComAnimacao(() => {
                limparFormularioComanda();
              });
            }} 
          />
          <Animated.View
            style={[
              styles.modalCardLarge,
              {
                transform: [
                  { translateX: translateXNovaComandaAnim },
                  { translateY: translateYNovaComandaAnim },
                  { scale: scaleNovaComandaAnim },
                ],
                opacity: opacityNovaComandaAnim,
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Comanda</Text>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Seleção de Cliente */}
              <View style={{marginBottom: 24}}>
                <Text style={styles.sectionTitle}>Cliente</Text>
                <View style={[styles.inputContainer, styles.clienteInput]}>
                  {selectedCliente && selectedCliente.foto_url ? (
                    <Image 
                      source={{ uri: selectedCliente.foto_url }} 
                      style={styles.clienteFotoSelected}
                    />
                  ) : selectedCliente ? (
                    <View style={styles.clienteFotoPlaceholderSelected}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                    </View>
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textSecondary} style={{marginRight: 8}} />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="Buscar cliente por nome..."
                    placeholderTextColor={colors.textSecondary}
                    value={clienteQuery}
                    onChangeText={(text) => {
                      buscarClientes(text);
                      setMostrarListaClientes(text.trim().length > 0);
                    }}
                    autoCapitalize="words"
                    onFocus={() => {
                      // Não abrir automaticamente com campo vazio
                      if (clienteQuery.trim().length > 0) {
                        setMostrarListaClientes(true);
                      }
                    }}
                    onBlur={() => {
                      // Pequeno atraso para permitir a seleção antes de fechar
                      setTimeout(() => {
                        if (!selectedCliente || clienteQuery !== selectedCliente.nome) {
                          setMostrarListaClientes(false);
                        }
                      }, 200);
                    }}
                  />
                  {clienteQuery ? (
                    <TouchableOpacity 
                      style={styles.clearButton} 
                      onPress={() => {
                        setClienteQuery('');
                        setSelectedCliente(null);
                        setClientesEncontrados(clientes);
                        setMostrarListaClientes(false);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                
                {(mostrarListaClientes && (!selectedCliente || clienteQuery !== selectedCliente.nome)) && (
                  <View style={styles.clientesDropdown}>
                    {buscandoClientes ? (
                      <View style={styles.centeredContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.mensagemCarregando}>Buscando clientes...</Text>
                      </View>
                    ) : clientesEncontrados.length > 0 ? (
                      <ScrollView 
                        style={{maxHeight: 200}} 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {clientesEncontrados.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.clienteItem}
                            onPress={() => selecionarCliente(item)}
                          >
                            {item.foto_url ? (
                              <Image 
                                source={{ uri: item.foto_url }} 
                                style={styles.clienteFoto}
                              />
                            ) : (
                              <View style={styles.clienteFotoPlaceholder}>
                                <Ionicons name="person" size={20} color={colors.primary} />
                              </View>
                            )}
                            <View style={styles.clienteInfo}>
                              <Text style={styles.clienteItemNome}>{item.nome}</Text>
                              {item.telefone && (
                                <Text style={styles.clienteItemTelefone}>{item.telefone}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.centeredContainer}>
                        {clienteQuery.length > 0 ? (
                          <View style={styles.novoClienteContainer}>
                            <Text style={styles.mensagemVazia}>Cliente não encontrado</Text>
                            <TouchableOpacity 
                              style={styles.novoClienteButton}
                              onPress={() => {
                                // Fechar o modal antes de navegar
                                setMostrarListaClientes(false);
                                
                                // Navegar para tela de cadastro de cliente
                                router.push({
                                  pathname: '/clientes/novo',
                                  params: { nome: clienteQuery, returnTo: 'comandas' }
                                });
                              }}
                            >
                              <Ionicons name="add-circle" size={16} color={colors.white} style={{marginRight: 4}} />
                              <Text style={styles.novoClienteButtonText}>Cadastrar novo cliente</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={styles.mensagemVazia}>Nenhum cliente cadastrado ainda.</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {/* Seção Itens */}
              <View style={{marginBottom: 24}}>
                <Text style={styles.sectionTitle}>Itens da Comanda</Text>
                
                <View style={styles.tipoItemContainer}>
                  <View style={[SELECTION_BUTTON_CONTAINER_STYLE, { paddingHorizontal: 0, justifyContent: 'space-between' }]}>
                    <View ref={produtoButtonNovaRef} collapsable={false} style={{ width: '48.5%' }}>
                      <SelectionButton
                        label="Produto"
                        icon="cube-outline"
                        onPress={() => {
                          setTipoItem('produto');
                          abrirModalItens('produto', produtoButtonNovaRef);
                        }}
                      />
                    </View>

                    <View ref={servicoButtonNovaRef} collapsable={false} style={{ width: '48.5%' }}>
                      <SelectionButton
                        label="Serviço"
                        icon="construct-outline"
                        onPress={() => {
                          setTipoItem('servico');
                          abrirModalItens('servico', servicoButtonNovaRef);
                        }}
                      />
                    </View>

                    <View ref={pacoteButtonNovaRef} collapsable={false} style={{ width: '48.5%' }}>
                      <SelectionButton
                        label="Pacote"
                        icon="gift-outline"
                        onPress={() => {
                          setTipoItem('pacote');
                          abrirModalItens('pacote', pacoteButtonNovaRef);
                        }}
                      />
                    </View>

                    <View collapsable={false} style={{ width: '48.5%' }}>
                      <SelectionButton
                        label="Pagamento"
                        icon="card-outline"
                        onPress={() => {
                          // Validação: cliente deve estar selecionado
                          if (!selectedCliente) {
                            Alert.alert('Atenção', 'Selecione um cliente primeiro antes de adicionar um pagamento.');
                            return;
                          }

                          // Validação: cliente deve ter saldo negativo (débito)
                          if (!selectedCliente.saldo_crediario || selectedCliente.saldo_crediario >= 0) {
                            Alert.alert(
                              'Atenção', 
                              'Esse cliente não tem débito. O saldo atual é ' + 
                              (selectedCliente.saldo_crediario 
                                ? `R$ ${selectedCliente.saldo_crediario.toFixed(2)}` 
                                : 'R$ 0,00') + 
                              '. Por favor, verifique!'
                            );
                            return;
                          }

                          setTipoItem('pagamento');
                          // Só adiciona se não houver pagamento já na lista
                          if (!itensSelecionados.some(item => item.tipo === 'pagamento')) {
                            const novoItem: ItemSelecionado = {
                              id: `pagamento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              nome: 'Pagamento',
                              preco: 0,
                              quantidade: 1,
                              tipo: 'pagamento'
                            };
                            setItensSelecionados([...itensSelecionados, novoItem]);
                          }
                        }}
                      />
                    </View>
                  </View>


                </View>
                
                {itensSelecionados.length > 0 ? (
                  <View style={styles.itensList}>
                    {itensSelecionados.map((item) => (
                      <View key={item.id} style={styles.itemContainer}>
                        <View style={styles.itemInfo}>
                          <View style={styles.itemBadge}>
                            <Text style={styles.itemBadgeText}>
                              {item.tipo === 'produto' ? 'P' : 
                               item.tipo === 'servico' ? 'S' : 
                               item.tipo === 'pacote' ? 'PC' : 'PG'}
                            </Text>
                          </View>
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemNome}>{item.nome}</Text>
                            <View style={styles.itemPrecoContainer}>
                              <Text style={styles.itemQuantidade}>x{item.quantidade}</Text>
                              <Text style={styles.itemPreco}>
                                R$ {(item.quantidade * item.preco).toFixed(2).replace('.', ',')}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.itemRemoveButton}
                            onPress={() => removerItemSelecionado(item.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    
                    <View style={styles.itemSubtotalContainer}>
                      <Text style={styles.itemSubtotalLabel}>Subtotal:</Text>
                      <Text style={styles.itemSubtotalValue}>
                        R$ {valorTotal.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                    
                    <View style={styles.itemsTotalContainer}>
                      <Text style={styles.itemsTotalLabel}>Total:</Text>
                      <Text style={styles.itemsTotalValue}>
                        R$ {valorTotal.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.itensVazios}>
                    <Text style={styles.itensVaziosText}>
                      Selecione produtos, serviços ou pacotes para adicionar à comanda
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Observações */}
              <View style={{marginBottom: 16}}>
                <Text style={styles.sectionTitle}>Observações</Text>
                <TextInput
                  style={styles.observacoesInput}
                  placeholder="Observações adicionais..."
                  placeholderTextColor={colors.textSecondary}
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={() => {
                    fecharModalNovaComandaComAnimacao(() => {
                      limparFormularioComanda();
                    });
                  }}
                >
                  Cancelar
                </Button>
              </View>
              
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={criarNovaComanda}
                  disabled={!selectedCliente}
                >
                  Criar Comanda
                </Button>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Saldo do Crediário */}
      <Modal
        visible={mostrarModalSaldo}
        transparent
        animationType="fade"
        onRequestClose={ignorarSaldoCrediario}
      >
        <View style={styles.optionsModalContainer}>
          <View style={[styles.optionsModalContent, { maxWidth: 420 }]}> 
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 8 }]}>Saldo de Crediário</Text>
            <Text style={{ textAlign: 'center', marginBottom: 12, color: colors.text }}>
              {selectedCliente ? `O cliente ${selectedCliente.nome} possui:` : 'Este cliente possui:'}
            </Text>
            <Text style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: (saldoCrediario || 0) >= 0 ? colors.success : colors.error,
              textAlign: 'center',
              marginBottom: 16
            }}>
              {(saldoCrediario || 0) >= 0 ? '+ ' : '- '} {Math.abs(saldoCrediario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.textSecondary }}>
              Deseja aplicar este saldo na comanda atual?
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Button
                variant="secondary"
                size="medium"
                onPress={ignorarSaldoCrediario}
                style={{ flex: 1, marginRight: 8 }}
              >
                Não usar
              </Button>
              <Button
                variant="primary"
                size="medium"
                onPress={aplicarSaldoCrediario}
                style={{ flex: 1, marginLeft: 8 }}
              >
                Usar Saldo
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Detalhes da Comanda */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={fecharModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: translateY }] }
            ]}
          >
            <View {...panResponder.panHandlers}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes da Comanda</Text>
              </View>
            </View>
            
            {comandaEmEdicao && (
              <ScrollView 
                style={[styles.modalBody]}
                contentContainerStyle={styles.modalScrollContent}
                nestedScrollEnabled={true}
                disableScrollViewPanResponder={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.comandaDetailHeader}>
                  <View style={styles.comandaDetailClienteContainer}>
                    {comandaEmEdicao.cliente_foto_url ? (
                      <Image 
                        source={{ uri: comandaEmEdicao.cliente_foto_url }} 
                        style={styles.comandaDetailFoto}
                      />
                    ) : (
                      <View style={styles.comandaDetailFotoPlaceholder}>
                        <Ionicons name="person" size={24} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.comandaDetailInfo}>
                      <Text style={styles.comandaDetailCliente}>{comandaEmEdicao.cliente_nome}</Text>
                      <Text style={styles.comandaDetailData}>
                        Data: {format(new Date(comandaEmEdicao.data_abertura), "dd/MM/yyyy 'às' HH:mm")}
                      </Text>
                      <Text style={styles.comandaDetailData}>
                        Criado por: {comandaEmEdicao.created_by_user_nome}
                      </Text>
                      {(comandaEmEdicao.status === 'fechada' || comandaEmEdicao.status === 'cancelada') && comandaEmEdicao.finalized_by_user_nome && comandaEmEdicao.finalized_at && (
                        <>
                          <Text style={styles.comandaDetailFinalizadoPor}>
                            Finalizado por: {comandaEmEdicao.finalized_by_user_nome}
                          </Text>
                          <Text style={styles.comandaDetailFinalizadoPor}>
                            Em: {format(new Date(comandaEmEdicao.finalized_at), "dd/MM/yyyy 'às' HH:mm")}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.comandaDetailStatus}>
                    <View style={[
                      styles.comandaDetailStatusBadge,
                      comandaEmEdicao.status === 'aberta' && {backgroundColor: colors.successBackground},
                      comandaEmEdicao.status === 'fechada' && {backgroundColor: colors.infoBackground},
                      comandaEmEdicao.status === 'cancelada' && {backgroundColor: colors.errorBackground}
                    ]}>
                      <Text style={styles.comandaDetailStatusText}>
                        {comandaEmEdicao.status === 'aberta' ? 'Aberta' : 
                         comandaEmEdicao.status === 'fechada' ? 'Fechada' : 'Cancelada'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.comandaItensContainer}>
                  <View style={styles.comandaItensTitleContainer}>
                    <Text style={styles.comandaItensTitle}>Itens da Comanda</Text>
                    {comandaEmEdicao.status === 'aberta' && !editandoComanda && (
                      <TouchableOpacity 
                        style={styles.editarItensButton}
                        onPress={() => {
                          setEditandoComanda(true);
                          setItensEditados([...comandaEmEdicao.itens]);
                          setObservacoesEditadas(comandaEmEdicao.observacoes || '');
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={styles.editarItensText}>Editar</Text>
                      </TouchableOpacity>
                    )}
                    {comandaEmEdicao.status === 'aberta' && editandoComanda && (
                      <TouchableOpacity 
                        style={styles.salvarItensButton}
                        onPress={async () => {
                          await atualizarComandaAberta();
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                        <Text style={styles.salvarItensText}>Salvar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {(editandoComanda ? itensEditados : comandaEmEdicao.itens) && (editandoComanda ? itensEditados : comandaEmEdicao.itens).length > 0 ? (
                    (editandoComanda ? itensEditados : comandaEmEdicao.itens).map((item, index) => (
                      <View key={item.id || index} style={styles.comandaItemCard}>
                        <View style={styles.comandaItemInfo}>
                          <View style={styles.itemBadge}>
                            <Text style={styles.itemBadgeText}>
                              {item.tipo === 'produto' ? 'P' : 
                               item.tipo === 'servico' ? 'S' : 
                               item.tipo === 'pacote' ? 'PC' : 'PG'}
                            </Text>
                          </View>
                          <View style={styles.comandaItemDetails}>
                            <Text style={styles.comandaItemName}>{item.nome}</Text>
                            {editandoComanda ? (
                              <View style={styles.quantidadeControls}>
                                <TouchableOpacity 
                                  onPress={() => {
                                    const novosItens = [...itensEditados];
                                    if (novosItens[index].quantidade > 1) {
                                      novosItens[index].quantidade -= 1;
                                      novosItens[index].preco_total = (novosItens[index].preco || novosItens[index].preco_unitario || 0) * novosItens[index].quantidade;
                                      setItensEditados(novosItens);
                                    }
                                  }}
                                  style={styles.quantidadeButton}
                                >
                                  <Ionicons name="remove" size={16} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.quantidadeText}>{item.quantidade}</Text>
                                <TouchableOpacity 
                                  onPress={() => {
                                    const novosItens = [...itensEditados];
                                    novosItens[index].quantidade += 1;
                                    novosItens[index].preco_total = (novosItens[index].preco || novosItens[index].preco_unitario || 0) * novosItens[index].quantidade;
                                    setItensEditados(novosItens);
                                  }}
                                  style={styles.quantidadeButton}
                                >
                                  <Ionicons name="add" size={16} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.comandaItemPrice}>
                                  x {((item.preco || item.preco_unitario || 0)).toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.comandaItemPrice}>
                                {item.quantidade}x {((item.preco || item.preco_unitario || 0)).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.comandaItemRight}>
                          <Text style={styles.comandaItemTotal}>
                            {((item.preco || item.preco_unitario || 0) * item.quantidade).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Text>
                          {editandoComanda && (
                            <TouchableOpacity 
                              onPress={() => {
                                const novosItens = itensEditados.filter((_, i) => i !== index);
                                setItensEditados(novosItens);
                              }}
                              style={styles.removerItemButton}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.itemsEmpty}>
                      <Text style={styles.itemsEmptyText}>Nenhum item encontrado</Text>
                    </View>
                  )}

                  {editandoComanda && (
                    <View style={styles.adicionarItensContainer}>
                      <Text style={styles.adicionarItensTitle}>Adicionar Itens</Text>
                      <View style={[SELECTION_BUTTON_CONTAINER_STYLE, { flexWrap: 'nowrap', paddingHorizontal: 0, gap: 6 }]}>
                        <View ref={produtoButtonEditRef} collapsable={false} style={{ flex: 1, minWidth: 0 }}>
                          <SelectionButton
                            label="Produto"
                            icon="cube-outline"
                            onPress={() => {
                              setTipoItem('produto');
                              abrirModalItens('produto', produtoButtonEditRef);
                            }}
                          />
                        </View>

                        <View ref={servicoButtonEditRef} collapsable={false} style={{ flex: 1, minWidth: 0 }}>
                          <SelectionButton
                            label="Serviço"
                            icon="cut-outline"
                            onPress={() => {
                              setTipoItem('servico');
                              abrirModalItens('servico', servicoButtonEditRef);
                            }}
                          />
                        </View>

                        <View ref={pacoteButtonEditRef} collapsable={false} style={{ flex: 1, minWidth: 0 }}>
                          <SelectionButton
                            label="Pacote"
                            icon="gift-outline"
                            onPress={() => {
                              setTipoItem('pacote');
                              abrirModalItens('pacote', pacoteButtonEditRef);
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                
                {/* Observações - Editável ou somente leitura */}
                <View style={styles.comandaObservacoes}>
                  <Text style={styles.comandaObservacoesTitle}>Observações:</Text>
                  {editandoComanda ? (
                    <TextInput
                      style={styles.observacoesInput}
                      placeholder="Adicione observações sobre a comanda..."
                      placeholderTextColor={colors.textSecondary}
                      value={observacoesEditadas}
                      onChangeText={setObservacoesEditadas}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  ) : (
                    comandaEmEdicao.observacoes ? (
                      <Text style={styles.comandaObservacoesText}>{comandaEmEdicao.observacoes}</Text>
                    ) : (
                      <Text style={styles.comandaObservacoesSemTexto}>Nenhuma observação</Text>
                    )
                  )}
                </View>
                
                <View style={styles.comandaTotalContainer}>
                  <View style={styles.comandaTotalRow}>
                    <Text style={styles.comandaTotalLabel}>Total:</Text>
                    <Text style={styles.comandaTotalValue}>
                      {(editandoComanda 
                        ? itensEditados.reduce((total, item) => total + ((item.preco || item.preco_unitario || 0) * item.quantidade), 0)
                        : comandaEmEdicao.valor_total || 0
                      ).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Text>
                  </View>
                </View>

                {comandaEmEdicao.status === 'fechada' && (
                  <View style={styles.comandaPagamentoContainer}>
                    <Text style={styles.comandaPagamentoLabel}>Forma de Pagamento:</Text>
                    
                    {/* Verificar se há múltiplas formas de pagamento */}
                    {comandaEmEdicao.forma_pagamento === 'multiplo' && comandaEmEdicao.formas_pagamento_detalhes ? (
                      <View style={{ marginTop: 8 }}>
                        {(() => {
                          try {
                            const formasPagamento = JSON.parse(comandaEmEdicao.formas_pagamento_detalhes);
                            return formasPagamento.map((forma: any, index: number) => {
                              const nomeForma = 
                                forma.forma_pagamento === 'dinheiro' ? 'Dinheiro' :
                                forma.forma_pagamento === 'cartao_credito' ? 'Cartão de Crédito' :
                                forma.forma_pagamento === 'cartao_debito' ? 'Cartão de Débito' :
                                forma.forma_pagamento === 'pix' ? 'PIX' :
                                'Crediário';
                              
                              return (
                                <View key={index} style={{ 
                                  flexDirection: 'row', 
                                  justifyContent: 'space-between',
                                  paddingVertical: 6,
                                  borderBottomWidth: index < formasPagamento.length - 1 ? 1 : 0,
                                  borderBottomColor: colors.border
                                }}>
                                  <Text style={[styles.comandaPagamentoValue, { fontWeight: '600' }]}>
                                    {nomeForma}
                                  </Text>
                                  <Text style={[styles.comandaValorPago, { color: colors.success, fontWeight: '700' }]}>
                                    {forma.valor.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </Text>
                                </View>
                              );
                            });
                          } catch (e) {
                            return <Text style={styles.comandaPagamentoValue}>Múltiplas formas</Text>;
                          }
                        })()}
                      </View>
                    ) : (
                      <>
                        <Text style={styles.comandaPagamentoValue}>
                          {comandaEmEdicao.forma_pagamento === 'dinheiro' ? 'Dinheiro' :
                           comandaEmEdicao.forma_pagamento === 'cartao_credito' ? 'Cartão de Crédito' :
                           comandaEmEdicao.forma_pagamento === 'cartao_debito' ? 'Cartão de Débito' :
                           comandaEmEdicao.forma_pagamento === 'pix' ? 'PIX' :
                           comandaEmEdicao.forma_pagamento === 'crediario' ? 'Crediário' : ''}
                        </Text>

                        {/* Valor Pago - para Dinheiro, Débito e PIX */}
                        {(comandaEmEdicao.forma_pagamento === 'dinheiro' || 
                          comandaEmEdicao.forma_pagamento === 'cartao_debito' || 
                          comandaEmEdicao.forma_pagamento === 'pix') && 
                          comandaEmEdicao.valor_pago && (
                          <Text style={styles.comandaValorPago}>
                            Valor pago: {comandaEmEdicao.valor_pago.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Text>
                        )}

                        {/* Parcelas - para Cartão de Crédito */}
                        {comandaEmEdicao.forma_pagamento === 'cartao_credito' && comandaEmEdicao.parcelas && (
                          <>
                            {comandaEmEdicao.valor_pago && (
                              <Text style={styles.comandaValorPago}>
                                Valor pago: {comandaEmEdicao.valor_pago.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </Text>
                            )}
                            <Text style={styles.comandaParcelas}>
                              {comandaEmEdicao.parcelas}x de {((comandaEmEdicao.valor_pago || comandaEmEdicao.valor_total) / comandaEmEdicao.parcelas).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Text>
                          </>
                        )}
                      </>
                    )}

                    {/* Informações de Crediário */}
                    {comandaEmEdicao.saldo_aplicado && comandaEmEdicao.saldo_aplicado !== 0 && (
                      <View style={styles.crediarioInfoBox}>
                        <View style={styles.crediarioInfoRow}>
                          <FontAwesome5 
                            name={comandaEmEdicao.saldo_aplicado > 0 ? "minus-circle" : "plus-circle"} 
                            size={16} 
                            color={comandaEmEdicao.saldo_aplicado > 0 ? colors.success : colors.error} 
                          />
                          <Text style={styles.crediarioInfoLabel}>
                            {comandaEmEdicao.saldo_aplicado > 0 ? 'Crédito usado:' : 'Débito quitado:'}
                          </Text>
                          <Text style={[
                            styles.crediarioInfoValue,
                            { color: comandaEmEdicao.saldo_aplicado > 0 ? colors.success : colors.error }
                          ]}>
                            {Math.abs(comandaEmEdicao.saldo_aplicado).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    {comandaEmEdicao.troco_para_credito && comandaEmEdicao.troco_para_credito > 0 && (
                      <View style={styles.crediarioInfoBox}>
                        <View style={styles.crediarioInfoRow}>
                          <FontAwesome5 name="plus-circle" size={16} color={colors.success} />
                          <Text style={styles.crediarioInfoLabel}>Troco → Crédito:</Text>
                          <Text style={[styles.crediarioInfoValue, { color: colors.success }]}>
                            +{comandaEmEdicao.troco_para_credito.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    {comandaEmEdicao.falta_para_debito && comandaEmEdicao.falta_para_debito > 0 && (
                      <View style={styles.crediarioInfoBox}>
                        <View style={styles.crediarioInfoRow}>
                          <FontAwesome5 name="minus-circle" size={16} color={colors.error} />
                          <Text style={styles.crediarioInfoLabel}>Falta → Débito:</Text>
                          <Text style={[styles.crediarioInfoValue, { color: colors.error }]}>
                            -{comandaEmEdicao.falta_para_debito.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    {comandaEmEdicao.forma_pagamento === 'crediario' && (
                      <View style={styles.crediarioInfoBox}>
                        <View style={styles.crediarioInfoRow}>
                          <FontAwesome5 name="file-invoice-dollar" size={16} color={colors.warning} />
                          <Text style={styles.crediarioInfoLabel}>Compra a crediário</Text>
                          <Text style={[styles.crediarioInfoValue, { color: colors.warning }]}>
                            {comandaEmEdicao.valor_total.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </Text>
                        </View>
                        <Text style={styles.crediarioInfoDesc}>
                          Valor adicionado como débito no crediário do cliente
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
            
            {comandaEmEdicao && comandaEmEdicao.status === 'aberta' && (
              <View style={styles.comandaActions}>
                <TouchableOpacity 
                  style={styles.cancelarComandaButton}
                  onPress={() => {
                    if (editandoComanda) {
                      setEditandoComanda(false);
                      setItensEditados([]);
                      setObservacoesEditadas('');
                    } else {
                      Alert.alert(
                        'Cancelar Comanda',
                        'Tem certeza que deseja cancelar esta comanda?',
                        [
                          { text: 'Não', style: 'cancel' },
                          { 
                            text: 'Sim, cancelar', 
                            onPress: () => {
                              if (comandaEmEdicao) {
                                cancelarComanda(comandaEmEdicao.id);
                              }
                            },
                            style: 'destructive'
                          }
                        ]
                      );
                    }
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                  <Text style={styles.cancelarComandaText}>
                    {editandoComanda ? 'Cancelar Edição' : 'Cancelar'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.fecharComandaButton}
                  onPress={() => {
                    if (comandaEmEdicao) {
                      abrirModalPagamento(comandaEmEdicao);
                    }
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.fecharComandaText}>Finalizar</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {comandaEmEdicao && comandaEmEdicao.status === 'cancelada' && isAdmin && (
              <View style={styles.comandaActions}>
                <TouchableOpacity 
                  style={styles.excluirComandaButton}
                  onPress={() => {
                    if (comandaEmEdicao) {
                      excluirComanda(comandaEmEdicao.id);
                    }
                  }}
                >
                  <Ionicons name="trash" size={20} color={colors.white} />
                  <Text style={styles.excluirComandaText}>Excluir Comanda</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
      
      {/* Modal de Seleção de Itens */}
      <Modal
        visible={modalItensVisible}
        animationType="none"
        transparent={true}
        onRequestClose={fecharModalItens}
      >
        <Pressable style={styles.modalBackdrop} onPress={fecharModalItens}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [
                  { translateX: translateXItensAnim },
                  { translateY: translateYItensAnim },
                  { scale: scaleItensAnim },
                ],
                opacity: opacityItensAnim,
              }
            ]}
          >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Selecionar {tipoItem === 'produto' ? 'Produtos' : 
                            tipoItem === 'servico' ? 'Serviços' : 'Pacotes'}
              </Text>
            </View>
            
            <View style={[styles.modalSearch, isModalSearchFocused && styles.modalSearchFocused]}>
              <Ionicons
                name="search"
                size={18}
                color={isModalSearchFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.modalSearchInput}
                value={termoBusca}
                onChangeText={setTermoBusca}
                onFocus={() => setIsModalSearchFocused(true)}
                onBlur={() => setIsModalSearchFocused(false)}
                placeholder={`Buscar ${tipoItem === 'produto' ? 'produtos' : 
                              tipoItem === 'servico' ? 'serviços' : 'pacotes'}...`}
                placeholderTextColor={colors.textSecondary}
              />
              {termoBusca ? (
                <TouchableOpacity onPress={() => setTermoBusca('')} style={{padding: 4}}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{paddingBottom: 16}}
              nestedScrollEnabled={true}
              disableScrollViewPanResponder={true}
            >
              {buscandoItens ? (
                <View style={styles.centeredContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mensagemCarregando}>Buscando itens...</Text>
                </View>
              ) : itensEncontrados.length > 0 ? (
                <View style={styles.modalList}>
                  {itensEncontrados.map((item) => {
                    const itemSelecionado = itensSelecionados.find(i => i.id === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.modalItem,
                          itemSelecionado && styles.modalItemSelecionado
                        ]}
                        onPress={() => selecionarItem(item)}
                      >
                        <View style={styles.modalItemInfo}>
                          <Text style={[
                            styles.modalItemNome,
                            itemSelecionado && styles.modalItemNomeSelecionado
                          ]}>
                            {item.nome}
                          </Text>
                          <View style={styles.modalItemDetalhes}>
                            <Text style={[
                              styles.modalItemPreco,
                              itemSelecionado && styles.modalItemPrecoSelecionado
                            ]}>
                              R$ {(() => {
                                if ('valor' in item && 'desconto' in item) {
                                  // Para pacotes, usar valor final (valor - desconto)
                                  return (Number(item.valor) - Number(item.desconto || 0)).toFixed(2).replace('.', ',');
                                } else {
                                  // Para produtos e serviços, usar preço normal
                                  return Number(item.preco).toFixed(2).replace('.', ',');
                                }
                              })()}
                            </Text>
                            {'quantidade' in item && (
                              <Text style={[
                                styles.modalItemEstoque,
                                itemSelecionado && {color: colors.primary}
                              ]}>
                                {item.quantidade} disponível
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.centeredContainer}>
                  <Text style={styles.mensagemVazia}>
                    Nenhum {tipoItem === 'produto' ? 'produto' : 
                            tipoItem === 'servico' ? 'serviço' : 'pacote'} encontrado
                  </Text>
                </View>
              )}
              
              {itensSelecionados.length > 0 && (
                <View style={styles.modalSelecionados}>
                  <Text style={styles.modalSelecionadosTitle}>Itens Selecionados</Text>
                  {itensSelecionados.filter(item => item.tipo === tipoItem).map((item) => (
                    <View key={item.id} style={styles.modalSelecionadoItem}>
                      <View style={styles.modalSelecionadoInfo}>
                        <Text style={styles.modalSelecionadoNome}>{item.nome}</Text>
                        <Text style={styles.modalSelecionadoPreco}>
                          R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      <View style={styles.modalSelecionadoQuantidade}>
                        <TouchableOpacity
                          onPress={() => alterarQuantidadeItem(item.id, Math.max(1, item.quantidade - 1))}
                          style={styles.modalQuantidadeButton}
                        >
                          <Ionicons name="remove" size={14} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalQuantidadeText}>{item.quantidade}</Text>
                        <TouchableOpacity
                          onPress={() => alterarQuantidadeItem(item.id, item.quantidade + 1)}
                          style={styles.modalQuantidadeButton}
                        >
                          <Ionicons name="add" size={14} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => removerItemSelecionado(item.id)}
                        style={styles.modalRemoverButton}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={fecharModalItens}
                >
                  Cancelar
                </Button>
              </View>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={adicionarItensSelecionados}
                  disabled={itensSelecionados.filter(item => item.tipo === tipoItem).length === 0}
                >
                  {`Adicionar (${itensSelecionados.filter(item => item.tipo === tipoItem).length})`}
                </Button>
              </View>
            </View>
          </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Modal de Pagamento */}
      <Modal
        visible={modalPagamentoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalPagamentoVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pagamento</Text>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {/* Indicador de Saldo Aplicado */}
              {usarSaldoCrediario && valorAplicadoSaldo !== 0 && (
                <View style={{
                  backgroundColor: saldoCrediario && saldoCrediario > 0 ? colors.successBackground : colors.errorBackground,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: saldoCrediario && saldoCrediario > 0 ? colors.success : colors.error,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        {saldoCrediario && saldoCrediario > 0 ? '✓ Crédito aplicado' : '⚠ Débito adicionado'}
                      </Text>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold',
                        color: saldoCrediario && saldoCrediario > 0 ? colors.success : colors.error
                      }}>
                        {saldoCrediario && saldoCrediario > 0 ? '- ' : '+ '}
                        {Math.abs(valorAplicadoSaldo).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={() => {
                        // Desfazer aplicação do saldo
                        setValorTotalPagamento(comandaEmEdicao?.valor_total || 0);
                        setUsarSaldoCrediario(false);
                        setValorAplicadoSaldo(0);
                        setPagamento(prev => ({
                          ...prev,
                          valor_pago: comandaEmEdicao?.valor_total || 0
                        }));
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '500', fontSize: 13 }}>
                        Desfazer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.pagamentoInfo}>
                <Text style={styles.pagamentoLabel}>Total a Pagar:</Text>
                <Text style={styles.pagamentoValor}>
                  {valorTotalPagamento.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              </View>

              <View style={styles.pagamentoForma}>
                <Text style={styles.pagamentoLabel}>Forma de Pagamento:</Text>
                <Text style={styles.pagamentoSubLabel}>Selecione uma ou mais opções (exceto Crediário com outras)</Text>
                <View style={styles.pagamentoOpcoes}>
                  <TouchableOpacity
                    style={[
                      styles.pagamentoOpcao,
                      formasPagamentoSelecionadas.includes('dinheiro') && styles.pagamentoOpcaoSelecionada
                    ]}
                    onPress={() => toggleFormaPagamento('dinheiro')}
                  >
                    <Ionicons 
                      name="cash-outline" 
                      size={24} 
                      color={formasPagamentoSelecionadas.includes('dinheiro') ? colors.white : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.pagamentoOpcaoTexto,
                      formasPagamentoSelecionadas.includes('dinheiro') && styles.pagamentoOpcaoTextoSelecionado
                    ]}>Dinheiro</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pagamentoOpcao,
                      formasPagamentoSelecionadas.includes('cartao_credito') && styles.pagamentoOpcaoSelecionada
                    ]}
                    onPress={() => toggleFormaPagamento('cartao_credito')}
                  >
                    <Ionicons 
                      name="card-outline" 
                      size={24} 
                      color={formasPagamentoSelecionadas.includes('cartao_credito') ? colors.white : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.pagamentoOpcaoTexto,
                      formasPagamentoSelecionadas.includes('cartao_credito') && styles.pagamentoOpcaoTextoSelecionado
                    ]}>Crédito</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pagamentoOpcao,
                      formasPagamentoSelecionadas.includes('cartao_debito') && styles.pagamentoOpcaoSelecionada
                    ]}
                    onPress={() => toggleFormaPagamento('cartao_debito')}
                  >
                    <Ionicons 
                      name="card-outline" 
                      size={24} 
                      color={formasPagamentoSelecionadas.includes('cartao_debito') ? colors.white : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.pagamentoOpcaoTexto,
                      formasPagamentoSelecionadas.includes('cartao_debito') && styles.pagamentoOpcaoTextoSelecionado
                    ]}>Débito</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pagamentoOpcao,
                      formasPagamentoSelecionadas.includes('pix') && styles.pagamentoOpcaoSelecionada
                    ]}
                    onPress={() => toggleFormaPagamento('pix')}
                  >
                    <Ionicons 
                      name="qr-code-outline" 
                      size={24} 
                      color={formasPagamentoSelecionadas.includes('pix') ? colors.white : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.pagamentoOpcaoTexto,
                      formasPagamentoSelecionadas.includes('pix') && styles.pagamentoOpcaoTextoSelecionado
                    ]}>PIX</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pagamentoOpcao,
                      formasPagamentoSelecionadas.includes('crediario') && styles.pagamentoOpcaoSelecionada,
                      // Desabilita se houver débito aplicado (saldo negativo usado)
                      usarSaldoCrediario && saldoCrediario !== null && saldoCrediario < 0 && { opacity: 0.5 }
                    ]}
                    onPress={() => {
                      // Bloqueia se débito foi aplicado
                      if (usarSaldoCrediario && saldoCrediario && saldoCrediario < 0) {
                        Alert.alert(
                          'Não disponível',
                          'Não é possível usar Crediário como forma de pagamento quando há débito aplicado do cliente.'
                        );
                        return;
                      }
                      toggleFormaPagamento('crediario');
                    }}
                    disabled={usarSaldoCrediario && saldoCrediario !== null && saldoCrediario < 0}
                  >
                    <Ionicons 
                      name="wallet-outline" 
                      size={24} 
                      color={formasPagamentoSelecionadas.includes('crediario') ? colors.white : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.pagamentoOpcaoTexto,
                      formasPagamentoSelecionadas.includes('crediario') && styles.pagamentoOpcaoTextoSelecionado
                    ]}>Crediário</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formasPagamentoSelecionadas.length > 0 && !formasPagamentoSelecionadas.includes('crediario') && (
                <View style={styles.pagamentoValorContainer}>
                  {formasPagamentoSelecionadas.filter(f => f !== 'crediario').map((forma) => {
                    const nomeForma = 
                      forma === 'dinheiro' ? 'Dinheiro' :
                      forma === 'cartao_credito' ? 'Crédito' :
                      forma === 'cartao_debito' ? 'Débito' :
                      'PIX';
                    
                    const valorAtual = pagamentosMultiplos.find(p => p.forma_pagamento === forma)?.valor || 0;
                    const valorFormatado = valorAtual > 0 ? 
                      valorAtual.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).replace('R$', '').trim() : '';
                    
                    return (
                      <View key={forma} style={{ marginBottom: 16 }}>
                        <Text style={styles.pagamentoLabel}>{nomeForma}:</Text>
                        <TextInput
                          style={styles.pagamentoInput}
                          keyboardType="numeric"
                          value={valorFormatado}
                          onChangeText={(text) => {
                            // Remove caracteres não numéricos
                            const valorLimpo = text.replace(/\D/g, '');
                            
                            // Converte para número
                            const valorNumerico = parseFloat(valorLimpo) / 100;
                            
                            // Atualiza o valor para esta forma de pagamento
                            atualizarValorPagamento(forma, valorNumerico);
                          }}
                          placeholder="R$ 0,00"
                        />
                      </View>
                    );
                  })}
                  
                  {(() => {
                    const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
                    const diferenca = totalPagamentos - valorTotalPagamento;
                    
                    return (
                      <>
                        <View style={[styles.pagamentoInfoContainer, { backgroundColor: colors.background, padding: 12, borderRadius: 8 }]}>
                          <Text style={[styles.pagamentoInfoLabel, { fontWeight: '600' }]}>Total Pagamentos:</Text>
                          <Text style={[styles.pagamentoInfoValor, { fontWeight: '700' }]}>
                            {totalPagamentos.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Text>
                        </View>
                        
                        {diferenca > 0 && (
                          <View style={styles.pagamentoInfoContainer}>
                            <Text style={styles.pagamentoInfoLabel}>Troco:</Text>
                            <Text style={styles.pagamentoInfoValor}>
                              {diferenca.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Text>
                          </View>
                        )}
                        
                        {diferenca < 0 && (
                          <View style={[styles.pagamentoInfoContainer, styles.pagamentoFaltaContainer]}>
                            <Text style={styles.pagamentoInfoLabel}>Falta:</Text>
                            <Text style={styles.pagamentoInfoValor}>
                              {Math.abs(diferenca).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              )}
              
              {formasPagamentoSelecionadas.includes('crediario') && (
                <View style={{
                  backgroundColor: colors.errorBackground,
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.error,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="card-outline" size={20} color={colors.error} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.error, marginLeft: 8 }}>
                      Pagamento no Crediário
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                    O valor total da comanda ({(comandaEmEdicao?.valor_total || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}) será adicionado como débito no crediário do cliente.
                  </Text>
                </View>
              )}
              {pagamento.forma_pagamento === 'cartao_credito' && !pagamento.parcelas && (
                <View style={styles.pagamentoParcelasContainer}>
                  <Text style={styles.pagamentoLabel}>Parcelamento:</Text>
                  <View style={styles.pagamentoParcelas}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((parcela) => (
                      <TouchableOpacity
                        key={parcela}
                        style={[
                          styles.pagamentoParcelaButton,
                          pagamento.parcelas === parcela && styles.pagamentoParcelaButtonSelecionada
                        ]}
                        onPress={() => setPagamento(prev => ({ ...prev, parcelas: parcela }))}
                      >
                        <Text style={[
                          styles.pagamentoParcelaText,
                          pagamento.parcelas === parcela && styles.pagamentoParcelaTextSelecionada
                        ]}>
                          {parcela}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.pagamentoValorParcela}>
                    Valor da parcela: {(comandaEmEdicao?.valor_total ? comandaEmEdicao.valor_total / (pagamento.parcelas || 1) : 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Text>
                </View>
              )}
              {pagamento.forma_pagamento === 'pix' && (
                <View style={styles.comprovanteContainer}>
                  <Text style={styles.comprovanteLabel}>Comprovante PIX</Text>
                  {/* Remover a renderização do comprovante PIX */}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={() => setModalPagamentoVisible(false)}
                >
                  Cancelar
                </Button>
              </View>
              
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={() => {
                    // Validações
                    if (formasPagamentoSelecionadas.length === 0) {
                      Alert.alert('Erro', 'Selecione uma forma de pagamento!');
                      return;
                    }
                    
                    // Se não for crediário, valida valores
                    if (!formasPagamentoSelecionadas.includes('crediario')) {
                      const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
                      
                      if (totalPagamentos === 0) {
                        Alert.alert('Erro', 'É necessário informar os valores dos pagamentos!');
                        return;
                      }
                    }
                    
                    if (comandaEmEdicao) {
                      fecharComanda(comandaEmEdicao.id);
                    }
                  }}
                  disabled={(() => {
                    // Se nenhuma forma selecionada
                    if (formasPagamentoSelecionadas.length === 0) {
                      return true;
                    }
                    
                    // Se crediário está selecionado, sempre habilita
                    if (formasPagamentoSelecionadas.includes('crediario')) {
                      return false;
                    }
                    
                    // Para outras formas, verifica se há valores
                    const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
                    return totalPagamentos === 0;
                  })()}
                >
                  Finalizar Pagamento
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Opções */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.optionsModalContainer}>
          <View style={styles.optionsModalContent}>
            <Text style={styles.optionsModalTitle}>Escolha uma opção</Text>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleComprovantePix('camera')}
            >
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={styles.optionButtonText}>Tirar Foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleComprovantePix('gallery')}
            >
              <Ionicons name="images" size={24} color={colors.primary} />
              <Text style={styles.optionButtonText}>Escolher da Galeria</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButtonCancel}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.optionButtonTextCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para adicionar Troco/Falta ao Crediário */}
      <Modal
        visible={modalTrocoFaltaVisible}
        transparent
        animationType="fade"
        onRequestClose={ignorarTrocoFalta}
      >
        <View style={styles.optionsModalContainer}>
          <View style={[styles.optionsModalContent, { maxWidth: 420 }]}> 
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 12 }]}>
              {tipoTrocoFalta === 'troco' ? '💰 Troco Disponível' : '⚠️ Valor em Falta'}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 12, color: colors.text }}>
              {tipoTrocoFalta === 'troco' 
                ? 'O cliente possui troco desta compra.' 
                : 'O cliente ficou devendo desta compra.'}
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: tipoTrocoFalta === 'troco' ? colors.success : colors.error,
              textAlign: 'center',
              marginBottom: 16
            }}>
              {valorTrocoFalta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.textSecondary, fontSize: 14 }}>
              {tipoTrocoFalta === 'troco'
                ? 'Deseja adicionar este valor como crédito no crediário do cliente?'
                : 'Deseja adicionar este valor como débito no crediário do cliente?'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={ignorarTrocoFalta}
                >
                  Não adicionar
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={adicionarTrocoFaltaCrediario}
                >
                  Adicionar
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 16,
    paddingTop: 45,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: -10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  comandasList: {
    paddingHorizontal: 16,
  },
  comandaCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comandaFechada: {
    backgroundColor: colors.surface,
  },
  comandaCancelada: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
  },
  comandaCardHeader: {
    marginBottom: 12,
  },
  comandaCardClienteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comandaCardFoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  comandaCardFotoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  comandaCardClienteInfo: {
    flex: 1,
  },
  comandaCardCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  comandaCardData: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  comandaCardDetails: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  comandaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comandaItens: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  comandaAcoes: {
    flexDirection: 'row',
  },
  comandaValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  comandaDetailHeader: {
    backgroundColor: colors.primaryBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comandaDetailClienteContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  comandaDetailFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  comandaDetailFotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  comandaDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  comandaDetailInfo: {
    flex: 1,
  },
  comandaDetailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  comandaDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  comandaDetailCliente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  comandaItemCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comandaItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comandaItemNome: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  comandaItemPreco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  comandaItemQtd: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  comandaItemTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  comandaItemTotalText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  comandaItemTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  itemTypeTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
  },
  itemTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  itemTypeTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTypeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  itemTypeTabTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  comandaDetailData: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  comandaDetailFinalizadoPor: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 20,
  },
  comandaDetailStatus: {
    marginTop: 8,
  },
  comandaDetailStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  comandaDetailStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  comandaItensContainer: {
    marginBottom: 16,
  },
  comandaItensTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comandaItensTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  editarItensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryBackground,
    borderRadius: 6,
  },
  editarItensText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  salvarItensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.successBackground,
    borderRadius: 6,
  },
  salvarItensText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
    marginLeft: 4,
  },
  quantidadeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quantidadeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantidadeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 8,
  },
  comandaItemRight: {
    alignItems: 'flex-end',
  },
  removerItemButton: {
    marginTop: 8,
    padding: 4,
  },
  adicionarItensContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  adicionarItensTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  // REMOVIDO: usar SELECTION_BUTTON_CONTAINER_STYLE importado de Buttons.tsx
  comandaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelarComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBackground,
    height: 48,
    borderRadius: 8,
    marginRight: 8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelarComandaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
  manterAbertaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBackground,
    height: 48,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  manterAbertaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  fecharComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 8,
    marginLeft: 8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  fecharComandaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.error,
    marginTop: 16,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 500,
    width: '100%',
    maxHeight: '74%',
    minHeight: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalCardLarge: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 500,
    width: '100%',
    maxHeight: '84%',
    minHeight: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalFooterButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: 4,
  },
  clienteInput: {
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  clientesDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  clienteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  clienteFoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  clienteFotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteFotoSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  clienteFotoPlaceholderSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clienteItemNome: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  clienteItemTelefone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mensagemCarregando: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  mensagemVazia: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  observacoesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  novoClienteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  novoClienteButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  novoClienteButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  comandaItemDetails: {
    flex: 1,
  },
  comandaItemName: {
    fontSize: 14,
    color: colors.text,
  },
  comandaItemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.infoBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  itemsEmpty: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  comandaObservacoes: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  comandaObservacoesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  comandaObservacoesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  comandaObservacoesSemTexto: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  comandaTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comandaTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comandaTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  comandaTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  comandaAcao: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFechada: {
    backgroundColor: colors.successBackground,
  },
  badgeCancelada: {
    backgroundColor: colors.errorBackground,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Estilos para seção de itens
  tipoItemContainer: {
    marginBottom: 16,
  },
  // REMOVIDO: usar SELECTION_BUTTON_CONTAINER_STYLE importado de Buttons.tsx
  itensList: {
    marginTop: 16,
  },
  itemContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 8,
  },
  itemNome: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  itemPrecoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQuantidade: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  itemRemoveButton: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  itemsTotalContainer: { // Renomeado de itemSubtotalContainer
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemsTotalLabel: { // Renomeado de itemSubtotalLabel
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemsTotalValue: { // Renomeado de itemSubtotalValue
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itensVazios: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  itensVaziosText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Estilos para o modal de seleção de itens - Minimalista
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
  },
  modalSearchFocused: {
    borderColor: colors.primary,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
  },
  modalList: {
    gap: 0,
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 9,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalItemSelecionado: {
    backgroundColor: colors.primaryBackground,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderLeftWidth: 4,
    shadowOpacity: 0.08,
    elevation: 3,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemNome: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 3,
  },
  modalItemNomeSelecionado: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalItemDetalhes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalItemPreco: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  modalItemPrecoSelecionado: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalItemEstoque: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalSelecionados: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSelecionadosTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalSelecionadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSelecionadoInfo: {
    flex: 1,
  },
  modalSelecionadoNome: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  modalSelecionadoPreco: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  modalSelecionadoQuantidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  modalQuantidadeButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuantidadeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    minWidth: 22,
    textAlign: 'center',
  },
  modalRemoverButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: colors.border,
  },
  modalConfirmButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  excluirComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    height: 48,
    borderRadius: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  excluirComandaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  pagamentoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  pagamentoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pagamentoSubLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pagamentoValor: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  pagamentoForma: {
    marginBottom: 24,
  },
  pagamentoOpcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pagamentoOpcao: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pagamentoOpcaoSelecionada: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pagamentoOpcaoTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pagamentoOpcaoTextoSelecionado: {
    color: '#FFFFFF',
  },
  pagamentoValorPago: {
    marginTop: 16,
  },
  pagamentoInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  pagamentoTroco: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.successBackground,
    borderRadius: 8,
  },
  pagamentoValorContainer: {
    marginTop: 16,
  },
  pagamentoInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  pagamentoFaltaContainer: {
    backgroundColor: colors.errorBackground,
  },
  pagamentoInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pagamentoInfoValor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  pagamentoParcelasContainer: {
    marginTop: 16,
  },
  pagamentoParcelas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pagamentoParcelaButton: {
    width: '22%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  pagamentoParcelaButtonSelecionada: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pagamentoParcelaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pagamentoParcelaTextSelecionada: {
    color: '#FFFFFF',
  },
  pagamentoValorParcela: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  pagamentoComprovanteContainer: {
    marginTop: 16,
  },
  comprovantePreviewContainerSmall: {
    marginTop: 8,
    alignItems: 'center',
  },
  comprovantePreviewSmall: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  comprovanteButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBackground,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  comprovanteButtonTextSmall: {
    color: colors.primary,
    fontWeight: '600',
  },
  comprovanteContainer: {
    marginTop: 20,
    width: '100%',
  },
  comprovanteLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  comprovantePreviewContainer: {
    width: '100%',
    marginBottom: 10,
  },
  comprovantePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  comprovanteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBackground,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  comprovanteButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  comprovantePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  comprovantePlaceholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  optionsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 20,
    width: '80%',
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: colors.primaryBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  optionButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionButtonCancel: {
    backgroundColor: colors.errorBackground,
    padding: 12,
    borderRadius: 8,
  },
  optionButtonTextCancel: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemSubtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  itemSubtotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemSubtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  excluirButton: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  comandaPagamentoContainer: {
    flexDirection: 'column',
    marginTop: 10,
  },
  comandaPagamentoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  comandaPagamentoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  comandaValorPago: {
    fontSize: 14,
    color: colors.success,
    marginTop: 6,
    fontWeight: '600',
  },
  comandaParcelas: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  crediarioInfoBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  crediarioInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crediarioInfoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 4,
  },
  crediarioInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  crediarioInfoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginLeft: 24,
  },
  comandaDetailCriadoPor: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalItemIndisponivel: {
    opacity: 0.5,
    backgroundColor: colors.background,
  },
  modalItemTextIndisponivel: {
    color: colors.textDisabled,
  },
  modalItemEstoqueZero: {
    color: colors.error,
  },
  novoPagamentoContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  novoPagamentoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  novoPagamentoInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  adicionarPagamentoButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  adicionarPagamentoButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  adicionarPagamentoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adicionarPagamentoButtonTextDisabled: {
    color: colors.textDisabled,
  },
}); 
