import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, PanResponder, Animated } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { criarOrcamento, adicionarItemOrcamento, buscarClientes, buscarProdutos, buscarServicos, buscarPacotes, Cliente, Produto, Servico, Pacote } from './utils';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../../contexts/ThemeContext';
import { logger } from '../../../utils/logger';
import { formatarDataInput, formatarMoedaInput, formatarTelefoneInput } from '@utils/validators';
import { theme } from '@utils/theme';

interface ItemOrcamento {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  tipo: 'produto' | 'servico' | 'pacote';
  produto_id?: string;
  servico_id?: string;
  pacote_id?: string;
}

interface ItemSelecionado {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  tipo: 'produto' | 'servico' | 'pacote';
  quantidade_disponivel?: number;
  duracao?: number;
  validade_dias?: number;
}

export default function NovoOrcamentoScreen() {
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  // Estados para itens do orçamento
  const [itemAtual, setItemAtual] = useState('');
  const [quantidadeAtual, setQuantidadeAtual] = useState('1');
  const [valorItemAtual, setValorItemAtual] = useState('');
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  // Estados para pagamento
  const [formaPagamento, setFormaPagamento] = useState('selecione');
  const [parcelas, setParcelas] = useState('a_vista');
  const [subtotal, setSubtotal] = useState(0);
  const [desconto, setDesconto] = useState('');
  const [valorFinal, setValorFinal] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Estados para busca de produtos
  const [produtosEncontrados, setProdutosEncontrados] = useState<Produto[]>([]);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const [mostrarListaProdutos, setMostrarListaProdutos] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Estados para busca de serviços
  const [servicosEncontrados, setServicosEncontrados] = useState<Servico[]>([]);
  const [buscandoServicos, setBuscandoServicos] = useState(false);
  const [mostrarListaServicos, setMostrarListaServicos] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);

  // Estados para busca de pacotes
  const [pacotesEncontrados, setPacotesEncontrados] = useState<Pacote[]>([]);
  const [buscandoPacotes, setBuscandoPacotes] = useState(false);
  const [mostrarListaPacotes, setMostrarListaPacotes] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState<Pacote | null>(null);

  // Estados para tipo de item
  const [tipoItem, setTipoItem] = useState<'produto' | 'servico' | 'pacote'>('produto');

  // Estados para modal de seleção de itens
  const [modalVisible, setModalVisible] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [buscandoItens, setBuscandoItens] = useState(false);
  const [itensEncontrados, setItensEncontrados] = useState<(Produto | Servico | Pacote)[]>([]);

  const pan = new Animated.ValueXY();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        pan.setValue({ x: 0, y: gestureState.dy });
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        Animated.timing(pan, {
          toValue: { x: 0, y: 500 },
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setModalVisible(false);
          pan.setValue({ x: 0, y: 0 });
        });
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // Função para carregar itens iniciais
  const carregarItensIniciais = useCallback(async () => {
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
  }, [tipoItem]);

  // Carrega itens quando o modal é aberto
  useEffect(() => {
    if (modalVisible) {
      carregarItensIniciais();
    }
  }, [modalVisible, carregarItensIniciais]);

  // Atualiza subtotal quando itens mudam
  useEffect(() => {
    const novoSubtotal = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
    setSubtotal(novoSubtotal);
    
    // Atualiza valor final considerando desconto
    const descontoNumerico = parseFloat(desconto.replace(',', '.')) || 0;
    setValorFinal(novoSubtotal - (novoSubtotal * (descontoNumerico / 100)));
  }, [itens, desconto]);

  const buscarClientesPorNome = useCallback(async (nome: string) => {
    if (nome.length < 3) {
      setClientesEncontrados([]);
      setMostrarLista(false);
      return;
    }

    setBuscandoClientes(true);
    try {
      const clientes = await buscarClientes(nome);
      setClientesEncontrados(clientes || []);
      setMostrarLista(true);
    } catch (error) {
      logger.error('Erro ao buscar clientes:', error);
      setClientesEncontrados([]);
      setMostrarLista(false);
    } finally {
      setBuscandoClientes(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarClientesPorNome(cliente);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [cliente, buscarClientesPorNome]);

  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setCliente(cliente.nome);
    setTelefone(cliente.telefone || '');
    setClientesEncontrados([]);
    setMostrarLista(false);
  };

  const handleLimparCliente = () => {
    setClienteSelecionado(null);
    setCliente('');
    setTelefone('');
    setClientesEncontrados([]);
    setMostrarLista(false);
  };

  const handleCadastrarCliente = () => {
    router.push({
      pathname: '/clientes/novo',
      params: {
        returnTo: '/orcamentos-tab/novo'
      }
    });
  };

  const buscarProdutosPorNome = useCallback(async (nome: string) => {
    if (nome.length < 3) {
      setProdutosEncontrados([]);
      setMostrarListaProdutos(false);
      return;
    }

    setBuscandoProdutos(true);
    try {
      const produtos = await buscarProdutos(nome);
      logger.debug('Produtos encontrados:', produtos);
      setProdutosEncontrados(produtos);
      setMostrarListaProdutos(true);
    } catch (error) {
      logger.error('Erro ao buscar produtos:', error);
      setProdutosEncontrados([]);
      setMostrarListaProdutos(false);
    } finally {
      setBuscandoProdutos(false);
    }
  }, []);

  const buscarServicosPorNome = useCallback(async (nome: string) => {
    if (nome.length < 3) {
      setServicosEncontrados([]);
      setMostrarListaServicos(false);
      return;
    }

    setBuscandoServicos(true);
    try {
      const servicos = await buscarServicos(nome);
      logger.debug('Serviços encontrados:', servicos);
      setServicosEncontrados(servicos);
      setMostrarListaServicos(true);
    } catch (error) {
      logger.error('Erro ao buscar serviços:', error);
      setServicosEncontrados([]);
      setMostrarListaServicos(false);
    } finally {
      setBuscandoServicos(false);
    }
  }, []);

  const buscarPacotesPorNome = useCallback(async (nome: string) => {
    if (nome.length < 3) {
      setPacotesEncontrados([]);
      setMostrarListaPacotes(false);
      return;
    }

    setBuscandoPacotes(true);
    try {
      const pacotes = await buscarPacotes(nome);
      logger.debug('Pacotes encontrados:', pacotes);
      setPacotesEncontrados(pacotes);
      setMostrarListaPacotes(true);
    } catch (error) {
      logger.error('Erro ao buscar pacotes:', error);
      setPacotesEncontrados([]);
      setMostrarListaPacotes(false);
    } finally {
      setBuscandoPacotes(false);
    }
  }, []);

  useEffect(() => {
    if (tipoItem === 'produto') {
      const timeoutId = setTimeout(() => {
        buscarProdutosPorNome(itemAtual);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (tipoItem === 'servico') {
      const timeoutId = setTimeout(() => {
        buscarServicosPorNome(itemAtual);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (tipoItem === 'pacote') {
      const timeoutId = setTimeout(() => {
        buscarPacotesPorNome(itemAtual);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [itemAtual, tipoItem, buscarProdutosPorNome, buscarServicosPorNome, buscarPacotesPorNome]);

  const handleSelecionarProduto = (produto: Produto) => {
    logger.debug('Produto selecionado:', produto);
    if (!produto.id) {
      logger.error('Produto sem ID:', produto);
      Alert.alert('Erro', 'Produto inválido');
      return;
    }
    setProdutoSelecionado(produto);
    setItemAtual(produto.nome);
    setValorItemAtual(produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setProdutosEncontrados([]);
    setMostrarListaProdutos(false);
  };

  const handleSelecionarServico = (servico: Servico) => {
    logger.debug('Serviço selecionado:', servico);
    if (!servico.id) {
      logger.error('Serviço sem ID:', servico);
      Alert.alert('Erro', 'Serviço inválido');
      return;
    }
    setServicoSelecionado(servico);
    setItemAtual(servico.nome);
    setValorItemAtual(servico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setServicosEncontrados([]);
    setMostrarListaServicos(false);
  };

  const handleSelecionarPacote = (pacote: Pacote) => {
    logger.debug('Pacote selecionado:', pacote);
    if (!pacote.id) {
      logger.error('Pacote sem ID:', pacote);
      Alert.alert('Erro', 'Pacote inválido');
      return;
    }
    setPacoteSelecionado(pacote);
    setItemAtual(pacote.nome);
    setValorItemAtual((pacote.valor - (pacote.desconto || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setPacotesEncontrados([]);
    setMostrarListaPacotes(false);
  };

  const handleAdicionarItem = () => {
    if (!itemAtual.trim()) {
      Alert.alert('Erro', 'Digite a descrição do item');
      return;
    }

    const quantidade = parseInt(quantidadeAtual);
    if (isNaN(quantidade) || quantidade <= 0) {
      Alert.alert('Erro', 'Quantidade inválida');
      return;
    }

    let valor = 0;
    let produto_id, servico_id, pacote_id;

    switch (tipoItem) {
      case 'produto':
        if (!produtoSelecionado?.id) {
          Alert.alert('Erro', 'Selecione um produto válido');
          return;
        }
        produto_id = produtoSelecionado.id;
        valor = produtoSelecionado.preco;
        break;
      case 'servico':
        if (!servicoSelecionado?.id) {
          Alert.alert('Erro', 'Selecione um serviço válido');
          return;
        }
        servico_id = servicoSelecionado.id;
        valor = servicoSelecionado.preco;
        break;
      case 'pacote':
        if (!pacoteSelecionado?.id) {
          Alert.alert('Erro', 'Selecione um pacote válido');
          return;
        }
        pacote_id = pacoteSelecionado.id;
        valor = (pacoteSelecionado.valor - (pacoteSelecionado.desconto || 0)); // Valor final do pacote (valor - desconto)
        break;
    }

    const novoItem: ItemOrcamento = {
      id: Math.random().toString(),
      descricao: itemAtual,
      quantidade,
      valor_unitario: valor,
      tipo: tipoItem,
      produto_id,
      servico_id,
      pacote_id
    };

    logger.debug('Novo item a ser adicionado:', novoItem);
    setItens(prev => [...prev, novoItem]);

    setItemAtual('');
    setQuantidadeAtual('1');
    setValorItemAtual('');
    setProdutoSelecionado(null);
    setServicoSelecionado(null);
    setPacoteSelecionado(null);
  };

  const handleRemoverItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  // Função para buscar itens baseado no tipo selecionado
  const buscarItens = useCallback(async (termo: string) => {
    if (termo.length < 3) {
      carregarItensIniciais();
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
  }, [tipoItem, carregarItensIniciais]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarItens(termoBusca);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [termoBusca, buscarItens]);

  const handleSelecionarItem = (item: Produto | Servico | Pacote) => {
    logger.debug('Item selecionado:', item);
    if (!item.id) {
      logger.error('Item sem ID:', item);
      Alert.alert('Erro', 'Item inválido');
      return;
    }

    // Usa o tipoItem do modal para determinar o tipo correto
    const tipo = tipoItem;
    logger.debug('Tipo do item:', tipo);

    // Verifica se o item já foi selecionado
    const itemJaSelecionado = itensSelecionados.find(i => i.id === item.id);
    
    if (!itemJaSelecionado) {
      // Se não foi selecionado, adiciona à lista com o tipo correto
      const itemSelecionado: ItemSelecionado = {
        id: item.id,
        nome: item.nome,
        preco: 'valor' in item && 'desconto' in item 
          ? Number(item.valor) - Number(item.desconto || 0) // Para pacotes: valor final
          : 'preco' in item ? Number(item.preco) : 0, // Para produtos/serviços: preço normal
        quantidade: 1,
        tipo: tipo // Usa o tipo do modal
      };

      logger.debug('ItemSelecionado criado:', itemSelecionado);
      setItensSelecionados(prev => [...prev, itemSelecionado]);
    } else {
      // Se já foi selecionado, remove da lista
      setItensSelecionados(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const handleRemoverItemSelecionado = (id: string) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== id));
  };

  const handleAlterarQuantidade = (id: string, novaQuantidade: number) => {
    setItensSelecionados(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  const handleAdicionarItensSelecionados = () => {
    logger.debug('Itens selecionados antes de adicionar:', itensSelecionados);
    const novosItens: ItemOrcamento[] = itensSelecionados.map(item => {
      logger.debug('Processando item:', item);
      
      const itemBase: ItemOrcamento = {
        id: Math.random().toString(),
        descricao: item.nome,
        quantidade: item.quantidade,
        valor_unitario: item.preco,
        tipo: item.tipo,
        produto_id: item.tipo === 'produto' ? item.id : undefined,
        servico_id: item.tipo === 'servico' ? item.id : undefined,
        pacote_id: item.tipo === 'pacote' ? item.id : undefined
      };

      logger.debug('Item final:', itemBase);
      return itemBase;
    });

    logger.debug('Novos itens a serem adicionados:', novosItens);
    setItens(prev => {
      const itensAtualizados = [...prev, ...novosItens];
      logger.debug('Itens após atualização:', itensAtualizados);
      return itensAtualizados;
    });
    setItensSelecionados([]);
    setModalVisible(false);
    setTermoBusca('');
  };

  // Adicionar useEffect para monitorar mudanças no estado itens
  useEffect(() => {
    logger.debug('Estado itens atualizado:', itens);
  }, [itens]);

  // Adicionar useEffect para monitorar mudanças no estado itensSelecionados
  useEffect(() => {
    logger.debug('Estado itensSelecionados atualizado:', itensSelecionados);
  }, [itensSelecionados]);

  // Adicionar useEffect para monitorar mudanças no estado modalVisible
  useEffect(() => {
    logger.debug('Estado modalVisible atualizado:', modalVisible);
  }, [modalVisible]);

  // Funções de validação
  const validarValor = (valor: string) => {
    const valorNumerico = parseFloat(valor.replace(',', '.'));
    return !isNaN(valorNumerico) && valorNumerico > 0;
  };

  // Função para validar data
  const validarData = (data: string) => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(data)) return false;

    const [, dia, mes, ano] = data.match(regex) || [];
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    
    // Verifica se a data é válida e não é futura
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return dataObj instanceof Date && 
           !isNaN(dataObj.getTime()) && 
           dataObj <= hoje;
  };

  const handleSalvar = async () => {
    try {
      logger.debug('Itens antes de salvar:', itens);
      
      // Validação dos IDs dos produtos
      for (const item of itens) {
        if (item.tipo === 'produto' && item.produto_id) {
          const produto = await buscarProdutos(item.descricao);
          if (!produto.some(p => p.id === item.produto_id)) {
            Alert.alert('Erro', `Produto "${item.descricao}" não encontrado no banco de dados. Por favor, remova-o e adicione novamente.`);
            return;
          }
        }
      }

      if (!cliente.trim()) {
        Alert.alert('Erro', 'Informe o nome do cliente');
        return;
      }

      if (itens.length === 0) {
        Alert.alert('Erro', 'Adicione pelo menos um item ao orçamento');
        return;
      }

      if (formaPagamento === 'selecione') {
        Alert.alert('Erro', 'Selecione uma forma de pagamento');
        return;
      }

      setLoading(true);

      // Cria o orçamento com a data e hora atual
      const dataAtual = new Date();
      
      const novoOrcamento = await criarOrcamento({
        cliente: cliente,
        cliente_id: clienteSelecionado?.id || undefined,
        data: dataAtual,
        valor_total: valorFinal,
        forma_pagamento: formaPagamento,
        parcelas: parcelas === 'a_vista' ? 1 : parseInt(parcelas),
        desconto: parseFloat(desconto.replace(',', '.')) || 0,
        status: 'pendente',
        observacoes: observacoes || undefined
      });

      logger.debug('Orçamento criado:', novoOrcamento);

      // Adiciona os itens do orçamento
      for (const item of itens) {
        logger.debug('Processando item para salvar:', item);
        const itemBase = {
          orcamento_id: novoOrcamento.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          tipo: item.tipo
        };

        let itemParaSalvar;
        switch (item.tipo) {
          case 'produto':
            itemParaSalvar = { ...itemBase, produto_id: item.produto_id };
            logger.debug('Item produto para salvar:', itemParaSalvar);
            break;
          case 'servico':
            itemParaSalvar = { ...itemBase, servico_id: item.servico_id };
            logger.debug('Item serviço para salvar:', itemParaSalvar);
            break;
          case 'pacote':
            itemParaSalvar = { ...itemBase, pacote_id: item.pacote_id };
            logger.debug('Item pacote para salvar:', itemParaSalvar);
            break;
          default:
            itemParaSalvar = itemBase;
        }

        await adicionarItemOrcamento(itemParaSalvar);
      }

      Alert.alert('Sucesso', 'Orçamento criado com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(app)/orcamentos')
        }
      ]);
    } catch (error) {
      logger.error('Erro ao salvar orçamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Seção Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nome do Cliente</Text>
            <View style={styles.clienteContainer}>
              <TextInput
                style={[styles.input, clienteSelecionado && styles.inputDisabled]}
                value={cliente}
                onChangeText={(text) => {
                  if (!clienteSelecionado) {
                    setCliente(text);
                  }
                }}
                placeholder="Digite para buscar um cliente..."
                editable={!clienteSelecionado}
              />
              {buscandoClientes && (
                <Ionicons name="search" size={20} color={theme.colors.primary} style={styles.searchIcon} />
              )}
              {clienteSelecionado && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleLimparCliente}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            {mostrarLista && clientesEncontrados.length > 0 && (
              <View style={styles.clientesList}>
                {clientesEncontrados.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.clienteItem,
                      clienteSelecionado?.id === c.id && styles.clienteItemSelecionado
                    ]}
                    onPress={() => handleSelecionarCliente(c)}
                  >
                    <Text style={[
                      styles.clienteNome,
                      clienteSelecionado?.id === c.id && styles.clienteNomeSelecionado
                    ]}>{c.nome}</Text>
                    <Text style={styles.clienteTelefone}>{c.telefone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {cliente.length > 0 && (!clientesEncontrados || clientesEncontrados.length === 0) && !buscandoClientes && (
              <View style={styles.clienteNaoEncontrado}>
                <Text style={styles.clienteNaoEncontradoText}>
                  Cliente não encontrado
                </Text>
                <TouchableOpacity
                  style={styles.cadastrarClienteButton}
                  onPress={handleCadastrarCliente}
                >
                  <Text style={styles.cadastrarClienteText}>Cadastrar Novo Cliente</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={[styles.input, clienteSelecionado && styles.inputDisabled]}
              value={telefone}
              onChangeText={(text) => {
                if (!clienteSelecionado) {
                  setTelefone(formatarTelefoneInput(text));
                }
              }}
              placeholder="(00) 00000-0000"
              keyboardType="numeric"
              editable={!clienteSelecionado}
            />
          </View>
        </View>

        {/* Seção Itens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens do Orçamento</Text>
          
          <View style={styles.tipoItemContainer}>
            <Text style={styles.label}>Adicionar Item</Text>
            <View style={styles.tipoItemButtons}>
              <TouchableOpacity 
                style={[
                  styles.tipoItemButton,
                  tipoItem === 'produto' && styles.tipoItemButtonActive
                ]}
                onPress={() => {
                  logger.debug('Abrindo modal de produtos');
                  setTipoItem('produto');
                  setModalVisible(true);
                  setTermoBusca('');
                  setItensSelecionados([]);
                }}
              >
                <Ionicons 
                  name="cube-outline" 
                  size={24} 
                  color={tipoItem === 'produto' ? '#fff' : theme.colors.primary} 
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
                  logger.debug('Abrindo modal de serviços');
                  setTipoItem('servico');
                  setModalVisible(true);
                  setTermoBusca('');
                  setItensSelecionados([]);
                }}
              >
                <Ionicons 
                  name="construct-outline" 
                  size={24} 
                  color={tipoItem === 'servico' ? '#fff' : theme.colors.primary} 
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
                  logger.debug('Abrindo modal de pacotes');
                  setTipoItem('pacote');
                  setModalVisible(true);
                  setTermoBusca('');
                  setItensSelecionados([]);
                }}
              >
                <Ionicons 
                  name="gift-outline" 
                  size={24} 
                  color={tipoItem === 'pacote' ? '#fff' : theme.colors.primary} 
                />
                <Text style={[
                  styles.tipoItemButtonText,
                  tipoItem === 'pacote' && styles.tipoItemButtonTextActive
                ]}>Pacote</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {itens.length > 0 && (
            <View style={styles.itensList}>
              {itens.map((item, index) => (
                <View key={item.id} style={styles.itemContainer}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemDescricao}>{item.descricao}</Text>
                    <Text style={styles.itemQuantidade}>x{item.quantidade}</Text>
                    <Text style={styles.itemValor}>
                      {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoverItem(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Seção Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Pagamento</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Forma de Pagamento</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formaPagamento}
                onValueChange={(value) => setFormaPagamento(value)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione" value="selecione" />
                <Picker.Item label="Dinheiro" value="dinheiro" />
                <Picker.Item label="PIX" value="pix" />
                <Picker.Item label="Cartão de Crédito" value="credito" />
                <Picker.Item label="Cartão de Débito" value="debito" />
              </Picker>
            </View>
          </View>

          {formaPagamento === 'credito' && (
            <View style={styles.field}>
              <Text style={styles.label}>Parcelas</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={parcelas}
                  onValueChange={(value) => setParcelas(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="À Vista" value="a_vista" />
                  <Picker.Item label="2x" value="2" />
                  <Picker.Item label="3x" value="3" />
                  <Picker.Item label="4x" value="4" />
                  <Picker.Item label="5x" value="5" />
                  <Picker.Item label="6x" value="6" />
                  <Picker.Item label="7x" value="7" />
                  <Picker.Item label="8x" value="8" />
                  <Picker.Item label="9x" value="9" />
                  <Picker.Item label="10x" value="10" />
                  <Picker.Item label="11x" value="11" />
                  <Picker.Item label="12x" value="12" />
                </Picker>
              </View>
            </View>
          )}

          <View style={styles.valoresTotais}>
            <View style={styles.valorRow}>
              <Text style={styles.valorLabel}>Subtotal:</Text>
              <Text style={styles.valorText}>
                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.valorRow}>
              <Text style={styles.valorLabel}>Desconto (%):</Text>
              <TextInput
                style={styles.descontoInput}
                value={desconto}
                onChangeText={setDesconto}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.valorRow}>
              <Text style={styles.valorFinalLabel}>Valor Final:</Text>
              <Text style={styles.valorFinalText}>
                R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Seção Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Adicione observações importantes aqui..."
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.salvarButton,
            loading && styles.salvarButtonDisabled
          ]}
          onPress={handleSalvar}
          disabled={loading}
        >
          <Text style={styles.salvarButtonText}>
            {loading ? 'Salvando...' : 'Salvar Orçamento'}
          </Text>
        </TouchableOpacity>

        {/* Modal de Seleção de Itens */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [
                    { translateY: pan.y }
                  ]
                }
              ]}
            >
              <View 
                style={styles.modalHeader}
                {...panResponder.panHandlers}
              >
                <View style={styles.modalDragIndicator} />
                <Text style={styles.modalTitle}>
                  Selecionar {tipoItem.charAt(0).toUpperCase() + tipoItem.slice(1)}s
                </Text>
              </View>

              <View style={styles.modalSearch}>
                <TextInput
                  style={styles.modalSearchInput}
                  value={termoBusca}
                  onChangeText={setTermoBusca}
                  placeholder={`Buscar ${tipoItem}s...`}
                />
                {buscandoItens && (
                  <Ionicons name="search" size={20} color={theme.colors.primary} style={styles.modalSearchIcon} />
                )}
              </View>

              <ScrollView style={styles.modalList}>
                {itensEncontrados.map((item) => {
                  const itemSelecionado = itensSelecionados.find(i => i.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.modalItem,
                        itemSelecionado && styles.modalItemSelecionado
                      ]}
                      onPress={() => handleSelecionarItem(item)}
                    >
                      <View style={styles.modalItemInfo}>
                        <Text style={[
                          styles.modalItemNome,
                          itemSelecionado && styles.modalItemNomeSelecionado
                        ]}>
                          {'nome' in item ? item.nome : ''}
                        </Text>
                        <View style={styles.modalItemDetalhes}>
                          <Text style={styles.modalItemPreco}>
                            {(() => {
                              if ('valor' in item && 'desconto' in item) {
                                // Para pacotes, usar valor final (valor - desconto)
                                return (Number(item.valor) - Number(item.desconto || 0))
                                  .toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2 
                                  });
                              } else {
                                // Para produtos e serviços, usar preço normal
                                return Number(item.preco || 0)
                                  .toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2 
                                  });
                              }
                            })()}
                          </Text>
                          {'quantidade_disponivel' in item && (
                            <Text style={styles.modalItemEstoque}>
                              Disponível: {item.quantidade_disponivel}
                            </Text>
                          )}
                          {'duracao' in item && (
                            <Text style={styles.modalItemEstoque}>
                              Duração: {item.duracao}min
                            </Text>
                          )}
                        </View>
                      </View>
                      {itemSelecionado && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {itensSelecionados.length > 0 && (
                <View style={styles.modalSelecionados}>
                  <Text style={styles.modalSelecionadosTitle}>Itens Selecionados</Text>
                  {itensSelecionados.map((item) => (
                    <View key={item.id} style={styles.modalSelecionadoItem}>
                      <View style={styles.modalSelecionadoInfo}>
                        <Text style={styles.modalSelecionadoNome}>{item.nome}</Text>
                        <Text style={styles.modalSelecionadoPreco}>
                          R$ {(item.preco * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={styles.modalSelecionadoQuantidade}>
                        <TouchableOpacity
                          onPress={() => handleAlterarQuantidade(item.id, Math.max(1, item.quantidade - 1))}
                          style={styles.modalQuantidadeButton}
                        >
                          <Ionicons name="remove" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.modalQuantidadeText}>{item.quantidade}</Text>
                        <TouchableOpacity
                          onPress={() => handleAlterarQuantidade(item.id, item.quantidade + 1)}
                          style={styles.modalQuantidadeButton}
                        >
                          <Ionicons name="add" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoverItemSelecionado(item.id)}
                        style={styles.modalRemoverButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setItensSelecionados([]);
                    setModalVisible(false);
                    setTermoBusca('');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    itensSelecionados.length === 0 && styles.modalConfirmButtonDisabled
                  ]}
                  onPress={handleAdicionarItensSelecionados}
                  disabled={itensSelecionados.length === 0}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    Adicionar ({itensSelecionados.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clienteContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  clientesList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
  },
  clienteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clienteNome: {
    fontSize: 16,
    color: '#333',
  },
  clienteTelefone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clienteNaoEncontrado: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  clienteNaoEncontradoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cadastrarClienteButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  cadastrarClienteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: '#666',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  clienteItemSelecionado: {
    backgroundColor: '#f3e8fd',
  },
  clienteNomeSelecionado: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  itemInputDescricao: {
    flex: 2,
  },
  itemInputQuantidade: {
    flex: 0.5,
  },
  itemInputValor: {
    flex: 1,
  },
  adicionarItemButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  adicionarItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itensList: {
    gap: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescricao: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  itemQuantidade: {
    fontSize: 14,
    color: '#666',
  },
  itemValor: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  valoresTotais: {
    marginTop: 16,
    gap: 12,
  },
  valorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valorLabel: {
    fontSize: 16,
    color: '#666',
  },
  valorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  descontoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'right',
  },
  valorFinalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  valorFinalText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  produtoContainer: {
    position: 'relative',
  },
  produtosList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
  },
  produtoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  produtoNome: {
    fontSize: 16,
    color: '#333',
  },
  produtoDetalhes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  produtoPreco: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  produtoEstoque: {
    fontSize: 14,
    color: '#666',
  },
  produtoNaoEncontrado: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  produtoNaoEncontradoText: {
    fontSize: 14,
    color: '#666',
  },
  salvarButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  salvarButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  salvarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipoItemContainer: {
    marginBottom: 16,
  },
  tipoItemButtons: {
    flexDirection: 'row',
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
    borderColor: theme.colors.primary,
    backgroundColor: colors.surface,
  },
  tipoItemButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  tipoItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  tipoItemButtonTextActive: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
    alignSelf: 'center',
  },
  modalSearch: {
    position: 'relative',
    marginBottom: 16,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
  },
  modalSearchIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  modalList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemNome: {
    fontSize: 16,
    color: '#333',
  },
  modalItemDetalhes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modalItemPreco: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalItemEstoque: {
    fontSize: 14,
    color: '#666',
  },
  modalSelecionados: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  modalSelecionadosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSelecionadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  modalSelecionadoInfo: {
    flex: 1,
  },
  modalSelecionadoNome: {
    fontSize: 14,
    color: '#333',
  },
  modalSelecionadoPreco: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalSelecionadoQuantidade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalQuantidadeButton: {
    padding: 4,
  },
  modalQuantidadeText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 8,
  },
  modalRemoverButton: {
    padding: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalItemSelecionado: {
    backgroundColor: '#f3e8fd',
  },
  modalItemNomeSelecionado: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
}); 