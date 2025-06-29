import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, PanResponder, Animated, ActivityIndicator, TextStyle, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface ProdutoPacote {
  id: string;
  pacote_id: string;
  produto_id: string;
  quantidade: number;
  produto?: {
    nome: string;
    preco: number;
  };
}

interface ServicoPacote {
  id: string;
  pacote_id: string;
  servico_id: string;
  quantidade: number;
  servico?: {
    nome: string;
    preco: number;
  };
}

interface Pacote {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  desconto: number;
  data_cadastro: string;
  user_id: string;
  produtos?: ProdutoPacote[];
  servicos?: ServicoPacote[];
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
}

interface ProdutoPacoteData {
  produto: {
    id: string;
    nome: string;
    preco: number;
  };
  quantidade: number;
}

interface ServicoPacoteData {
  servico: {
    id: string;
    nome: string;
    preco: number;
  };
  quantidade: number;
}

export default function PacotesScreen() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pacoteEmEdicao, setPacoteEmEdicao] = useState<Pacote | null>(null);
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
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [mostrarModalProdutos, setMostrarModalProdutos] = useState(false);
  const [mostrarModalServicos, setMostrarModalServicos] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<Produto[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<Servico[]>([]);
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<{ [key: string]: string }>({});
  const [quantidadesServicos, setQuantidadesServicos] = useState<{ [key: string]: string }>({});
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaServico, setBuscaServico] = useState('');
  const [pacoteId, setPacoteId] = useState<string>('');
  const { session } = useAuth();

  useEffect(() => {
    carregarPacotes();
    carregarProdutos();
    carregarServicos();

    const subscription = DeviceEventEmitter.addListener('addPacote', () => {
      handleNovoPacote();
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
        console.error('Usuário não autenticado');
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
        .eq('user_id', session.user.id)
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
      console.error('Erro ao carregar pacotes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os pacotes');
    } finally {
      setLoading(false);
    }
  };

  const carregarProdutos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.error('Usuário não autenticado');
        Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login novamente.');
        router.replace('/(auth)/login');
        return;
      }

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco')
        .eq('user_id', session.user.id)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    }
  };

  const carregarServicos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, preco')
        .eq('user_id', session.user.id)
        .order('nome');

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
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

  const handleEditarPacote = (pacote: Pacote) => {
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

  const handleExcluirPacote = async (pacote: Pacote) => {
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
              console.error('Erro ao excluir pacote:', error);
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

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const pacoteData = {
        nome: novoPacote.nome.trim(),
        descricao: novoPacote.descricao.trim(),
        valor: parseFloat(novoPacote.valor.replace(',', '.')),
        desconto: parseFloat(novoPacote.desconto.replace(',', '.')),
        user_id: session.user.id
      };

      let pacoteId;

      if (pacoteEmEdicao) {
        const { error } = await supabase
          .from('pacotes')
          .update(pacoteData)
          .eq('id', pacoteEmEdicao.id);

        if (error) throw error;
        pacoteId = pacoteEmEdicao.id;

        // Remover produtos e serviços existentes
        await Promise.all([
          supabase.from('pacotes_produtos').delete().eq('pacote_id', pacoteId),
          supabase.from('pacotes_servicos').delete().eq('pacote_id', pacoteId)
        ]);
      } else {
        const { data, error } = await supabase
          .from('pacotes')
          .insert([pacoteData])
          .select();

        if (error) throw error;
        pacoteId = data[0].id;
      }

      // Inserir produtos
      if (novoPacote.produtos.length > 0) {
        const produtosData = novoPacote.produtos.map(produto => ({
          pacote_id: pacoteId,
          produto_id: produto.produto_id,
          quantidade: produto.quantidade,
          user_id: session.user.id
        }));

        const { error: produtosError } = await supabase
          .from('pacotes_produtos')
          .insert(produtosData);

        if (produtosError) throw produtosError;
      }

      // Inserir serviços
      if (novoPacote.servicos.length > 0) {
        const servicosData = novoPacote.servicos.map(servico => ({
          pacote_id: pacoteId,
          servico_id: servico.servico_id,
          quantidade: servico.quantidade,
          user_id: session.user.id
        }));

        const { error: servicosError } = await supabase
          .from('pacotes_servicos')
          .insert(servicosData);

        if (servicosError) throw servicosError;
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
      
      Alert.alert('Sucesso', 'Pacote salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar pacote:', error);
      Alert.alert('Erro', 'Não foi possível salvar o pacote');
    }
  };

  const handleSelecionarProduto = (produto: Produto) => {
    setProdutosSelecionados(prev => {
      const jaSelecionado = prev.find(p => p.id === produto.id);
      if (jaSelecionado) {
        return prev.filter(p => p.id !== produto.id);
      }
      return [...prev, produto];
    });
  };

  const handleSelecionarServico = (servico: Servico) => {
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
      console.error('Erro ao adicionar produtos:', error);
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

  const handleMostrarModalProdutos = () => {
    setMostrarModalProdutos(true);
  };

  const renderItem = ({ item }: { item: Pacote }) => (
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
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar pacotes..."
          placeholderTextColor="#9CA3AF"
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
              <ActivityIndicator size="large" color="#7C3AED" />
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
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={novoPacote.descricao}
                      onChangeText={(text) => setNovoPacote({ ...novoPacote, descricao: text })}
                      placeholder="Digite a descrição do pacote"
                      placeholderTextColor="#9CA3AF"
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
                      <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
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
                          <Ionicons name="trash-outline" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Serviços</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setMostrarModalServicos(true)}
                    >
                      <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
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
                          <Ionicons name="trash-outline" size={20} color="#DC2626" />
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
                        placeholderTextColor="#9CA3AF"
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
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    </TouchableWithoutFeedback>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Valor final</Text>
                    <View style={[styles.valorFinalContainer, styles.valorInput, styles.valorFinalInput]}>
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
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchModalContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchModalInput}
                  value={buscaProduto}
                  onChangeText={setBuscaProduto}
                  placeholder="Buscar produtos..."
                  placeholderTextColor="#9CA3AF"
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
                            color="#7C3AED" 
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
                              <Ionicons name="remove" size={20} color="#7C3AED" />
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
                              <Ionicons name="add" size={20} color="#7C3AED" />
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
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchModalContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchModalInput}
                  value={buscaServico}
                  onChangeText={setBuscaServico}
                  placeholder="Buscar serviços..."
                  placeholderTextColor="#9CA3AF"
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
                            color="#7C3AED" 
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
                              <Ionicons name="remove" size={20} color="#7C3AED" />
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
                              <Ionicons name="add" size={20} color="#7C3AED" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    padding: 16,
  },
  pacoteCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#7C3AED',
  },
  descontoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  valorFinalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  pacoteDescricao: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
    color: '#374151',
  } as TextStyle,
  valorInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    height: 44,
  } as TextStyle,
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
    borderTopColor: '#E5E7EB',
    gap: 12,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#7C3AED',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#7C3AED',
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
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7C3AED',
    marginLeft: 8,
  },
  itemLista: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#6B7280',
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
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
    borderBottomColor: '#E5E7EB',
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
    color: '#7C3AED',
  },
  quantidadeInputContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantidadeLabel: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  quantidadeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
    color: '#9CA3AF',
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
  valorFinalInput: {
    fontSize: 22,
  } as TextStyle,
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchModalInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalSubHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  secaoLista: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    color: '#6B7280',
    flex: 1,
  },
  itemPrecoCompacto: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
    marginLeft: 8,
  },
  modalItemCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
}); 