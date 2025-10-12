import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, PanResponder, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { DeviceEventEmitter } from 'react-native';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  quantidade: number;
  preco: number;
  codigo: string;
  data_cadastro: string;
  categoria_id: string;
  fornecedor_id: string;
  marca_id: string;
  categoria?: {
    nome: string;
  };
  fornecedor?: {
    nome: string;
  };
  marca?: {
    nome: string;
  };
  quantidade_minima?: number;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Marca {
  id: string;
  nome: string;
}

type FiltroTab = 'estoque' | 'categorias' | 'fornecedores' | 'marcas';

export default function EstoqueScreen() {
  const { estabelecimentoId } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'baixo' | 'zerado'>('todos');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  const [marcaSelecionada, setMarcaSelecionada] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | null>(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [filtroTabAtiva, setFiltroTabAtiva] = useState<FiltroTab>('estoque');
  const [modalOffset, setModalOffset] = useState(0);
  const [modalTab, setModalTab] = useState<'categorias' | 'marcas'>('categorias');
  const [novaMarca, setNovaMarca] = useState('');
  const [marcaEmEdicao, setMarcaEmEdicao] = useState<Marca | null>(null);
  const [slideAnimation] = useState(new Animated.Value(400));
  const [overlayOpacity] = useState(new Animated.Value(0));

  const abrirModal = React.useCallback(async () => {
    await Promise.all([
      carregarCategorias(),
      carregarMarcas()
    ]);
    setMostrarCategorias(true);
  }, []);

  useEffect(() => {
    if (mostrarCategorias) {
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
  }, [mostrarCategorias]);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('addCategoriaProduto', () => {
      setMostrarCategorias(true);
    });
    return () => listener.remove();
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        const newValue = gestureState.dy / 400;
        slideAnimation.setValue(newValue * 400);
        overlayOpacity.setValue(1 - newValue);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 50 || gestureState.vy > 0.5) {
        setMostrarCategorias(false);
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

  const carregarDados = async () => {
    await Promise.all([
      carregarCategorias(),
      carregarFornecedores(),
      carregarMarcas()
    ]);
  };

  const carregarCategorias = async () => {
    try {
      console.log('Iniciando carregamento de categorias...');
      
      if (!estabelecimentoId) {
        console.error('Estabelecimento não identificado');
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      const { data, error } = await supabase
        .from('categorias_produtos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar categorias:', error);
        throw error;
      }

      console.log('Categorias carregadas com sucesso:', data);
      if (data) {
        setCategorias(data);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const carregarFornecedores = async () => {
    try {
      if (!estabelecimentoId) {
        console.error('Estabelecimento não identificado');
        return;
      }
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const carregarMarcas = async () => {
    try {
      if (!estabelecimentoId) {
        console.error('Estabelecimento não identificado');
        return;
      }
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setMarcas(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
    }
  };

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      
      if (!estabelecimentoId) {
        console.error('Estabelecimento não identificado');
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      let query = supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias_produtos(nome),
          fornecedor:fornecedores(nome),
          marca:marcas(nome)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      // Aplicar filtros
      if (filtroAtivo === 'baixo') {
        query = query.lte('quantidade', 5);
      } else if (filtroAtivo === 'zerado') {
        query = query.eq('quantidade', 0);
      }

      if (categoriaSelecionada) {
        query = query.eq('categoria_id', categoriaSelecionada);
      }

      if (fornecedorSelecionado) {
        query = query.eq('fornecedor_id', fornecedorSelecionado);
      }

      if (marcaSelecionada) {
        query = query.eq('marca_id', marcaSelecionada);
      }

      const { data: produtos, error } = await query;

      if (error) {
        console.error('Erro ao carregar produtos:', error);
        throw error;
      }

      console.log('Produtos carregados:', produtos); // Log para debug

      // Filtrar por busca
      const produtosFiltrados = produtos ? produtos.filter(produto =>
        produto.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        produto.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        produto.categoria?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        produto.fornecedor?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        produto.marca?.nome.toLowerCase().includes(searchQuery.toLowerCase())
      ) : [];

      setProdutos(produtosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [searchQuery, filtroAtivo, categoriaSelecionada, fornecedorSelecionado, marcaSelecionada]);

  const limparFiltros = () => {
    setFiltroAtivo('todos');
    setCategoriaSelecionada(null);
    setFornecedorSelecionado(null);
    setMarcaSelecionada(null);
    setSearchQuery('');
    setFiltroTabAtiva('estoque');
  };

  const renderFiltros = () => {
    const temFiltroAtivo = 
      filtroAtivo !== 'todos' || 
      categoriaSelecionada !== null || 
      fornecedorSelecionado !== null || 
      marcaSelecionada !== null ||
      searchQuery !== '';

    console.log('Estado dos filtros:', {
      filtroAtivo,
      categoriaSelecionada,
      fornecedorSelecionado,
      marcaSelecionada,
      searchQuery,
      temFiltroAtivo
    });

    return (
      <View style={styles.filtrosContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar produtos..."
            placeholderTextColor="#9CA3AF"
          />
          {temFiltroAtivo && (
            <TouchableOpacity 
              onPress={limparFiltros} 
              style={styles.limparFiltros}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.limparFiltrosTexto}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              filtroTabAtiva === 'estoque' && styles.tabAtiva
            ]}
            onPress={() => setFiltroTabAtiva('estoque')}
          >
            <Text style={[
              styles.tabText,
              filtroTabAtiva === 'estoque' && styles.tabTextAtivo
            ]}>Estoque</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              filtroTabAtiva === 'categorias' && styles.tabAtiva
            ]}
            onPress={() => setFiltroTabAtiva('categorias')}
          >
            <Text style={[
              styles.tabText,
              filtroTabAtiva === 'categorias' && styles.tabTextAtivo
            ]}>Categorias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              filtroTabAtiva === 'fornecedores' && styles.tabAtiva
            ]}
            onPress={() => setFiltroTabAtiva('fornecedores')}
          >
            <Text style={[
              styles.tabText,
              filtroTabAtiva === 'fornecedores' && styles.tabTextAtivo
            ]}>Fornecedores</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              filtroTabAtiva === 'marcas' && styles.tabAtiva
            ]}
            onPress={() => setFiltroTabAtiva('marcas')}
          >
            <Text style={[
              styles.tabText,
              filtroTabAtiva === 'marcas' && styles.tabTextAtivo
            ]}>Marcas</Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosScroll}
        >
          {filtroTabAtiva === 'estoque' && (
            <View style={styles.filtrosRow}>
              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  filtroAtivo === 'todos' && styles.filtroChipAtivo
                ]}
                onPress={() => setFiltroAtivo('todos')}
              >
                <Text style={[
                  styles.filtroChipText,
                  filtroAtivo === 'todos' && styles.filtroChipTextAtivo
                ]}>Todos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  filtroAtivo === 'baixo' && styles.filtroChipAtivo
                ]}
                onPress={() => setFiltroAtivo('baixo')}
              >
                <Text style={[
                  styles.filtroChipText,
                  filtroAtivo === 'baixo' && styles.filtroChipTextAtivo
                ]}>Estoque Baixo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  filtroAtivo === 'zerado' && styles.filtroChipAtivo
                ]}
                onPress={() => setFiltroAtivo('zerado')}
              >
                <Text style={[
                  styles.filtroChipText,
                  filtroAtivo === 'zerado' && styles.filtroChipTextAtivo
                ]}>Zerado</Text>
              </TouchableOpacity>
            </View>
          )}

          {filtroTabAtiva === 'categorias' && (
            <View style={styles.filtrosRow}>
              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  !categoriaSelecionada && styles.filtroChipAtivo
                ]}
                onPress={() => setCategoriaSelecionada(null)}
              >
                <Text style={[
                  styles.filtroChipText,
                  !categoriaSelecionada && styles.filtroChipTextAtivo
                ]}>Todas</Text>
              </TouchableOpacity>

              {categorias.map(categoria => (
                <TouchableOpacity
                  key={categoria.id}
                  style={[
                    styles.filtroChip,
                    categoriaSelecionada === categoria.id && styles.filtroChipAtivo
                  ]}
                  onPress={() => setCategoriaSelecionada(categoria.id)}
                >
                  <Text style={[
                    styles.filtroChipText,
                    categoriaSelecionada === categoria.id && styles.filtroChipTextAtivo
                  ]}>{categoria.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filtroTabAtiva === 'fornecedores' && (
            <View style={styles.filtrosRow}>
              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  !fornecedorSelecionado && styles.filtroChipAtivo
                ]}
                onPress={() => setFornecedorSelecionado(null)}
              >
                <Text style={[
                  styles.filtroChipText,
                  !fornecedorSelecionado && styles.filtroChipTextAtivo
                ]}>Todos</Text>
              </TouchableOpacity>

              {fornecedores.map(fornecedor => (
                <TouchableOpacity
                  key={fornecedor.id}
                  style={[
                    styles.filtroChip,
                    fornecedorSelecionado === fornecedor.id && styles.filtroChipAtivo
                  ]}
                  onPress={() => setFornecedorSelecionado(fornecedor.id)}
                >
                  <Text style={[
                    styles.filtroChipText,
                    fornecedorSelecionado === fornecedor.id && styles.filtroChipTextAtivo
                  ]}>{fornecedor.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filtroTabAtiva === 'marcas' && (
            <View style={styles.filtrosRow}>
              <TouchableOpacity
                style={[
                  styles.filtroChip,
                  !marcaSelecionada && styles.filtroChipAtivo
                ]}
                onPress={() => setMarcaSelecionada(null)}
              >
                <Text style={[
                  styles.filtroChipText,
                  !marcaSelecionada && styles.filtroChipTextAtivo
                ]}>Todas</Text>
              </TouchableOpacity>

              {marcas.map(marca => (
                <TouchableOpacity
                  key={marca.id}
                  style={[
                    styles.filtroChip,
                    marcaSelecionada === marca.id && styles.filtroChipAtivo
                  ]}
                  onPress={() => setMarcaSelecionada(marca.id)}
                >
                  <Text style={[
                    styles.filtroChipText,
                    marcaSelecionada === marca.id && styles.filtroChipTextAtivo
                  ]}>{marca.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const getStatusEstoque = (quantidade: number, quantidade_minima: number) => {
    if (quantidade === 0) return { cor: '#EF4444', texto: 'Zerado', background: '#FEE2E2' };
    if (quantidade <= quantidade_minima) return { cor: '#EF4444', texto: 'Abaixo do Mínimo', background: '#FEE2E2' };
    if (quantidade <= 5) return { cor: '#F59E0B', texto: 'Baixo', background: '#FFFFFF' };
    return { cor: '#10B981', texto: 'Normal', background: '#FFFFFF' };
  };

  const handleNovoProduto = () => {
    router.push('/estoque/novo');
  };

  const handleEditarProduto = (produto: Produto) => {
    router.push(`/estoque/${produto.id}`);
  };

  const handleSalvarCategoria = async () => {
    try {
      if (!novaCategoria.trim()) {
        Alert.alert('Erro', 'O nome da categoria é obrigatório');
        return;
      }

      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      if (categoriaEmEdicao) {
        const { error } = await supabase
          .from('categorias_produtos')
          .update({ 
            nome: novaCategoria.trim()
          })
          .eq('id', categoriaEmEdicao.id)
          .eq('estabelecimento_id', estabelecimentoId);

        if (error) {
          console.error('Erro detalhado:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('categorias_produtos')
          .insert({ 
            nome: novaCategoria.trim(),
            estabelecimento_id: estabelecimentoId
          })
          .select();

        if (error) {
          console.error('Erro detalhado:', error);
          throw error;
        }
      }

      await carregarCategorias();
      setNovaCategoria('');
      setCategoriaEmEdicao(null);
      setMostrarCategorias(false);
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', `Não foi possível salvar a categoria: ${error.message || error}`);
    }
  };

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaEmEdicao(categoria);
    setNovaCategoria(categoria.nome);
  };

  const handleExcluirCategoria = async (categoria: Categoria) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta categoria?',
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
              if (!estabelecimentoId) {
                Alert.alert('Erro', 'Estabelecimento não identificado');
                return;
              }

              const { error } = await supabase
                .from('categorias_produtos')
                .delete()
                .eq('id', categoria.id)
                .eq('estabelecimento_id', estabelecimentoId);

              if (error) throw error;

              await carregarCategorias();
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            }
          },
        },
      ]
    );
  };

  const handleSalvarMarca = async () => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      if (marcaEmEdicao) {
        const { error } = await supabase
          .from('marcas')
          .update({ nome: novaMarca })
          .eq('id', marcaEmEdicao.id)
          .eq('estabelecimento_id', estabelecimentoId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marcas')
          .insert([
            { nome: novaMarca, estabelecimento_id: estabelecimentoId }
          ]);

        if (error) throw error;
      }

      setNovaMarca('');
      setMarcaEmEdicao(null);
      await carregarMarcas();
      Alert.alert('Sucesso', marcaEmEdicao ? 'Marca atualizada com sucesso!' : 'Marca cadastrada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      Alert.alert('Erro', 'Não foi possível salvar a marca');
    }
  };

  const handleEditarMarca = (marca: Marca) => {
    setMarcaEmEdicao(marca);
    setNovaMarca(marca.nome);
  };

  const handleExcluirMarca = async (marca: Marca) => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', marca.id)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      await carregarMarcas();
      Alert.alert('Sucesso', 'Marca excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir marca:', error);
      Alert.alert('Erro', 'Não foi possível excluir a marca');
    }
  };

  const renderItem = ({ item }: { item: Produto }) => {
    const status = getStatusEstoque(item.quantidade, item.quantidade_minima || 0);
    
    return (
      <TouchableOpacity 
        style={[styles.produtoCard, { backgroundColor: status.background }]}
        onPress={() => handleEditarProduto(item)}
      >
        <View style={styles.produtoHeader}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome}>{item.nome}</Text>
            <Text style={styles.produtoCodigo}>Código: {item.codigo}</Text>
            {item.categoria && (
              <Text style={styles.produtoCategoria}>{item.categoria.nome}</Text>
            )}
          </View>
          <View style={[styles.statusContainer, { backgroundColor: `${status.cor}20` }]}>
            <Text style={[styles.statusText, { color: status.cor }]}>
              {status.texto}
            </Text>
          </View>
        </View>
        
        <Text style={styles.produtoDescricao} numberOfLines={2}>
          {item.descricao}
        </Text>
        
        <View style={styles.produtoFooter}>
          <View style={styles.produtoDetalhes}>
            <Text style={styles.produtoQuantidade}>
              Quantidade: {item.quantidade}
            </Text>
            <Text style={styles.produtoPreco}>
              {item.preco.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderFiltros()}
      
      <FlatList
        data={produtos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={carregarProdutos}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </View>
          )
        }
      />

      <Modal
        visible={mostrarCategorias}
        transparent={true}
        animationType="none"
        onRequestClose={() => setMostrarCategorias(false)}
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
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMostrarCategorias(false)}
          >
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
              <View style={styles.modalContent}>
                <View 
                  {...panResponder.panHandlers}
                  style={styles.modalHeader}
                >
                  <View style={styles.modalDragIndicator} />
                  <Text style={styles.modalTitle}>Gerenciar {modalTab === 'categorias' ? 'Categorias' : 'Marcas'}</Text>
                </View>

                <View style={styles.modalTabs}>
                  <TouchableOpacity 
                    style={[styles.modalTab, modalTab === 'categorias' && styles.modalTabAtiva]}
                    onPress={() => setModalTab('categorias')}
                  >
                    <Text style={[styles.modalTabText, modalTab === 'categorias' && styles.modalTabTextAtiva]}>
                      Categorias
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalTab, modalTab === 'marcas' && styles.modalTabAtiva]}
                    onPress={() => setModalTab('marcas')}
                  >
                    <Text style={[styles.modalTabText, modalTab === 'marcas' && styles.modalTabTextAtiva]}>
                      Marcas
                    </Text>
                  </TouchableOpacity>
                </View>

                {modalTab === 'categorias' ? (
                  <>
                    <View style={styles.categoriaForm}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nome da categoria"
                        value={novaCategoria}
                        onChangeText={setNovaCategoria}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.button}
                        onPress={handleSalvarCategoria}
                      >
                        <Text style={styles.buttonText}>
                          {categoriaEmEdicao ? 'Atualizar' : 'Adicionar'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.categoriasContainer}>
                      <Text style={styles.sectionTitle}>Categorias Existentes</Text>
                      <ScrollView 
                        style={styles.categoriasList}
                        contentContainerStyle={styles.categoriasListContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {categorias && categorias.length > 0 ? (
                          categorias.map((item) => (
                            <TouchableOpacity 
                              key={item.id} 
                              style={styles.categoriaItem}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.categoriaNome}>{item.nome}</Text>
                              <View style={styles.categoriaActions}>
                                <TouchableOpacity 
                                  onPress={() => handleEditarCategoria(item)}
                                  style={styles.actionButton}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="pencil" size={20} color="#7C3AED" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => handleExcluirCategoria(item)}
                                  style={styles.actionButton}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="trash" size={20} color="#DC2626" />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>Nenhuma categoria cadastrada</Text>
                        )}
                      </ScrollView>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.categoriaForm}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nome da marca"
                        value={novaMarca}
                        onChangeText={setNovaMarca}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.button}
                        onPress={handleSalvarMarca}
                      >
                        <Text style={styles.buttonText}>
                          {marcaEmEdicao ? 'Atualizar' : 'Adicionar'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.categoriasContainer}>
                      <Text style={styles.sectionTitle}>Marcas Existentes</Text>
                      <ScrollView 
                        style={styles.categoriasList}
                        contentContainerStyle={styles.categoriasListContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {marcas && marcas.length > 0 ? (
                          marcas.map((item) => (
                            <TouchableOpacity 
                              key={item.id} 
                              style={styles.categoriaItem}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.categoriaNome}>{item.nome}</Text>
                              <View style={styles.categoriaActions}>
                                <TouchableOpacity 
                                  onPress={() => handleEditarMarca(item)}
                                  style={styles.actionButton}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="pencil" size={20} color="#7C3AED" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => handleExcluirMarca(item)}
                                  style={styles.actionButton}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="trash" size={20} color="#DC2626" />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>Nenhuma marca cadastrada</Text>
                        )}
                      </ScrollView>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
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
  limparFiltros: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  limparFiltrosTexto: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabAtiva: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextAtivo: {
    color: '#FFFFFF',
  },
  filtrosScroll: {
    paddingHorizontal: 16,
  },
  filtrosRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  filtroChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filtroChipAtivo: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  filtroChipText: {
    fontSize: 14,
    color: '#374151',
  },
  filtroChipTextAtivo: {
    color: '#7C3AED',
  },
  listContent: {
    padding: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  produtoCard: {
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
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  produtoCodigo: {
    fontSize: 14,
    color: '#6B7280',
  },
  produtoCategoria: {
    fontSize: 14,
    color: '#7C3AED',
    marginTop: 4,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  produtoDescricao: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  produtoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  produtoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  produtoQuantidade: {
    fontSize: 14,
    color: '#111827',
    marginRight: 16,
  },
  produtoPreco: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
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
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingBottom: 20,
  },
  modalHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    paddingHorizontal: 20,
    width: '100%',
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
  modalTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalTabAtiva: {
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  modalTabText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalTabTextAtiva: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  categoriaForm: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoriasContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoriasList: {
    flex: 1,
  },
  categoriasListContent: {
    paddingBottom: 20,
  },
  categoriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriaNome: {
    fontSize: 16,
    color: '#111827',
  },
  categoriaActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 