import React, { useState, useEffect, useRef } from 'react';
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
  Platform
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

// Interfaces
interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  foto_url?: string;
  saldo_crediario?: number;
  estabelecimento_id: string;
  created_at?: string;
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
}

interface Pacote {
  id: string;
  nome: string;
  valor: number;
  desconto: number;
}

interface ItemComanda {
  id: string;
  tipo: 'produto' | 'servico' | 'pacote';
  nome: string;
  quantidade: number;
  preco?: number;
  preco_unitario?: number; // Adicionado para compatibilidade com o banco de dados
  preco_total: number;
  item_id: string;
}

interface ItemSelecionado {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  tipo: 'produto' | 'servico' | 'pacote' | 'pagamento';
  quantidade_disponivel?: number;
}

interface Comanda {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_foto_url?: string;
  data_abertura: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  valor_total: number;
  itens: ItemComanda[];
  observacoes?: string;
  usuario_id?: string;
  usuario_nome?: string;
  forma_pagamento?: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario' | 'multiplo';
  formas_pagamento_detalhes?: string; // JSON com array de { forma_pagamento, valor }
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
}

interface Pagamento {
  forma_pagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario';
  valor_pago: number;
  troco: number;
  parcelas?: number; // Adicionando campo de parcelas
  comprovante_pix?: string; // Adicionando campo para URL do comprovante
}

interface PagamentoMultiplo {
  forma_pagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario';
  valor: number;
  parcelas?: number;
  comprovante_pix?: string;
}

// Interface para parâmetros de rota
interface RouteParams {
  clienteId?: string;
  clienteNome?: string;
  returnTo?: string;
}

export default function ComandasScreen() {
  // Estados para gerenciar comandas
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'abertas' | 'fechadas' | 'canceladas'>('abertas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // Estado para verificar se o usuário é administrador

  // Estados para cliente e comanda
  const [clienteQuery, setClienteQuery] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [observacoes, setObservacoes] = useState('');

  // Estados para itens da comanda
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
  const [valorTotal, setValorTotal] = useState(0);
  const [modalItensVisible, setModalItensVisible] = useState(false);
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico' | 'pacote' | 'pagamento' | null>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [itensEncontrados, setItensEncontrados] = useState<(Produto | Servico | Pacote)[]>([]);
  const [buscandoItens, setBuscandoItens] = useState(false);

  // Estados para modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNovaComandaVisible, setModalNovaComandaVisible] = useState(false);
  const [comandaEmEdicao, setComandaEmEdicao] = useState<Comanda | null>(null);
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
  const translateYNovaComanda = useRef(new Animated.Value(500)).current;
  const translateYItens = useRef(new Animated.Value(500)).current;

  const router = useRouter();
  const { session, estabelecimentoId, role } = useAuth(); // Usando o hook useAuth para pegar a sessão, estabelecimento e role

  useEffect(() => {
    if (!session?.user?.id) return;
    
    carregarComandas();
    carregarClientesIniciais();
    verificarPermissoes();

    const subscriptionAtualizar = DeviceEventEmitter.addListener('atualizarComandas', () => {
      carregarComandas();
    });
    
    const subscriptionNovaComanda = DeviceEventEmitter.addListener('novaComanda', () => {
      console.log("Evento novaComanda recebido");
      // Definir a posição inicial da animação
      translateYNovaComanda.setValue(500);
      // Abrir o modal
      setModalNovaComandaVisible(true);
      
      // Pré-carregar alguns clientes
      carregarClientesIniciais();
      
      // Animar a entrada do modal
      Animated.spring(translateYNovaComanda, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });
    
    // Monitorar evento de navegação para retornar após cadastrar cliente
    const subscriptionNovoCliente = DeviceEventEmitter.addListener('clienteCadastrado', (data: RouteParams) => {
      console.log("Evento clienteCadastrado recebido", data);
      
      if (data.clienteId && data.clienteNome && data.returnTo === 'comandas') {
        // Selecionar o cliente recém-cadastrado
        const novoCliente: Cliente = {
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
  }, [session?.user?.id]);

  // useEffect para carregar comandas quando a tela é montada ou quando há mudança de aba
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

  const panResponderNovaComanda = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYNovaComanda.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Fechar o modal se arrastar para baixo mais de 100px
          Animated.timing(translateYNovaComanda, {
            toValue: 500,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setModalNovaComandaVisible(false);
            translateYNovaComanda.setValue(500);
          });
        } else {
          // Retornar à posição original
          Animated.spring(translateYNovaComanda, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
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
      console.log('Query de busca:', query);
      console.log('Produtos encontrados:', data);
      
      // Verificar se a quantidade está presente
      if (data && data.length > 0) {
        console.log('Primeiro produto:', data[0]);
        console.log('Quantidade do primeiro produto:', data[0].quantidade);
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
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
      console.error('Erro ao buscar serviços:', error);
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
      console.error('Erro ao buscar pacotes:', error);
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
      console.error('Erro ao carregar itens iniciais:', error);
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
      console.error('Erro ao buscar itens:', error);
      setItensEncontrados([]);
    } finally {
      setBuscandoItens(false);
    }
  };

  // Função para selecionar um item
  const selecionarItem = (item: Produto | Servico | Pacote) => {
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
      const preco = tipoItem === 'pacote' ? Number((item as Pacote).valor) - Number((item as Pacote).desconto || 0) : 
                   ('valor' in item ? Number(item.valor) : Number((item as Produto | Servico).preco));
      const itemSelecionado: ItemSelecionado = {
        id: item.id,
        nome: item.nome,
        preco: preco,
        quantidade: 1,
        tipo: tipoItem || 'produto'
      };
      
      if ('quantidade' in item) {
        console.log('Item com quantidade:', item);
        console.log('Quantidade:', item.quantidade);
        itemSelecionado.quantidade_disponivel = item.quantidade;
        console.log('Item selecionado com quantidade_disponivel:', itemSelecionado);
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
        console.error('Estabelecimento ID não encontrado');
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

      const comandasFormatadas: Comanda[] = await Promise.all((data || []).map(async (comanda) => {
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
      console.error('Erro ao carregar comandas:', error);
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
        // Se a busca for vazia, mostrar a lista de clientes iniciais
        setClientesEncontrados(clientes);
        setMostrarListaClientes(!!clientes.length);
        return;
      }
      
      setBuscandoClientes(true);
      setMostrarListaClientes(true);
      
      console.log("Buscando cliente: ", query);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Tentar buscar por nome, ignorando maiúsculas/minúsculas
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nome', `%${query}%`)
  .eq('estabelecimento_id', estabelecimentoId)
        .limit(10);
      
      console.log("Clientes encontrados:", data ? data.length : 0);
        
      if (error) {
        console.error("Erro na busca de clientes: ", error);
        
        // Tentar uma busca alternativa se a primeira falhar
        const { data: altData, error: altError } = await supabase
          .from('clientes')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .limit(10);
          
        if (altError) {
          console.error("Erro na busca alternativa:", altError);
          throw altError;
        }
        
        console.log("Estrutura da tabela clientes:", altData?.[0] ? Object.keys(altData[0]) : "Sem dados");
        
        // Filtrar localmente se a consulta falhar
        const filteredData = altData?.filter(cliente => 
          cliente.nome?.toLowerCase().includes(query.toLowerCase())
        ) || [];
        
        setClientesEncontrados(filteredData);
        return;
      }
      
      setClientesEncontrados(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Falha ao buscar clientes');
    } finally {
      setBuscandoClientes(false);
    }
  };
  
  // Função para selecionar um cliente
  const selecionarCliente = async (cliente: Cliente) => {
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
        console.error('Erro ao buscar saldo do crediário:', error);
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
      console.error('Erro ao calcular saldo:', error);
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

      console.log('Criando comanda para usuário:', user.id);
      console.log('Estabelecimento ID:', estabelecimentoId);

      // Verificar se o usuário existe na tabela usuarios com estabelecimento_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nome_completo, estabelecimento_id')
        .eq('id', user.id)
        .single();

      if (usuarioError) {
        console.error('Erro ao verificar usuário:', usuarioError);
        Alert.alert('Erro', 'Usuário não encontrado na base de dados. Entre em contato com o suporte.');
        return;
      }

      if (!usuarioData.estabelecimento_id) {
        console.error('Usuário sem estabelecimento_id:', usuarioData);
        Alert.alert('Erro', 'Usuário não está associado a um estabelecimento. Entre em contato com o suporte.');
        return;
      }

      if (usuarioData.estabelecimento_id !== estabelecimentoId) {
        console.error('Estabelecimento ID não confere:', {
          usuario: usuarioData.estabelecimento_id,
          contexto: estabelecimentoId
        });
        Alert.alert('Erro', 'Inconsistência nos dados do estabelecimento. Faça login novamente.');
        return;
      }

      console.log('Dados do usuário verificados:', usuarioData);

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

      console.log('Dados da comanda a ser criada:', comandaData);

      const { data, error } = await supabase
        .from('comandas')
        .insert(comandaData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar comanda:', error);
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

        console.log('DEBUG: Itens da comanda a serem inseridos:', JSON.stringify(itensComanda, null, 2));

        const { error: itensError } = await supabase
          .from('comandas_itens')
          .insert(itensComanda);

        if (itensError) {
          console.error('Erro ao adicionar itens na comanda:', itensError);
          Alert.alert('Atenção', 'A comanda foi criada, mas houve um erro ao adicionar os itens.');
        }
      }

      // Adicionar a nova comanda à lista
      const novaComandaCompleta: Comanda = {
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
      Animated.timing(translateYNovaComanda, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setModalNovaComandaVisible(false);
        limparFormularioComanda();
        
        // Mostrar mensagem de sucesso
        Alert.alert('Sucesso', 'Comanda criada com sucesso!');
        
        // Recarregar comandas para garantir que todos os dados estejam atualizados
        setTimeout(() => {
          carregarComandas();
        }, 1000);
      });
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
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
  const abrirComanda = (comanda: Comanda) => {
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

      console.log('Itens da comanda:', itensComanda);

      // Verificar estoque para cada produto
      for (const item of itensComanda) {
        if (item.tipo === 'produto') {
          console.log('Verificando estoque do produto:', item.nome);
          
          // Buscar o produto atual
          const { data: produto, error: produtoError } = await supabase
            .from('produtos')
            .select('id, nome, quantidade')
            .eq('id', item.item_id)
            .single();

          if (produtoError) {
            console.error('Erro ao buscar produto:', produtoError);
            throw produtoError;
          }

          console.log('Produto encontrado:', produto);
          console.log('Quantidade solicitada:', item.quantidade);
          console.log('Quantidade em estoque:', produto.quantidade);

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
          await supabase.from('crediario_movimentacoes').insert({
            cliente_id: comandaEmEdicao.cliente_id,
            valor: valorMov,
            tipo: tipoMov,
            descricao: 'Uso de saldo em comanda'
          });
        } catch (e) {
          console.warn('Falha ao registrar movimentação de crediário:', e);
        }
      }

      // Se pagamento foi em Crediário, adicionar valor total como débito
      if (formasPagamentoSelecionadas.includes('crediario') && comandaEmEdicao?.cliente_id) {
        try {
          await supabase.from('crediario_movimentacoes').insert({
            cliente_id: comandaEmEdicao.cliente_id,
            valor: -valorTotalPagamento, // Valor negativo = débito
            tipo: 'debito',
            descricao: 'Compra a crediário',
            data: new Date().toISOString().slice(0, 10)
          });
        } catch (e) {
          console.warn('Falha ao registrar compra a crediário:', e);
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
          const totalComanda = comandaEmEdicao?.valor_total || 0;
          const diferenca = totalPagamentos - totalComanda;
          
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
      console.error('Erro ao fechar comanda:', error);
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
      console.error('Erro ao cancelar comanda:', error);
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
      
      setComandaEmEdicao(comandaAtualizada as Comanda);
      setEditandoComanda(false);
      
      Alert.alert('Sucesso', 'Comanda atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a comanda');
    }
  };

  // Função para adicionar item à comanda em edição
  const adicionarItemEdicao = (item: Produto | Servico | Pacote) => {
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
      const preco = tipoItem === 'pacote' 
        ? Number((item as Pacote).valor) - Number((item as Pacote).desconto || 0) 
        : ('valor' in item ? Number(item.valor) : Number((item as Produto | Servico).preco));
      
      const novoItem: ItemComanda = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: item.nome,
        tipo: (tipoItem === 'pagamento' ? 'produto' : tipoItem) as 'produto' | 'servico' | 'pacote',
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

      console.log('Iniciando exclusão da comanda:', comandaId);
      
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
                console.log('Excluindo itens da comanda...');
                const { error: itensError } = await supabase
                  .from('comandas_itens')
                  .delete()
                  .eq('comanda_id', comandaId);
                
                if (itensError) {
                  console.error('Erro ao excluir itens da comanda:', itensError);
                  Alert.alert('Erro', 'Não foi possível excluir os itens da comanda');
                  return;
                }
                
                console.log('Itens excluídos com sucesso');
                
                // Depois excluir a comanda
                console.log('Excluindo comanda...');
                const { error } = await supabase
                  .from('comandas')
                  .delete()
                  .eq('id', comandaId);
                
                if (error) {
                  console.error('Erro ao excluir comanda:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a comanda. Verifique se você tem permissão para esta ação.');
                  return;
                }
                
                console.log('Comanda excluída com sucesso');
                
                // Fechar o modal e recarregar comandas
                setModalVisible(false);
                await carregarComandas();
                Alert.alert('Sucesso', 'Comanda excluída com sucesso');
              } catch (error) {
                console.error('Erro durante a exclusão:', error);
                Alert.alert('Erro', 'Ocorreu um erro ao tentar excluir a comanda. Por favor, tente novamente.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao iniciar exclusão:', error);
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
        console.error("Erro ao listar clientes:", error);
        return;
      }
      
      console.log("Amostra de clientes:", data);
    } catch (error) {
      console.error("Erro ao diagnosticar tabela clientes:", error);
    }
  };

  // Função para carregar clientes iniciais
  const carregarClientesIniciais = async () => {
    try {
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado');
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
      console.error('Erro ao carregar clientes iniciais:', error);
    }
  };

  // Função para carregar todos os clientes
  const carregarClientes = async () => {
    try {
      if (!estabelecimentoId) {
        console.error('Estabelecimento ID não encontrado');
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
      console.error('Erro ao carregar clientes:', error);
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
                <Ionicons name="person" size={18} color="#7C3AED" />
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
                <Ionicons name="trash-outline" size={24} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Função para abrir o modal de seleção de itens
  const abrirModalItens = (tipo: 'produto' | 'servico' | 'pacote') => {
    setTipoItem(tipo);
    setTermoBusca('');
    translateYItens.setValue(500); // Garante que o valor inicial está correto
    setModalItensVisible(true);
  };

  // Função para fechar o modal de seleção de itens
  const fecharModalItens = () => {
    Animated.timing(translateYItens, {
      toValue: 500,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalItensVisible(false);
      translateYItens.setValue(500);
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
        console.error('Erro ao verificar permissões:', error);
        return;
      }

      // Verifica se o usuário é administrador (nivel_acesso_id = 1) ou se tem is_admin = true
      const temPermissao = !data?.nivel_acesso_id || data?.nivel_acesso_id === '1' || data?.is_admin === true;
      setIsAdmin(temPermissao);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setIsAdmin(false);
    }
  };

  // Função para abrir o modal de pagamento
  const abrirModalPagamento = (comanda: Comanda) => {
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
      
      await supabase.from('crediario_movimentacoes').insert({
        cliente_id: comandaEmEdicao.cliente_id,
        valor,
        tipo,
        descricao,
        data: new Date().toISOString().slice(0, 10)
      });

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
      console.error('Erro ao adicionar ao crediário:', error);
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
      console.error('Erro no upload:', error);
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
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comandas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
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
            color={abaAtiva === 'abertas' ? '#7C3AED' : '#6B7280'} 
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
            color={abaAtiva === 'fechadas' ? '#7C3AED' : '#6B7280'}
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
            color={abaAtiva === 'canceladas' ? '#7C3AED' : '#6B7280'}
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
              colors={['#7C3AED']}
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
                <ActivityIndicator size="large" color="#7C3AED" />
              ) : error === 'tabela_nao_existe' ? (
                <>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="warning-outline" size={60} color="#EF4444" />
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
                    <FontAwesome5 name="clipboard-list" size={44} color="#CBD5E1" />
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
        onRequestClose={() => setModalNovaComandaVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: translateYNovaComanda }] }
            ]}
          >
            <View {...panResponderNovaComanda.panHandlers}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova Comanda</Text>
                <TouchableOpacity onPress={() => {
                  Animated.timing(translateYNovaComanda, {
                    toValue: 500,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setModalNovaComandaVisible(false);
                    limparFormularioComanda();
                  });
                }}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{paddingTop: 16, paddingBottom: 24}}
              nestedScrollEnabled={true}
              disableScrollViewPanResponder={true}
              keyboardShouldPersistTaps="handled"
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
                      <Ionicons name="person" size={16} color="#7C3AED" />
                    </View>
                  ) : (
                    <Ionicons name="person" size={20} color="#6B7280" style={{marginRight: 8}} />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="Buscar cliente por nome..."
                    value={clienteQuery}
                    onChangeText={(text) => {
                      buscarClientes(text);
                      if (text.length > 0) {
                        setMostrarListaClientes(true);
                      }
                    }}
                    autoCapitalize="words"
                    onFocus={() => {
                      if (clienteQuery.trim().length === 0) {
                        // Se o campo estiver vazio, mostrar os clientes iniciais
                        setClientesEncontrados(clientes);
                      }
                      setMostrarListaClientes(true);
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
                        setMostrarListaClientes(!!clientes.length);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                
                {(mostrarListaClientes && (!selectedCliente || clienteQuery !== selectedCliente.nome)) && (
                  <View style={styles.clientesDropdown}>
                    {buscandoClientes ? (
                      <View style={styles.centeredContainer}>
                        <ActivityIndicator size="small" color="#7C3AED" />
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
                                <Ionicons name="person" size={20} color="#7C3AED" />
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
                              <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{marginRight: 4}} />
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
                  <View style={styles.tipoItemButtons}>
                    <TouchableOpacity 
                      style={[
                        styles.tipoItemButton,
                        tipoItem === 'produto' && styles.tipoItemButtonActive
                      ]}
                      onPress={() => {
                        setTipoItem('produto');
                        abrirModalItens('produto');
                      }}
                    >
                      <Ionicons 
                        name="cube-outline" 
                        size={24} 
                        color={tipoItem === 'produto' ? '#fff' : '#7C3AED'} 
                      />
                      <Text style={[
                        styles.tipoItemButtonText,
                        tipoItem === 'produto' && styles.tipoItemButtonTextActive
                      ]}>Produto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.tipoItemButton,
                        tipoItem === 'servico' && styles.tipoItemButtonActive
                      ]}
                      onPress={() => {
                        setTipoItem('servico');
                        abrirModalItens('servico');
                      }}
                    >
                      <Ionicons 
                        name="construct-outline" 
                        size={24} 
                        color={tipoItem === 'servico' ? '#fff' : '#7C3AED'} 
                      />
                      <Text style={[
                        styles.tipoItemButtonText,
                        tipoItem === 'servico' && styles.tipoItemButtonTextActive
                      ]}>Serviço</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.tipoItemButton,
                        tipoItem === 'pacote' && styles.tipoItemButtonActive
                      ]}
                      onPress={() => {
                        setTipoItem('pacote');
                        abrirModalItens('pacote');
                      }}
                    >
                      <Ionicons 
                        name="gift-outline" 
                        size={24} 
                        color={tipoItem === 'pacote' ? '#fff' : '#7C3AED'} 
                      />
                      <Text style={[
                        styles.tipoItemButtonText,
                        tipoItem === 'pacote' && styles.tipoItemButtonTextActive
                      ]}>Pacote</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[ 
                        styles.tipoItemButton,
                        tipoItem === 'pagamento' && styles.tipoItemButtonActive
                      ]}
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
                    >
                      <Ionicons 
                        name="card-outline" 
                        size={24} 
                        color={tipoItem === 'pagamento' ? '#fff' : '#7C3AED'} 
                      />
                      <Text style={[ 
                        styles.tipoItemButtonText,
                        tipoItem === 'pagamento' && styles.tipoItemButtonTextActive
                      ]}>Pagamento</Text>
                    </TouchableOpacity>
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
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
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
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  // Animar saída do modal
                  Animated.timing(translateYNovaComanda, {
                    toValue: 500,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setModalNovaComandaVisible(false);
                    limparFormularioComanda();
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  !selectedCliente && styles.saveButtonDisabled
                ]}
                onPress={criarNovaComanda}
                disabled={!selectedCliente}
              >
                <Text style={styles.saveButtonText}>Criar Comanda</Text>
              </TouchableOpacity>
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
            <Text style={{ textAlign: 'center', marginBottom: 12, color: '#374151' }}>
              {selectedCliente ? `O cliente ${selectedCliente.nome} possui:` : 'Este cliente possui:'}
            </Text>
            <Text style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: (saldoCrediario || 0) >= 0 ? '#10B981' : '#EF4444',
              textAlign: 'center',
              marginBottom: 16
            }}>
              {(saldoCrediario || 0) >= 0 ? '+ ' : '- '} {Math.abs(saldoCrediario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: '#6B7280' }}>
              Deseja aplicar este saldo na comanda atual?
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                onPress={ignorarSaldoCrediario}
              >
                <Text style={styles.cancelButtonText}>Não usar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { flex: 1, marginLeft: 8 }]}
                onPress={aplicarSaldoCrediario}
              >
                <Text style={styles.modalConfirmButtonText}>Usar Saldo</Text>
              </TouchableOpacity>
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
                <TouchableOpacity onPress={fecharModal}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
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
                        <Ionicons name="person" size={24} color="#7C3AED" />
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
                      comandaEmEdicao.status === 'aberta' && {backgroundColor: '#DCFCE7'},
                      comandaEmEdicao.status === 'fechada' && {backgroundColor: '#E0E7FF'},
                      comandaEmEdicao.status === 'cancelada' && {backgroundColor: '#FEE2E2'}
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
                        <Ionicons name="create-outline" size={18} color="#7C3AED" />
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
                        <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
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
                                  <Ionicons name="remove" size={16} color="#7C3AED" />
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
                                  <Ionicons name="add" size={16} color="#7C3AED" />
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
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
                      <View style={styles.tipoItemButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.adicionarItemButton}
                          onPress={() => {
                            setTipoItem('produto');
                            abrirModalItens('produto');
                          }}
                        >
                          <Ionicons name="cube-outline" size={20} color="#7C3AED" />
                          <Text style={styles.adicionarItemButtonText}>Produto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.adicionarItemButton}
                          onPress={() => {
                            setTipoItem('servico');
                            abrirModalItens('servico');
                          }}
                        >
                          <Ionicons name="cut-outline" size={20} color="#7C3AED" />
                          <Text style={styles.adicionarItemButtonText}>Serviço</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.adicionarItemButton}
                          onPress={() => {
                            setTipoItem('pacote');
                            abrirModalItens('pacote');
                          }}
                        >
                          <Ionicons name="gift-outline" size={20} color="#7C3AED" />
                          <Text style={styles.adicionarItemButtonText}>Pacote</Text>
                        </TouchableOpacity>
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
                                  borderBottomColor: '#E5E7EB'
                                }}>
                                  <Text style={[styles.comandaPagamentoValue, { fontWeight: '600' }]}>
                                    {nomeForma}
                                  </Text>
                                  <Text style={[styles.comandaValorPago, { color: '#10B981', fontWeight: '700' }]}>
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
                            color={comandaEmEdicao.saldo_aplicado > 0 ? "#10B981" : "#EF4444"} 
                          />
                          <Text style={styles.crediarioInfoLabel}>
                            {comandaEmEdicao.saldo_aplicado > 0 ? 'Crédito usado:' : 'Débito quitado:'}
                          </Text>
                          <Text style={[
                            styles.crediarioInfoValue,
                            { color: comandaEmEdicao.saldo_aplicado > 0 ? '#10B981' : '#EF4444' }
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
                          <FontAwesome5 name="plus-circle" size={16} color="#10B981" />
                          <Text style={styles.crediarioInfoLabel}>Troco → Crédito:</Text>
                          <Text style={[styles.crediarioInfoValue, { color: '#10B981' }]}>
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
                          <FontAwesome5 name="minus-circle" size={16} color="#EF4444" />
                          <Text style={styles.crediarioInfoLabel}>Falta → Débito:</Text>
                          <Text style={[styles.crediarioInfoValue, { color: '#EF4444' }]}>
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
                          <FontAwesome5 name="file-invoice-dollar" size={16} color="#F59E0B" />
                          <Text style={styles.crediarioInfoLabel}>Compra a crediário</Text>
                          <Text style={[styles.crediarioInfoValue, { color: '#F59E0B' }]}>
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
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
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
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
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
                  <Ionicons name="trash" size={20} color="#fff" />
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
        onShow={() => {
          // Iniciar a animação quando o modal é mostrado
          Animated.spring(translateYItens, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }).start();
        }}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: translateYItens }] }
            ]}
          >
            <View {...panResponderItens.panHandlers}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Selecionar {tipoItem === 'produto' ? 'Produtos' : 
                              tipoItem === 'servico' ? 'Serviços' : 'Pacotes'}
                </Text>
                <TouchableOpacity onPress={fecharModalItens}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={20} color="#6B7280" style={{marginRight: 8}} />
              <TextInput
                style={styles.modalSearchInput}
                value={termoBusca}
                onChangeText={setTermoBusca}
                placeholder={`Buscar ${tipoItem === 'produto' ? 'produtos' : 
                              tipoItem === 'servico' ? 'serviços' : 'pacotes'}...`}
                placeholderTextColor="#9CA3AF"
              />
              {termoBusca ? (
                <TouchableOpacity onPress={() => setTermoBusca('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
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
                  <ActivityIndicator size="large" color="#7C3AED" />
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
                            <Text style={styles.modalItemPreco}>
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
                              <Text style={styles.modalItemEstoque}>
                                Disponível: {item.quantidade}
                              </Text>
                            )}
                          </View>
                        </View>
                        {itemSelecionado && (
                          <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                        )}
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
                          <Ionicons name="remove" size={20} color="#7C3AED" />
                        </TouchableOpacity>
                        <Text style={styles.modalQuantidadeText}>{item.quantidade}</Text>
                        <TouchableOpacity
                          onPress={() => alterarQuantidadeItem(item.id, item.quantidade + 1)}
                          style={styles.modalQuantidadeButton}
                        >
                          <Ionicons name="add" size={20} color="#7C3AED" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => removerItemSelecionado(item.id)}
                        style={styles.modalRemoverButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={fecharModalItens}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  itensSelecionados.filter(item => item.tipo === tipoItem).length === 0 && styles.modalConfirmButtonDisabled
                ]}
                onPress={adicionarItensSelecionados}
                disabled={itensSelecionados.filter(item => item.tipo === tipoItem).length === 0}
              >
                <Text style={styles.modalConfirmButtonText}>
                  Adicionar ({itensSelecionados.filter(item => item.tipo === tipoItem).length})
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
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
              <TouchableOpacity onPress={() => setModalPagamentoVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {/* Indicador de Saldo Aplicado */}
              {usarSaldoCrediario && valorAplicadoSaldo !== 0 && (
                <View style={{
                  backgroundColor: saldoCrediario && saldoCrediario > 0 ? '#E8FFF3' : '#FFF1F2',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: saldoCrediario && saldoCrediario > 0 ? '#10B981' : '#EF4444',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                        {saldoCrediario && saldoCrediario > 0 ? '✓ Crédito aplicado' : '⚠ Débito adicionado'}
                      </Text>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold',
                        color: saldoCrediario && saldoCrediario > 0 ? '#10B981' : '#EF4444'
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
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
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
                      <Text style={{ color: '#374151', fontWeight: '500', fontSize: 13 }}>
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
                      color={formasPagamentoSelecionadas.includes('dinheiro') ? '#FFFFFF' : '#6B7280'} 
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
                      color={formasPagamentoSelecionadas.includes('cartao_credito') ? '#FFFFFF' : '#6B7280'} 
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
                      color={formasPagamentoSelecionadas.includes('cartao_debito') ? '#FFFFFF' : '#6B7280'} 
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
                      color={formasPagamentoSelecionadas.includes('pix') ? '#FFFFFF' : '#6B7280'} 
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
                      color={formasPagamentoSelecionadas.includes('crediario') ? '#FFFFFF' : '#6B7280'} 
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
                    const totalComanda = comandaEmEdicao?.valor_total || 0;
                    const diferenca = totalPagamentos - totalComanda;
                    
                    return (
                      <>
                        <View style={[styles.pagamentoInfoContainer, { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }]}>
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
                  backgroundColor: '#FFF1F2',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: '#EF4444',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="card-outline" size={20} color="#EF4444" />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#EF4444', marginLeft: 8 }}>
                      Pagamento no Crediário
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
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
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalPagamentoVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalConfirmButton,
                  (() => {
                    // Se nenhuma forma de pagamento selecionada
                    if (formasPagamentoSelecionadas.length === 0) {
                      return styles.modalConfirmButtonDisabled;
                    }
                    
                    // Se crediário está selecionado, sempre habilita (não precisa preencher valor)
                    if (formasPagamentoSelecionadas.includes('crediario')) {
                      return null;
                    }
                    
                    // Para outras formas, verifica se há valores preenchidos
                    const totalPagamentos = pagamentosMultiplos.reduce((sum, p) => sum + (p.valor || 0), 0);
                    
                    // Se não há valor total preenchido, desabilita
                    if (totalPagamentos === 0) {
                      return styles.modalConfirmButtonDisabled;
                    }
                    
                    return null;
                  })()
                ]}
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
                <Text style={styles.modalConfirmButtonText}>Finalizar Pagamento</Text>
              </TouchableOpacity>
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
              <Ionicons name="camera" size={24} color="#7C3AED" />
              <Text style={styles.optionButtonText}>Tirar Foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleComprovantePix('gallery')}
            >
              <Ionicons name="images" size={24} color="#7C3AED" />
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
            <Text style={{ textAlign: 'center', marginBottom: 12, color: '#374151' }}>
              {tipoTrocoFalta === 'troco' 
                ? 'O cliente possui troco desta compra.' 
                : 'O cliente ficou devendo desta compra.'}
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: tipoTrocoFalta === 'troco' ? '#10B981' : '#EF4444',
              textAlign: 'center',
              marginBottom: 16
            }}>
              {valorTrocoFalta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: '#6B7280', fontSize: 14 }}>
              {tipoTrocoFalta === 'troco'
                ? 'Deseja adicionar este valor como crédito no crediário do cliente?'
                : 'Deseja adicionar este valor como débito no crediário do cliente?'}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                onPress={ignorarTrocoFalta}
              >
                <Text style={styles.cancelButtonText}>Não adicionar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { flex: 1, marginLeft: 8 }]}
                onPress={adicionarTrocoFaltaCrediario}
              >
                <Text style={styles.modalConfirmButtonText}>Adicionar</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#7C3AED',
    padding: 16,
    paddingTop: 45,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: -10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
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
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  comandasList: {
    paddingHorizontal: 16,
  },
  comandaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comandaFechada: {
    backgroundColor: '#F3F4F6',
  },
  comandaCancelada: {
    backgroundColor: '#FEE2E2',
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
    backgroundColor: '#EDE9FE',
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
    color: '#111827',
  },
  comandaCardData: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  comandaCardDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  comandaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  comandaItens: {
    fontSize: 14,
    color: '#6B7280',
  },
  comandaAcoes: {
    flexDirection: 'row',
  },
  comandaValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  comandaDetailHeader: {
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  comandaDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6D28D9',
    marginBottom: 8,
  },
  comandaDetailInfo: {
    flex: 1,
  },
  comandaDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  comandaDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  comandaDetailCliente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  comandaItemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  comandaItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comandaItemNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  comandaItemPreco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  comandaItemQtd: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  comandaItemTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  comandaItemTotalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  comandaItemTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  itemTypeTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
    marginLeft: 4,
  },
  itemTypeTabTextActive: {
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  comandaDetailData: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  comandaDetailFinalizadoPor: {
    fontSize: 14,
    color: '#7C3AED',
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
    color: '#1F2937',
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
    color: '#111827',
  },
  editarItensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 6,
  },
  editarItensText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
    marginLeft: 4,
  },
  salvarItensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
  },
  salvarItensText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
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
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantidadeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  adicionarItensTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  tipoItemButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  adicionarItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  adicionarItemButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C3AED',
    marginLeft: 6,
  },
  comandaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelarComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
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
  cancelarComandaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  manterAbertaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    height: 48,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#000',
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
    color: '#7C3AED',
    marginLeft: 8,
  },
  fecharComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    height: 48,
    borderRadius: 8,
    marginLeft: 8,
    shadowColor: '#000',
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
    color: '#FFFFFF',
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
    color: '#6B7280',
    marginTop: 16,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#B91C1C',
    marginTop: 16,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: '#7C3AED',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    height: '90%',
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    maxHeight: '70%',
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  clienteInput: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  clientesDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
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
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: '#EDE9FE',
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clienteItemNome: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  clienteItemTelefone: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#666',
  },
  mensagemVazia: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  observacoesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  novoClienteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  novoClienteButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  novoClienteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  comandaItemDetails: {
    flex: 1,
  },
  comandaItemName: {
    fontSize: 14,
    color: '#111827',
  },
  comandaItemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  itemsEmpty: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsEmptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  comandaObservacoes: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  comandaObservacoesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  comandaObservacoesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  comandaObservacoesSemTexto: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  comandaTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  comandaTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comandaTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  comandaTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  comandaAcao: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#7C3AED',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
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
    backgroundColor: '#DCFCE7',
  },
  badgeCancelada: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Estilos para seção de itens
  tipoItemContainer: {
    marginBottom: 16,
  },
  tipoItemButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  tipoItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
  },
  tipoItemButtonActive: {
    backgroundColor: '#7C3AED',
  },
  tipoItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  tipoItemButtonTextActive: {
    color: '#FFFFFF',
  },
  itensList: {
    marginTop: 16,
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
  },
  itemPrecoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQuantidade: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
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
    color: '#6B7280',
  },
  itemsTotalValue: { // Renomeado de itemSubtotalValue
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  itensVazios: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  itensVaziosText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Estilos para o modal de seleção de itens
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  modalList: {
    paddingHorizontal: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemSelecionado: {
    backgroundColor: '#F3E8FF',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemNome: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  modalItemNomeSelecionado: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  modalItemDetalhes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modalItemPreco: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  modalItemEstoque: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSelecionados: {
    marginTop: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalSelecionadosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalSelecionadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalSelecionadoInfo: {
    flex: 1,
  },
  modalSelecionadoNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  modalSelecionadoPreco: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalSelecionadoQuantidade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  modalQuantidadeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuantidadeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 8,
  },
  modalRemoverButton: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  excluirComandaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  pagamentoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  pagamentoSubLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  pagamentoValor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pagamentoOpcaoSelecionada: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pagamentoOpcaoTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pagamentoOpcaoTextoSelecionado: {
    color: '#FFFFFF',
  },
  pagamentoValorPago: {
    marginTop: 16,
  },
  pagamentoInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  pagamentoFaltaContainer: {
    backgroundColor: '#FEE2E2',
  },
  pagamentoInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  pagamentoInfoValor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  pagamentoParcelaButtonSelecionada: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pagamentoParcelaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pagamentoParcelaTextSelecionada: {
    color: '#FFFFFF',
  },
  pagamentoValorParcela: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  comprovanteButtonTextSmall: {
    color: '#7C3AED',
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
    color: '#333',
  },
  comprovantePreviewContainer: {
    width: '100%',
    marginBottom: 10,
  },
  comprovantePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  comprovanteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  comprovanteButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  comprovantePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  comprovantePlaceholderText: {
    color: '#666',
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
    backgroundColor: 'white',
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
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  optionButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionButtonCancel: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  optionButtonTextCancel: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
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
    color: '#333',
  },
  itemSubtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#333',
  },
  comandaPagamentoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  comandaValorPago: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 6,
    fontWeight: '600',
  },
  comandaParcelas: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  crediarioInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  crediarioInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crediarioInfoLabel: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    marginLeft: 4,
  },
  crediarioInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  crediarioInfoDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 24,
  },
  comandaDetailCriadoPor: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalItemIndisponivel: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  modalItemTextIndisponivel: {
    color: '#999',
  },
  modalItemEstoqueZero: {
    color: '#ff0000',
  },
  novoPagamentoContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  novoPagamentoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  novoPagamentoInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
  },
  adicionarPagamentoButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  adicionarPagamentoButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  adicionarPagamentoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adicionarPagamentoButtonTextDisabled: {
    color: '#D1D5DB',
  },
}); 