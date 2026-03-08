import React, { useState, useEffect , useMemo, useCallback, useRef} from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Pressable, ActivityIndicator, TextStyle, TouchableWithoutFeedback , DeviceEventEmitter, Animated, Dimensions } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { offlineInsert, offlineUpdate, offlineDelete, getOfflineFeedback } from '../../services/offlineSupabase';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { Produto as ProdutoBase, Servico as ServicoBase, Pacote as PacoteBase } from '@types';
import { theme } from '@utils/theme';
import { Button } from '../../components/Button';
import { SelectionButton, SELECTION_BUTTON_CONTAINER_STYLE } from '../../components/Buttons';

type ProdutoPacote = {
  id: string;
  pacote_id: string;
  produto_id: string;
  quantidade: number;
  produto?: {
    nome: string;
    preco: number;
  };
};

type ServicoPacote = {
  id: string;
  pacote_id: string;
  servico_id: string;
  quantidade: number;
  servico?: {
    nome: string;
    preco: number;
    duracao?: number; // em minutos
  };
};

type PacoteDetalhado = Pick<PacoteBase, 'id' | 'nome' | 'descricao' | 'valor' | 'estabelecimento_id'> & {
  desconto: number;
  duracao_total?: number; // duraï¿½ï¿½o total calculada em minutos
  data_cadastro: string;
  produtos?: ProdutoPacote[];
  servicos?: ServicoPacote[];
};

type ProdutoPacotes = Pick<ProdutoBase, 'id' | 'nome' | 'preco'>;

type ServicoPacotes = Pick<ServicoBase, 'id' | 'nome' | 'preco'> & {
  duracao?: number; // em minutos
};

type ProdutoPacoteData = {
  produto: {
    id: string;
    nome: string;
    preco: number;
  };
  quantidade: number;
};

type ServicoPacoteData = {
  servico: {
    id: string;
    nome: string;
    preco: number;
  };
  quantidade: number;
};

type PacoteFieldErrorKey = 'nomePacote' | 'descricaoPacote' | 'precoPacote';
type PacoteFieldErrors = Partial<Record<PacoteFieldErrorKey, string>>;

export default function PacotesScreen() {
  const { estabelecimentoId } = useAuth();
  const { colors } = useTheme();
  
  // Estilos dinï¿½micos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [pacotes, setPacotes] = useState<PacoteDetalhado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pacoteEmEdicao, setPacoteEmEdicao] = useState<PacoteDetalhado | null>(null);
  const [novoPacote, setNovoPacote] = useState({
    nome: '',
    descricao: '',
    valor: '',
    desconto: '',
    produtos: [] as ProdutoPacote[],
    servicos: [] as ServicoPacote[]
  });
  const [produtos, setProdutos] = useState<ProdutoPacotes[]>([]);
  const [servicos, setServicos] = useState<ServicoPacotes[]>([]);
  const [mostrarModalProdutos, setMostrarModalProdutos] = useState(false);
  const [mostrarModalServicos, setMostrarModalServicos] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoPacotes[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoPacotes[]>([]);
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<{ [key: string]: string }>({});
  const [quantidadesServicos, setQuantidadesServicos] = useState<{ [key: string]: string }>({});
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaServico, setBuscaServico] = useState('');
  const [pacoteId, setPacoteId] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<PacoteFieldErrors>({});
  const { session } = useAuth();
  const produtosButtonRef = useRef<any>(null);
  const servicosButtonRef = useRef<any>(null);
  const origemModalSelecaoRef = useRef({ x: 0, y: 0 });
  const scaleSelecaoAnim = useRef(new Animated.Value(0)).current;
  const opacitySelecaoAnim = useRef(new Animated.Value(0)).current;
  const translateXSelecaoAnim = useRef(new Animated.Value(0)).current;
  const translateYSelecaoAnim = useRef(new Animated.Value(0)).current;
  const origemModalPacoteRef = useRef({ x: 0, y: 0 });
  const scalePacoteAnim = useRef(new Animated.Value(0)).current;
  const opacityPacoteAnim = useRef(new Animated.Value(0)).current;
  const translateXPacoteAnim = useRef(new Animated.Value(0)).current;
  const translateYPacoteAnim = useRef(new Animated.Value(0)).current;

  const calcularDeslocamentoCentroSelecao = (origemX: number, origemY: number) => {
    const { width, height } = Dimensions.get('window');
    return {
      deltaX: origemX - (width / 2),
      deltaY: origemY - (height / 2),
    };
  };

  const iniciarAnimacaoAberturaSelecao = (
    origemX: number,
    origemY: number,
    mostrarModal: (visible: boolean) => void
  ) => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroSelecao(origemX, origemY);
    origemModalSelecaoRef.current = { x: origemX, y: origemY };

    scaleSelecaoAnim.setValue(0.25);
    opacitySelecaoAnim.setValue(0);
    translateXSelecaoAnim.setValue(deltaX);
    translateYSelecaoAnim.setValue(deltaY);
    mostrarModal(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(scaleSelecaoAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacitySelecaoAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateXSelecaoAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(translateYSelecaoAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const fecharModalSelecaoComAnimacao = (onAfterClose: () => void) => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroSelecao(origemModalSelecaoRef.current.x, origemModalSelecaoRef.current.y);

    Animated.parallel([
      Animated.timing(scaleSelecaoAnim, {
        toValue: 0.25,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacitySelecaoAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateXSelecaoAnim, {
        toValue: deltaX,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYSelecaoAnim, {
        toValue: deltaY,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      scaleSelecaoAnim.setValue(0);
      opacitySelecaoAnim.setValue(0);
      translateXSelecaoAnim.setValue(0);
      translateYSelecaoAnim.setValue(0);
      onAfterClose();
    });
  };

  const calcularDeslocamentoCentroPacote = (origemX: number, origemY: number) => {
    const { width, height } = Dimensions.get('window');
    return {
      deltaX: origemX - (width / 2),
      deltaY: origemY - (height / 2),
    };
  };

  const abrirModalPacoteComOrigem = (origem?: { x?: number; y?: number }) => {
    const { width, height } = Dimensions.get('window');
    const origemX = Number.isFinite(origem?.x) ? Number(origem?.x) : (width / 2);
    const origemY = Number.isFinite(origem?.y) ? Number(origem?.y) : (height / 2);
    const { deltaX, deltaY } = calcularDeslocamentoCentroPacote(origemX, origemY);

    origemModalPacoteRef.current = { x: origemX, y: origemY };
    scalePacoteAnim.setValue(0.25);
    opacityPacoteAnim.setValue(0);
    translateXPacoteAnim.setValue(deltaX);
    translateYPacoteAnim.setValue(deltaY);
    setMostrarModal(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(scalePacoteAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityPacoteAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateXPacoteAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(translateYPacoteAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const fecharModalPacoteComAnimacao = (onAfterClose?: () => void) => {
    const { deltaX, deltaY } = calcularDeslocamentoCentroPacote(origemModalPacoteRef.current.x, origemModalPacoteRef.current.y);

    Animated.parallel([
      Animated.timing(scalePacoteAnim, {
        toValue: 0.25,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityPacoteAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateXPacoteAnim, {
        toValue: deltaX,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYPacoteAnim, {
        toValue: deltaY,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMostrarModal(false);
      scalePacoteAnim.setValue(0);
      opacityPacoteAnim.setValue(0);
      translateXPacoteAnim.setValue(0);
      translateYPacoteAnim.setValue(0);
      onAfterClose?.();
    });
  };

  useFocusEffect(
    useCallback(() => {
      carregarPacotes();
      
      const subscription = DeviceEventEmitter.addListener('addPacote', (payload?: { x?: number; y?: number }) => {
        handleNovoPacote(payload);
      });

      return () => {
        subscription.remove();
      };
    }, [estabelecimentoId, session?.user?.id])
  );

  // Carregar produtos e serviï¿½os quando estabelecimentoId estiver disponï¿½vel
  useEffect(() => {
    if (estabelecimentoId) {
      carregarProdutos();
      carregarServicos();
    }
  }, [estabelecimentoId]);


  const carregarPacotes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        logger.error('Usuï¿½rio nï¿½o autenticado');
        Alert.alert('Erro', 'Usuï¿½rio nï¿½o autenticado. Por favor, faï¿½a login novamente.');
        router.replace('/(auth)/login');
        return;
      }

      const { data: pacotes, error } = await supabase
        .from('pacotes')
        .select(`
          *,
          produtos:pacotes_produtos(
            quantidade,
            produto:produtos(
              id,
              nome,
              preco
            )
          ),
          servicos:pacotes_servicos(
            quantidade,
            servico:servicos(
              id,
              nome,
              preco,
              duracao
            )
          )
        `)
  .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;

      // Funï¿½ï¿½o para calcular duraï¿½ï¿½o total do pacote
      const calcularDuracaoTotal = (servicos: any[]): number | undefined => {
        if (!servicos || servicos.length === 0) return undefined;
        
        let duracaoTotal = 0;
        let temDuracao = false;
        
        for (const s of servicos) {
          if (s.servico?.duracao) {
            duracaoTotal += s.servico.duracao * (s.quantidade || 1);
            temDuracao = true;
          }
        }
        
        return temDuracao ? duracaoTotal : undefined;
      };

      // Formatar os dados dos pacotes
      const pacotesFormatados = pacotes?.map(pacote => {
        const servicosFormatados = pacote.servicos?.map((s: ServicoPacoteData) => ({
          id: Math.random().toString(),
          pacote_id: pacote.id,
          servico_id: s.servico.id,
          quantidade: s.quantidade,
          servico: s.servico
        })) || [];

        return {
          ...pacote,
          duracao_total: calcularDuracaoTotal(pacote.servicos || []),
          produtos: pacote.produtos?.map((p: ProdutoPacoteData) => ({
            id: Math.random().toString(),
            pacote_id: pacote.id,
            produto_id: p.produto.id,
            quantidade: p.quantidade,
            produto: p.produto
          })) || [],
          servicos: servicosFormatados
        };
      });

      setPacotes(pacotesFormatados || []);
    } catch (error) {
      logger.error('Erro ao carregar pacotes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os pacotes');
    } finally {
      setLoading(false);
    }
  };

  const carregarProdutos = async () => {
    try {
      if (!estabelecimentoId) {
        logger.error('Estabelecimento nï¿½o identificado');
        return;
      }

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
      logger.debug('Produtos carregados para pacotes:', data?.length || 0);
    } catch (error) {
      logger.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    }
  };

  const carregarServicos = async () => {
    try {
      if (!estabelecimentoId) {
        logger.error('Estabelecimento nï¿½o identificado');
        return;
      }

      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, preco, duracao')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setServicos(data || []);
      logger.debug('Serviços carregados para pacotes:', data?.length || 0);
    } catch (error) {
      logger.error('Erro ao carregar serviços:', error);
      Alert.alert('Erro', 'Não foi possível carregar os serviços');
    }
  };

  const handleNovoPacote = (origem?: { x?: number; y?: number }) => {
    setPacoteEmEdicao(null);
    setNovoPacote({
      nome: '',
      descricao: '',
      valor: '',
      desconto: '',
      produtos: [],
      servicos: []
    });
    abrirModalPacoteComOrigem(origem);
  };

  const handleEditarPacote = (pacote: PacoteDetalhado, origem?: { x?: number; y?: number }) => {
    setPacoteEmEdicao(pacote);
    
    // Recalcular a soma dos serviï¿½os e produtos (sem desconto)
    const somaProdutos = (pacote.produtos || []).reduce((total, item) => {
      return total + (item.produto?.preco || 0) * item.quantidade;
    }, 0);
    
    const somaServicos = (pacote.servicos || []).reduce((total, item) => {
      return total + (item.servico?.preco || 0) * item.quantidade;
    }, 0);
    
    const somaTotal = somaProdutos + somaServicos;
    
    setNovoPacote({
      nome: pacote.nome,
      descricao: pacote.descricao,
      valor: somaTotal.toString(), // Soma SEM desconto (para funcionar com adicionar/remover)
      desconto: pacote.desconto.toString(),
      produtos: pacote.produtos || [],
      servicos: pacote.servicos || []
    });
    abrirModalPacoteComOrigem(origem);
  };

  const handleExcluirPacote = async (pacote: PacoteDetalhado) => {
    Alert.alert(
      'Confirmar Exclusï¿½o',
      'Tem certeza que deseja excluir este pacote?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pacotes')
                .delete()
                .eq('id', pacote.id);

              if (error) throw error;
              await carregarPacotes();
            } catch (error) {
              logger.error('Erro ao excluir pacote:', error);
              Alert.alert('Erro', 'Não foi possível excluir o pacote');
            }
          },
        },
      ]
    );
  };

  const validarPacote = (): PacoteFieldErrors => {
    const erros: PacoteFieldErrors = {};

    if (!novoPacote.nome.trim()) {
      erros.nomePacote = 'Nome do pacote é obrigatório';
    }

    return erros;
  };

  const handleSalvarPacote = async () => {
    const erros = validarPacote();
    
    if (Object.keys(erros).length > 0) {
      setFieldErrors(erros);
      return;
    }

    setFieldErrors({});

    try {
      if (!novoPacote.nome.trim()) {
        Alert.alert('Erro', 'O nome do pacote é obrigatório');
        return;
      }

      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado. Entre novamente.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        Alert.alert('Erro', 'Usuï¿½rio nï¿½o autenticado');
        return;
      }

      // Calcular soma dos serviï¿½os e produtos
      const somaServicos = Number(novoPacote.valor.replace(',', '.'));
      const descontoNum = Number(novoPacote.desconto.replace(',', '.'));
      
      // IMPORTANTE: O campo "valor" no banco deve ser o VALOR FINAL (com desconto aplicado)
      // novoPacote.valor contï¿½m a SOMA dos serviï¿½os/produtos
      // Entï¿½o: valor_final = soma_servicos - desconto
      const valorFinal = somaServicos - descontoNum;
      
      const pacoteData = {
        nome: novoPacote.nome.trim(),
        descricao: novoPacote.descricao.trim(),
        valor: isNaN(valorFinal) ? 0 : Math.max(0, valorFinal), // Garantir que nï¿½o seja negativo
        desconto: isNaN(descontoNum) ? 0 : descontoNum,
        estabelecimento_id: estabelecimentoId,
      };

      let pacoteId;

      if (pacoteEmEdicao) {
        const { error, fromCache } = await offlineUpdate(
          'pacotes',
          pacoteEmEdicao.id,
          pacoteData,
          estabelecimentoId!
        );

        if (error) throw error;
        pacoteId = pacoteEmEdicao.id;

        // Remover produtos e serviï¿½os existentes
        // Nota: offlineDelete nï¿½o suporta delete em lote por pacote_id.
        // Como estamos editando, os deletes sï¿½o refeitos localmente e sincronizados depois.
        await Promise.all([
          supabase.from('pacotes_produtos').delete().eq('pacote_id', pacoteId),
          supabase.from('pacotes_servicos').delete().eq('pacote_id', pacoteId)
        ]);
      } else {
        const { data, error, fromCache } = await offlineInsert(
          'pacotes',
          pacoteData,
          estabelecimentoId!
        );

        if (error) throw error;
        pacoteId = fromCache ? Date.now().toString() : data![0].id;
      }

      // Inserir produtos
      if (novoPacote.produtos.length > 0) {
        for (const produto of novoPacote.produtos) {
          const produtoData = {
            pacote_id: pacoteId,
            produto_id: produto.produto_id,
            quantidade: produto.quantidade,
            estabelecimento_id: estabelecimentoId
          };

          const { error: produtosError } = await offlineInsert(
            'pacotes_produtos',
            produtoData,
            estabelecimentoId!
          );

          if (produtosError) throw produtosError;
        }
      }

      // Inserir serviï¿½os
      let lastFromCache = false;
      if (novoPacote.servicos.length > 0) {
        for (const servico of novoPacote.servicos) {
          const servicoData = {
            pacote_id: pacoteId,
            servico_id: servico.servico_id,
            quantidade: servico.quantidade,
            estabelecimento_id: estabelecimentoId
          };

          const { error: servicosError, fromCache } = await offlineInsert(
            'pacotes_servicos',
            servicoData,
            estabelecimentoId!
          );

          if (servicosError) throw servicosError;
          lastFromCache = fromCache || false;
        }
      }

      await carregarPacotes();
      fecharModalPacoteComAnimacao(() => {
        setPacoteEmEdicao(null);
        setNovoPacote({
          nome: '',
          descricao: '',
          valor: '',
          desconto: '',
          produtos: [],
          servicos: []
        });
      });
      
      const feedback = getOfflineFeedback(lastFromCache, pacoteEmEdicao ? 'update' : 'create');
      Alert.alert(feedback.title, feedback.message);
    } catch (error) {
      logger.error('Erro ao salvar pacote:', error);
      Alert.alert('Erro', 'Não foi possível salvar o pacote');
    }
  };

  const handleSelecionarProduto = (produto: ProdutoPacotes) => {
    setProdutosSelecionados(prev => {
      const jaSelecionado = prev.find(p => p.id === produto.id);
      if (jaSelecionado) {
        return prev.filter(p => p.id !== produto.id);
      }
      return [...prev, produto];
    });
  };

  const handleSelecionarServico = (servico: ServicoPacotes) => {
    setServicosSelecionados(prev => {
      const jaSelecionado = prev.find(s => s.id === servico.id);
      if (jaSelecionado) {
        return prev.filter(s => s.id !== servico.id);
      }
      return [...prev, servico];
    });
  };

  const handleQuantidadeProdutoChange = (produtoId: string, valor: string) => {
    setQuantidadesProdutos(prev => ({
      ...prev,
      [produtoId]: valor
    }));
  };

  const handleQuantidadeServicoChange = (servicoId: string, valor: string) => {
    setQuantidadesServicos(prev => ({
      ...prev,
      [servicoId]: valor
    }));
  };

  const resetPacoteModal = () => {
    setFieldErrors({});
    setPacoteEmEdicao(null);
    setNovoPacote({
      nome: '',
      descricao: '',
      produtos: [],
      servicos: [],
      valor: '0',
      desconto: '0',
    });
  };

  const fecharModalPacote = () => {
    fecharModalPacoteComAnimacao(() => {
      resetPacoteModal();
    });
  };

  const handleAdicionarProdutos = async () => {
    try {
      if (produtosSelecionados.length === 0) {
        Alert.alert('Erro', 'Selecione pelo menos um produto');
        return;
      }

      const novosProdutos: ProdutoPacote[] = produtosSelecionados.map(produto => ({
        id: Math.random().toString(),
        pacote_id: '', // Serï¿½ preenchido quando o pacote for salvo
        produto_id: produto.id,
        quantidade: Number(quantidadesProdutos[produto.id] || '1'),
        produto: {
          nome: produto.nome,
          preco: produto.preco
        }
      }));

      // Calcula o valor total dos produtos selecionados
      const valorTotal = novosProdutos.reduce((total, item) => {
        return total + (Number(item.produto?.preco) || 0) * Number(item.quantidade);
      }, 0);

      // Atualiza o novoPacote com os produtos e valor
      setNovoPacote(prev => ({
        ...prev,
        produtos: [...(prev.produtos || []), ...novosProdutos],
        valor: (parseFloat(prev.valor || '0') + valorTotal).toString()
      }));

      setProdutosSelecionados([]);
      setQuantidadesProdutos({});
      fecharModalSelecaoComAnimacao(() => {
        setMostrarModalProdutos(false);
      });
      
      Alert.alert('Sucesso', 'Produtos adicionados com sucesso!');
    } catch (error) {
      logger.error('Erro ao adicionar produtos:', error);
      Alert.alert('Erro', 'Erro ao adicionar produtos ao pacote');
    }
  };

  const handleAdicionarServicos = () => {
    if (servicosSelecionados.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um serviço');
      return;
    }

    const novosServicos: ServicoPacote[] = servicosSelecionados.map(servico => {
      const quantidade = parseInt(quantidadesServicos[servico.id] || '1');
      return {
        id: Math.random().toString(),
        pacote_id: '',
        servico_id: servico.id,
        quantidade,
        servico: {
          nome: servico.nome,
          preco: servico.preco
        }
      };
    });

    const valorTotal = novosServicos.reduce((total, servico) => {
      return total + (servico.servico?.preco || 0) * servico.quantidade;
    }, 0);

    setNovoPacote(prev => ({
      ...prev,
      servicos: [...prev.servicos, ...novosServicos],
      valor: (parseFloat(prev.valor || '0') + valorTotal).toString()
    }));

    setServicosSelecionados([]);
    setQuantidadesServicos({});
    fecharModalSelecaoComAnimacao(() => {
      setMostrarModalServicos(false);
    });
  };

  const handleRemoverProduto = (index: number) => {
    setNovoPacote(prev => {
      const produto = prev.produtos[index];
      const novoValor = (parseFloat(prev.valor || '0') - (produto.produto?.preco || 0) * produto.quantidade).toString();
      return {
        ...prev,
        produtos: prev.produtos.filter((_, i) => i !== index),
        valor: novoValor
      };
    });
  };

  const handleRemoverServico = (index: number) => {
    setNovoPacote(prev => {
      const servico = prev.servicos[index];
      const novoValor = (parseFloat(prev.valor || '0') - (servico.servico?.preco || 0) * servico.quantidade).toString();
      return {
        ...prev,
        servicos: prev.servicos.filter((_, i) => i !== index),
        valor: novoValor
      };
    });
  };

  const handleMostrarModalProdutos = async () => {
    // Garantir que os produtos estejam carregados
    if (produtos.length === 0) {
      await carregarProdutos();
    }

    const fallbackOrigem = () => {
      const { width, height } = Dimensions.get('window');
      iniciarAnimacaoAberturaSelecao(width / 2, height / 2, setMostrarModalProdutos);
    };

    if (produtosButtonRef.current?.measureInWindow) {
      produtosButtonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          iniciarAnimacaoAberturaSelecao(x + (width / 2), y + (height / 2), setMostrarModalProdutos);
          return;
        }
        fallbackOrigem();
      });
      return;
    }

    fallbackOrigem();
  };

  const handleMostrarModalServicos = async () => {
    // Garantir que os serviï¿½os estejam carregados
    if (servicos.length === 0) {
      await carregarServicos();
    }

    const fallbackOrigem = () => {
      const { width, height } = Dimensions.get('window');
      iniciarAnimacaoAberturaSelecao(width / 2, height / 2, setMostrarModalServicos);
    };

    if (servicosButtonRef.current?.measureInWindow) {
      servicosButtonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          iniciarAnimacaoAberturaSelecao(x + (width / 2), y + (height / 2), setMostrarModalServicos);
          return;
        }
        fallbackOrigem();
      });
      return;
    }

    fallbackOrigem();
  };

  const renderItem = ({ item }: { item: PacoteDetalhado }) => {
    // Calcular soma dos serviï¿½os e produtos
    const somaProdutos = (item.produtos || []).reduce((total, prod) => {
      return total + (prod.produto?.preco || 0) * prod.quantidade;
    }, 0);
    
    const somaServicos = (item.servicos || []).reduce((total, serv) => {
      return total + (serv.servico?.preco || 0) * serv.quantidade;
    }, 0);
    
    const valorSemDesconto = somaProdutos + somaServicos;
    const valorComDesconto = item.valor; // Agora item.valor Jï¿½ ï¿½ o valor final
    
    return (
    <TouchableOpacity 
      style={styles.pacoteCard}
      onPress={(event) => handleEditarPacote(item, {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      })}
    >
      <View style={styles.pacoteHeader}>
        <View style={styles.pacoteInfo}>
          <Text style={styles.pacoteNome}>{item.nome}</Text>
        </View>
        <View style={styles.pacoteValores}>
          {item.desconto > 0 ? (
            <>
              <Text style={styles.valorOriginalText}>
                De: {valorSemDesconto.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
              <Text style={styles.descontoText}>
                Desconto: {item.desconto.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
              <Text style={styles.valorFinalText}>
                Por: {valorComDesconto.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.valorFinalText}>
              {valorComDesconto.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </Text>
          )}
        </View>
      </View>
      
      <Text style={styles.pacoteDescricao} numberOfLines={2}>
        {item.descricao}
      </Text>

      {item.produtos && item.produtos.length > 0 && (
        <View style={styles.secaoLista}>
          <Text style={styles.secaoTitulo}>Produtos:</Text>
          {item.produtos.map((produto) => (
            <View key={produto.id} style={styles.itemListaCompacto}>
              <Text style={styles.itemNomeCompacto}>
                {produto.produto?.nome} (x{produto.quantidade})
              </Text>
              <Text style={styles.itemPrecoCompacto}>
                R$ {((produto.produto?.preco || 0) * produto.quantidade).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {item.servicos && item.servicos.length > 0 && (
        <View style={styles.secaoLista}>
          <Text style={styles.secaoTitulo}>Serviços:</Text>
          {item.servicos.map((servico) => (
            <View key={servico.id} style={styles.itemListaCompacto}>
              <View style={styles.itemInfoCompacto}>
                <Text style={styles.itemNomeCompacto}>
                  {servico.servico?.nome} (x{servico.quantidade})
                </Text>
                {servico.servico?.duracao && (
                  <Text style={styles.itemDuracaoCompacto}>
                    â± {servico.servico.duracao * servico.quantidade} min
                  </Text>
                )}
              </View>
              <Text style={styles.itemPrecoCompacto}>
                R$ {((servico.servico?.preco || 0) * servico.quantidade).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
          ))}
          {item.duracao_total && (
            <View style={styles.duracaoTotalContainer}>
              <Text style={styles.duracaoTotalText}>
                â± Duração total: {item.duracao_total} minutos
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.pacoteFooter}>
        <TouchableOpacity 
          style={styles.excluirButton}
          onPress={() => handleExcluirPacote(item)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar pacotes..."
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <FlatList
        data={pacotes.filter(pacote => 
          pacote.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pacote.descricao.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={carregarPacotes}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum pacote encontrado</Text>
            </View>
          )
        }
      />

      <Modal
        visible={mostrarModal}
        transparent={true}
        animationType="none"
        onRequestClose={fecharModalPacote}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={fecharModalPacote} />
          <Animated.View
            style={[
              styles.modalCardLarge,
              {
                transform: [
                  { translateX: translateXPacoteAnim },
                  { translateY: translateYPacoteAnim },
                  { scale: scalePacoteAnim },
                ],
                opacity: opacityPacoteAnim,
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pacoteEmEdicao ? 'Editar Pacote' : 'Novo Pacote'}
              </Text>
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome do Pacote</Text>
                    <TextInput
                      style={[styles.input, fieldErrors.nomePacote && { borderColor: colors.error, borderWidth: 1 }]}
                      value={novoPacote.nome}
                      onChangeText={(text) => setNovoPacote({ ...novoPacote, nome: text })}
                      placeholder="Digite o nome do pacote"
                      placeholderTextColor={colors.textTertiary}
                    />
                    {fieldErrors.nomePacote ? <Text style={[styles.label, { color: colors.error, marginTop: 4, fontSize: 12 }]}>{fieldErrors.nomePacote}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={novoPacote.descricao}
                      onChangeText={(text) => setNovoPacote({ ...novoPacote, descricao: text })}
                      placeholder="Digite a descrição do pacote"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  {/* Seção de itens - botões lado a lado como em Comandas */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Itens do Pacote</Text>
                    <View style={[SELECTION_BUTTON_CONTAINER_STYLE, { paddingHorizontal: 0, justifyContent: 'space-between' }]}>
                      <View ref={produtosButtonRef} collapsable={false} style={{ width: '48.5%' }}>
                        <SelectionButton
                          label="Produtos"
                          icon="cube-outline"
                          count={novoPacote.produtos.length}
                          selected={novoPacote.produtos.length > 0}
                          value={novoPacote.produtos.reduce((sum, p) => sum + ((p.produto?.preco || 0) * p.quantidade), 0)}
                          onPress={handleMostrarModalProdutos}
                        />
                      </View>
                      <View ref={servicosButtonRef} collapsable={false} style={{ width: '48.5%' }}>
                        <SelectionButton
                          label="Serviços"
                          icon="cut-outline"
                          count={novoPacote.servicos.length}
                          selected={novoPacote.servicos.length > 0}
                          value={novoPacote.servicos.reduce((sum, s) => sum + ((s.servico?.preco || 0) * s.quantidade), 0)}
                          onPress={handleMostrarModalServicos}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Produtos adicionados */}
                  {novoPacote.produtos.length > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Produtos Selecionados</Text>
                      {novoPacote.produtos.map((produto, index) => (
                        <View key={produto.id} style={styles.itemLista}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemNome}>{produto.produto?.nome}</Text>
                            <Text style={styles.itemQuantidade}>Qtd: {produto.quantidade}</Text>
                            <Text style={styles.itemPreco}>
                              R$ {((produto.produto?.preco || 0) * produto.quantidade).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoverProduto(index)}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Serviços adicionados */}
                  {novoPacote.servicos.length > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Serviços Selecionados</Text>
                      {novoPacote.servicos.map((servico, index) => (
                        <View key={servico.id} style={styles.itemLista}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemNome}>{servico.servico?.nome}</Text>
                            <Text style={styles.itemQuantidade}>Qtd: {servico.quantidade}</Text>
                            {servico.servico?.duracao && (
                              <Text style={styles.itemDuracao}>
                                â± {servico.servico.duracao * servico.quantidade} min
                              </Text>
                            )}
                            <Text style={styles.itemPreco}>
                              R$ {((servico.servico?.preco || 0) * servico.quantidade).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoverServico(index)}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Itens adicionados</Text>
                    <TouchableWithoutFeedback>
                      <TextInput
                        style={[styles.input, styles.valorInput, styles.valorItemsInput]}
                        value={parseFloat(novoPacote.valor || '0').toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                        placeholder="R$ 0,00"
                        placeholderTextColor={colors.textTertiary}
                        editable={false}
                      />
                    </TouchableWithoutFeedback>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Desconto</Text>
                    <TouchableWithoutFeedback>
                      <TextInput
                        style={[styles.input, styles.valorInput, styles.valorItemsInput]}
                        value={novoPacote.desconto ? parseFloat(novoPacote.desconto).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }) : ''}
                        onChangeText={(text) => {
                          const apenasNumeros = text.replace(/[^\d]/g, '');
                          const valor = apenasNumeros ? (parseInt(apenasNumeros) / 100).toString() : '';
                          setNovoPacote({ ...novoPacote, desconto: valor });
                        }}
                        placeholder="R$ 0,00"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </TouchableWithoutFeedback>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Valor final</Text>
                    <View style={[styles.valorFinalContainer, styles.valorBox]}>
                      <Text style={[styles.valorFinalText, { fontSize: 22 }]}>
                        {(parseFloat(novoPacote.valor || '0') - parseFloat(novoPacote.desconto || '0')).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={fecharModalPacote}
                >
                  Cancelar
                </Button>
              </View>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={handleSalvarPacote}
                >
                  Salvar
                </Button>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Produtos */}
      <Modal
        visible={mostrarModalProdutos}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          fecharModalSelecaoComAnimacao(() => {
            setMostrarModalProdutos(false);
            setProdutosSelecionados([]);
            setQuantidadesProdutos({});
            setBuscaProduto('');
          });
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={() => {
              fecharModalSelecaoComAnimacao(() => {
                setMostrarModalProdutos(false);
                setProdutosSelecionados([]);
                setQuantidadesProdutos({});
                setBuscaProduto('');
              });
            }}
          />
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [
                  { translateX: translateXSelecaoAnim },
                  { translateY: translateYSelecaoAnim },
                  { scale: scaleSelecaoAnim },
                ],
                opacity: opacitySelecaoAnim,
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Produtos</Text>
            </View>

            <View style={styles.searchModalContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchModalInput}
                value={buscaProduto}
                onChangeText={setBuscaProduto}
                placeholder="Buscar produtos..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubtitle}>Selecione os produtos e defina as quantidades</Text>
            </View>

            <ScrollView style={styles.modalList}>
              {produtos
                .filter(produto => 
                  produto.nome.toLowerCase().includes(buscaProduto.toLowerCase())
                )
                .map((produto) => (
                <TouchableOpacity
                  key={produto.id}
                  style={[
                    styles.modalItem,
                    produtosSelecionados.some(p => p.id === produto.id) && styles.modalItemSelecionado
                  ]}
                  onPress={() => handleSelecionarProduto(produto)}
                >
                  <View style={styles.modalItemContent}>
                    <View style={styles.modalItemInfo}>
                      <Text style={[
                        styles.modalItemText,
                        produtosSelecionados.some(p => p.id === produto.id) && styles.modalItemTextSelecionado
                      ]}>{produto.nome}</Text>
                      <Text style={[
                        styles.modalItemPreco,
                        produtosSelecionados.some(p => p.id === produto.id) && styles.modalItemPrecoSelecionado
                      ]}>
                        {produto.preco.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </Text>
                    </View>
                    {produtosSelecionados.some(p => p.id === produto.id) && (
                      <View style={styles.quantidadeInputContainer}>
                        <Text style={styles.quantidadeLabel}>Quantidade:</Text>
                        <View style={styles.quantidadeControls}>
                          <TouchableOpacity
                            style={styles.quantidadeButton}
                            onPress={() => {
                              const atual = parseInt(quantidadesProdutos[produto.id] || '1');
                              if (atual > 1) {
                                handleQuantidadeProdutoChange(produto.id, (atual - 1).toString());
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.quantidadeInput}
                            value={quantidadesProdutos[produto.id] || '1'}
                            onChangeText={(text) => {
                              const apenasNumeros = text.replace(/[^0-9]/g, '');
                              const valor = parseInt(apenasNumeros) || 1;
                              handleQuantidadeProdutoChange(produto.id, valor.toString());
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                          />
                          <TouchableOpacity
                            style={styles.quantidadeButton}
                            onPress={() => {
                              const atual = parseInt(quantidadesProdutos[produto.id] || '1');
                              if (atual < 999) {
                                handleQuantidadeProdutoChange(produto.id, (atual + 1).toString());
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="large"
                  onPress={handleAdicionarProdutos}
                  disabled={produtosSelecionados.length === 0}
                  fullWidth
                >
                  Adicionar ao Pacote ({produtosSelecionados.length})
                </Button>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Serviços */}
      <Modal
        visible={mostrarModalServicos}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          fecharModalSelecaoComAnimacao(() => {
            setMostrarModalServicos(false);
            setServicosSelecionados([]);
            setQuantidadesServicos({});
            setBuscaServico('');
          });
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={() => {
              fecharModalSelecaoComAnimacao(() => {
                setMostrarModalServicos(false);
                setServicosSelecionados([]);
                setQuantidadesServicos({});
                setBuscaServico('');
              });
            }}
          />
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [
                  { translateX: translateXSelecaoAnim },
                  { translateY: translateYSelecaoAnim },
                  { scale: scaleSelecaoAnim },
                ],
                opacity: opacitySelecaoAnim,
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Serviços</Text>
            </View>

            <View style={styles.searchModalContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchModalInput}
                value={buscaServico}
                onChangeText={setBuscaServico}
                placeholder="Buscar serviços..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <ScrollView style={styles.modalList}>
              {servicos
                .filter(servico => 
                  servico.nome.toLowerCase().includes(buscaServico.toLowerCase())
                )
                .map((servico) => (
                <TouchableOpacity
                  key={servico.id}
                  style={[
                    styles.modalItem,
                    servicosSelecionados.some(s => s.id === servico.id) && styles.modalItemSelecionado
                  ]}
                  onPress={() => handleSelecionarServico(servico)}
                >
                  <View style={styles.modalItemContent}>
                    <View style={styles.modalItemInfo}>
                      <Text style={[
                        styles.modalItemText,
                        servicosSelecionados.some(s => s.id === servico.id) && styles.modalItemTextSelecionado
                      ]}>{servico.nome}</Text>
                      <Text style={[
                        styles.modalItemPreco,
                        servicosSelecionados.some(s => s.id === servico.id) && styles.modalItemPrecoSelecionado
                      ]}>
                        {servico.preco.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </Text>
                    </View>
                    {servicosSelecionados.some(s => s.id === servico.id) && (
                      <View style={styles.quantidadeInputContainer}>
                        <Text style={styles.quantidadeLabel}>Quantidade:</Text>
                        <View style={styles.quantidadeControls}>
                          <TouchableOpacity
                            style={styles.quantidadeButton}
                            onPress={() => {
                              const atual = parseInt(quantidadesServicos[servico.id] || '1');
                              if (atual > 1) {
                                handleQuantidadeServicoChange(servico.id, (atual - 1).toString());
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.quantidadeInput}
                            value={quantidadesServicos[servico.id] || '1'}
                            onChangeText={(text) => {
                              const apenasNumeros = text.replace(/[^0-9]/g, '');
                              const valor = parseInt(apenasNumeros) || 1;
                              handleQuantidadeServicoChange(servico.id, valor.toString());
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                          />
                          <TouchableOpacity
                            style={styles.quantidadeButton}
                            onPress={() => {
                              const atual = parseInt(quantidadesServicos[servico.id] || '1');
                              if (atual < 999) {
                                handleQuantidadeServicoChange(servico.id, (atual + 1).toString());
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButton}>
                <Button
                  variant="primary"
                  size="large"
                  onPress={handleAdicionarServicos}
                  disabled={servicosSelecionados.length === 0}
                  fullWidth
                >
                  Adicionar ao Pacote ({servicosSelecionados.length})
                </Button>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// Funï¿½ï¿½o auxiliar para criar estilos dinï¿½micos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  listContent: {
    padding: 16,
  },
  pacoteCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pacoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pacoteInfo: {
    flex: 1,
  },
  pacoteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  pacoteValores: {
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valorOriginalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  descontoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  valorFinalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  pacoteDescricao: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pacoteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  excluirButton: {
    padding: 8,
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
  modalForm: {
    flex: 1,
  },
  modalFormContent: {
    padding: 20,
  },
  formContainer: {
    flex: 1,
    paddingBottom: 100,
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
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    color: colors.text,
  } as TextStyle,
  valorInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    height: 44,
  } as TextStyle,
  valorBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
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
  button: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
  },
  itemLista: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
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
  removeButton: {
    padding: 8,
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
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
  modalItemSelecionado: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primary,
  },
  modalItemContent: {
    flexDirection: 'column',
  },
  modalItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalItemTextSelecionado: {
    color: colors.primaryContrast,
  },
  modalItemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalItemPrecoSelecionado: {
    color: colors.primaryContrast,
  },
  quantidadeInputContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantidadeLabel: {
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  quantidadeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    width: 120,
  },
  quantidadeInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 40,
  },
  quantidadeButton: {
    padding: 6,
    backgroundColor: colors.primaryBackground,
    borderRadius: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
  valorFinalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorItemsInput: {
    fontSize: 16,
  } as TextStyle,
  // valorFinalInput era TextStyle aplicado em View; removido do uso na View
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  // REMOVIDO: usar SELECTION_BUTTON_CONTAINER_STYLE importado de Buttons.tsx
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    color: colors.text,
  },
  searchModalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchModalInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  modalSubHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  secaoLista: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemListaCompacto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemInfoCompacto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemNomeCompacto: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  itemDuracaoCompacto: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  itemPrecoCompacto: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 8,
  },
  itemDuracao: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  duracaoTotalContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  duracaoTotalText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
}); 


