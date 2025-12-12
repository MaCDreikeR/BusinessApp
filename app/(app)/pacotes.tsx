import React, { useState, useEffect , useMemo} from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, PanResponder, Animated, ActivityIndicator, TextStyle, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { offlineInsert, offlineUpdate, offlineDelete, getOfflineFeedback } from '../../services/offlineSupabase';
import { router } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { Produto as ProdutoBase, Servico as ServicoBase, Pacote as PacoteBase } from '@types';
import { theme } from '@utils/theme';

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
  };
};

type PacoteDetalhado = Pick<PacoteBase, 'id' | 'nome' | 'descricao' | 'valor' | 'estabelecimento_id'> & {
  desconto: number;
  data_cadastro: string;
  produtos?: ProdutoPacote[];
  servicos?: ServicoPacote[];
};

type ProdutoPacotes = Pick<ProdutoBase, 'id' | 'nome' | 'preco'>;

type ServicoPacotes = Pick<ServicoBase, 'id' | 'nome' | 'preco'>;

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

export default function PacotesScreen() {
  const { estabelecimentoId } = useAuth();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
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
  const [slideAnimation] = useState(new Animated.Value(400));
  const [overlayOpacity] = useState(new Animated.Value(0));
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
  const { session } = useAuth();

  useEffect(() => {
    carregarPacotes();
    
    const subscription = DeviceEventEmitter.addListener('addPacote', () => {
      handleNovoPacote();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Carregar produtos e serviços quando estabelecimentoId estiver disponível
  useEffect(() => {
    if (estabelecimentoId) {
      carregarProdutos();
      carregarServicos();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    if (mostrarModal) {
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 400,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [mostrarModal]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnimation.setValue(gestureState.dy);
        const newOpacity = 1 - (gestureState.dy / 400);
        overlayOpacity.setValue(Math.max(0, newOpacity));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        Animated.parallel([
          Animated.timing(slideAnimation, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => setMostrarModal(false));
      } else {
        Animated.parallel([
          Animated.spring(slideAnimation, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      }
    }
  });

  const carregarPacotes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        logger.error('Usuário não autenticado');
        Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login novamente.');
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
              preco
            )
          )
        `)
  .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;

      // Formatar os dados dos pacotes
      const pacotesFormatados = pacotes?.map(pacote => ({
        ...pacote,
        produtos: pacote.produtos?.map((p: ProdutoPacoteData) => ({
          id: Math.random().toString(),
          pacote_id: pacote.id,
          produto_id: p.produto.id,
          quantidade: p.quantidade,
          produto: p.produto
        })) || [],
        servicos: pacote.servicos?.map((s: ServicoPacoteData) => ({
          id: Math.random().toString(),
          pacote_id: pacote.id,
          servico_id: s.servico.id,
          quantidade: s.quantidade,
          servico: s.servico
        })) || []
      }));

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
        logger.error('Estabelecimento não identificado');
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
        logger.error('Estabelecimento não identificado');
        return;
      }

      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, preco')
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

  const handleNovoPacote = () => {
    setPacoteEmEdicao(null);
    setNovoPacote({
      nome: '',
      descricao: '',
      valor: '',
      desconto: '',
      produtos: [],
      servicos: []
    });
    setMostrarModal(true);
  };

  const handleEditarPacote = (pacote: PacoteDetalhado) => {
    setPacoteEmEdicao(pacote);
    setNovoPacote({
      nome: pacote.nome,
      descricao: pacote.descricao,
      valor: pacote.valor.toString(),
      desconto: pacote.desconto.toString(),
      produtos: pacote.produtos || [],
      servicos: pacote.servicos || []
    });
    setMostrarModal(true);
  };

  const handleExcluirPacote = async (pacote: PacoteDetalhado) => {
    Alert.alert(
      'Confirmar Exclusão',
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

  const handleSalvarPacote = async () => {
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
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const valorNum = Number(novoPacote.valor.replace(',', '.'));
      const descontoNum = Number(novoPacote.desconto.replace(',', '.'));
      const pacoteData = {
        nome: novoPacote.nome.trim(),
        descricao: novoPacote.descricao.trim(),
        valor: isNaN(valorNum) ? 0 : valorNum,
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

        // Remover produtos e serviços existentes
        // Nota: offlineDelete não suporta delete em lote por pacote_id.
        // Como estamos editando, os deletes são refeitos localmente e sincronizados depois.
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

      // Inserir serviços
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
      setMostrarModal(false);
      setPacoteEmEdicao(null);
      setNovoPacote({
        nome: '',
        descricao: '',
        valor: '',
        desconto: '',
        produtos: [],
        servicos: []
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

  const handleAdicionarProdutos = async () => {
    try {
      if (produtosSelecionados.length === 0) {
        Alert.alert('Erro', 'Selecione pelo menos um produto');
        return;
      }

      const novosProdutos: ProdutoPacote[] = produtosSelecionados.map(produto => ({
        id: Math.random().toString(),
        pacote_id: '', // Será preenchido quando o pacote for salvo
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
      setMostrarModalProdutos(false);
      
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
    setMostrarModalServicos(false);
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
    setMostrarModalProdutos(true);
  };

  const handleMostrarModalServicos = async () => {
    // Garantir que os serviços estejam carregados
    if (servicos.length === 0) {
      await carregarServicos();
    }
    setMostrarModalServicos(true);
  };

  const renderItem = ({ item }: { item: PacoteDetalhado }) => (
    <TouchableOpacity 
      style={styles.pacoteCard}
      onPress={() => handleEditarPacote(item)}
    >
      <View style={styles.pacoteHeader}>
        <View style={styles.pacoteInfo}>
          <Text style={styles.pacoteNome}>{item.nome}</Text>
        </View>
        <View style={styles.pacoteValores}>
          <Text style={styles.valorOriginalText}>
            {item.valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </Text>
          {item.desconto > 0 && (
            <>
              <Text style={styles.descontoText}>
                - {item.desconto.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
              <Text style={styles.valorFinalText}>
                = {(item.valor - item.desconto).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
            </>
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
              <Text style={styles.itemNomeCompacto}>
                {servico.servico?.nome} (x{servico.quantidade})
              </Text>
              <Text style={styles.itemPrecoCompacto}>
                R$ {((servico.servico?.preco || 0) * servico.quantidade).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
          ))}
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
              <ActivityIndicator size="large" color={theme.colors.primary} />
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
        onRequestClose={() => setMostrarModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: overlayOpacity
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setMostrarModal(false)}
          />
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{
                  translateY: slideAnimation
                }]
              }
            ]}
          >
            <View 
              {...panResponder.panHandlers}
              style={styles.modalHeader}
            >
              <View style={styles.modalDragIndicator} />
              <Text style={styles.modalTitle}>
                {pacoteEmEdicao ? 'Editar Pacote' : 'Novo Pacote'}
              </Text>
            </View>

            <View style={[styles.modalContent, { flex: 1 }]}>
              <ScrollView 
                style={[styles.modalForm, { flex: 1 }]}
                showsVerticalScrollIndicator={true}
                bounces={false}
                contentContainerStyle={[styles.modalFormContent, { paddingBottom: 120 }]}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  if (panResponder.panHandlers.onResponderTerminate) {
                    panResponder.panHandlers.onResponderTerminate({} as any);
                  }
                }}
              >
                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome do Pacote</Text>
                    <TextInput
                      style={styles.input}
                      value={novoPacote.nome}
                      onChangeText={(text) => setNovoPacote({ ...novoPacote, nome: text })}
                      placeholder="Digite o nome do pacote"
                      placeholderTextColor={colors.textTertiary}
                    />
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Produtos</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleMostrarModalProdutos}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                      <Text style={styles.addButtonText}>Adicionar Produtos</Text>
                    </TouchableOpacity>
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Serviços</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleMostrarModalServicos}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                      <Text style={styles.addButtonText}>Adicionar Serviços</Text>
                    </TouchableOpacity>
                    {novoPacote.servicos.map((servico, index) => (
                      <View key={servico.id} style={styles.itemLista}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemNome}>{servico.servico?.nome}</Text>
                          <Text style={styles.itemQuantidade}>Qtd: {servico.quantidade}</Text>
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

              <View style={[styles.modalFooter, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setMostrarModal(false)}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSalvarPacote}
                >
                  <Text style={styles.buttonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Modal de Produtos */}
      <Modal
        visible={mostrarModalProdutos}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setMostrarModalProdutos(false);
          setProdutosSelecionados([]);
          setQuantidadesProdutos({});
          setBuscaProduto('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setMostrarModalProdutos(false);
            setProdutosSelecionados([]);
            setQuantidadesProdutos({});
            setBuscaProduto('');
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar Produtos</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMostrarModalProdutos(false);
                    setProdutosSelecionados([]);
                    setQuantidadesProdutos({});
                    setBuscaProduto('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
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
                        <View style={styles.modalItemCheckbox}>
                          <Ionicons 
                            name={produtosSelecionados.some(p => p.id === produto.id) ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={theme.colors.primary} 
                          />
                        </View>
                        <Text style={styles.modalItemText}>{produto.nome}</Text>
                        <Text style={styles.modalItemPreco}>
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
                              <Ionicons name="remove" size={20} color={theme.colors.primary} />
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
                              <Ionicons name="add" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, produtosSelecionados.length === 0 && styles.buttonDisabled]}
                  onPress={handleAdicionarProdutos}
                  disabled={produtosSelecionados.length === 0}
                >
                  <Text style={[styles.buttonText, produtosSelecionados.length === 0 && styles.buttonTextDisabled]}>
                    Adicionar ao Pacote ({produtosSelecionados.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Serviços */}
      <Modal
        visible={mostrarModalServicos}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setMostrarModalServicos(false);
          setServicosSelecionados([]);
          setQuantidadesServicos({});
          setBuscaServico('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setMostrarModalServicos(false);
            setServicosSelecionados([]);
            setQuantidadesServicos({});
            setBuscaServico('');
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar Serviços</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMostrarModalServicos(false);
                    setServicosSelecionados([]);
                    setQuantidadesServicos({});
                    setBuscaServico('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
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
                        <View style={styles.modalItemCheckbox}>
                          <Ionicons 
                            name={servicosSelecionados.some(s => s.id === servico.id) ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={theme.colors.primary} 
                          />
                        </View>
                        <Text style={styles.modalItemText}>{servico.nome}</Text>
                        <Text style={styles.modalItemPreco}>
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
                              <Ionicons name="remove" size={20} color={theme.colors.primary} />
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
                              <Ionicons name="add" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, servicosSelecionados.length === 0 && styles.buttonDisabled]}
                  onPress={handleAdicionarServicos}
                  disabled={servicosSelecionados.length === 0}
                >
                  <Text style={[styles.buttonText, servicosSelecionados.length === 0 && styles.buttonTextDisabled]}>
                    Adicionar ao Pacote ({servicosSelecionados.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
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
    color: '#111827',
  },
  listContent: {
    padding: 16,
  },
  pacoteCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#111827',
    marginBottom: 4,
  },
  pacoteValores: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valorOriginalText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  descontoText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  valorFinalText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    position: 'relative',
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
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    backgroundColor: colors.surface,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.background,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: 8,
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
    color: '#111827',
    marginBottom: 4,
  },
  itemQuantidade: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  removeButton: {
    padding: 8,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelecionado: {
    backgroundColor: '#EDE9FE',
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
    color: '#111827',
  },
  modalItemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
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
    color: '#111827',
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 40,
  },
  quantidadeButton: {
    padding: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
  modalOverlayTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    color: '#111827',
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
  itemNomeCompacto: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  itemPrecoCompacto: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  modalItemCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
}); 