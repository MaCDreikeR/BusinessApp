import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, DeviceEventEmitter, ScrollView, Animated, PanResponder, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColor } from '../../hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Servico {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria_id: string | null;
  descricaoServico?: string;
  categoria?: {
    nome: string;
  };
}

interface Categoria {
  id: string;
  nome: string;
}

export default function ServicosScreen() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('0,00');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [showCategorias, setShowCategorias] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | null>(null);
  const [mostrarModalCategorias, setMostrarModalCategorias] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const [slideAnimation] = useState(new Animated.Value(400));
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [nomeServico, setNomeServico] = useState('');
  const [precoServico, setPrecoServico] = useState('');
  const [categoriaServico, setCategoriaServico] = useState('');
  const [nomeCategoria, setNomeCategoria] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  useEffect(() => {
    if (mostrarModalCategorias) {
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
  }, [mostrarModalCategorias]);

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
        setMostrarModalCategorias(false);
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

  useEffect(() => {
    carregarServicos();
    carregarCategorias();

    const subscription = DeviceEventEmitter.addListener('addServico', () => {
      setServicoEditando(null);
      setNomeServico('');
      setPrecoServico('');
      setCategoriaServico('');
      setModalVisible(true);
    });

    const subscriptionCategorias = DeviceEventEmitter.addListener('abrirModalCategorias', () => {
      setCategoriaEditando(null);
      setNomeCategoria('');
      setMostrarModalCategorias(true);
    });

    return () => {
      subscription.remove();
      subscriptionCategorias.remove();
    };
  }, []);

  const carregarCategorias = async () => {
    try {
      setLoadingCategorias(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Você precisa estar autenticado para visualizar as categorias');
        return;
      }

      const { data, error } = await supabase
        .from('categorias_servicos')
        .select('*')
        .eq('user_id', user.id)
        .order('nome')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar categorias:', error);
        Alert.alert('Erro', 'Não foi possível carregar as categorias. Por favor, tente novamente.');
        return;
      }

      console.log(`${data?.length || 0} categorias carregadas com sucesso`);
      setCategorias(data || []);
      
      // Cache dos resultados para uso offline
      await AsyncStorage.setItem('@BusinessApp:categorias', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      
      // Tentar carregar do cache em caso de erro
      try {
        const cachedData = await AsyncStorage.getItem('@BusinessApp:categorias');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setCategorias(parsedData);
          Alert.alert('Aviso', 'Usando dados salvos localmente. Alguns dados podem estar desatualizados.');
        } else {
          Alert.alert('Erro', 'Não foi possível carregar as categorias e não há dados salvos.');
        }
      } catch (cacheError) {
        Alert.alert('Erro', 'Não foi possível carregar as categorias');
      }
    } finally {
      setLoadingCategorias(false);
    }
  };

  const carregarServicos = async () => {
    try {
      console.log('Iniciando carregamento de serviços...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('servicos')
        .select(`
          *,
          categoria:categorias_servicos(nome)
        `)
        .eq('user_id', user.id)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar serviços:', error);
        throw error;
      }
      
      console.log('Serviços carregados:', data);
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      Alert.alert('Erro', 'Não foi possível carregar os serviços');
    } finally {
      setLoading(false);
    }
  };

  const formatarPreco = (valor: string) => {
    const numericValue = valor.replace(/[^0-9]/g, '');
    
    const floatValue = parseFloat(numericValue) / 100;
    
    return floatValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePrecoChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setPrecoServico(numericValue);
  };

  const handleSalvarServico = async () => {
    if (!nomeServico || !precoServico || !categoriaServico) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        return;
      }

    try {
      console.log('Iniciando salvamento de serviço...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Dados do serviço:', {
        nome: nomeServico,
        preco: precoServico,
        categoria_id: categoriaServico,
        descricao: descricaoServico,
        user_id: user.id
      });

      const precoNumerico = parseFloat(precoServico) / 100;

      if (servicoEditando) {
        console.log('Atualizando serviço existente:', servicoEditando.id);
        const { data, error } = await supabase
          .from('servicos')
          .update({
            nome: nomeServico,
            preco: precoNumerico,
            categoria_id: categoriaServico,
            descricao: descricaoServico,
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', servicoEditando.id);

        if (error) {
          console.error('Erro detalhado ao atualizar serviço:', error);
          throw error;
        }
        console.log('Serviço atualizado com sucesso:', data);
      } else {
        console.log('Criando novo serviço');
        const { data, error } = await supabase
          .from('servicos')
          .insert({
            nome: nomeServico,
            preco: precoNumerico,
            categoria_id: categoriaServico,
            descricao: descricaoServico,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) {
          console.error('Erro detalhado ao criar serviço:', error);
          throw error;
        }
        console.log('Serviço criado com sucesso:', data);
      }

      console.log('Serviço salvo com sucesso');
      setModalVisible(false);
      await carregarServicos();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      let mensagemErro = 'Não foi possível salvar o serviço';
      
      if (error.message === 'Usuário não autenticado') {
        mensagemErro = 'Você precisa estar autenticado para criar/editar serviços';
      } else if (error.code === '23502') {
        mensagemErro = 'Erro: O ID do usuário é obrigatório';
      } else if (error.message) {
        mensagemErro = `Erro: ${error.message}`;
      }
      
      Alert.alert('Erro', mensagemErro);
    }
  };

  const handleExcluirServico = async (servico: Servico) => {
    try {
      const { data: orcamentosAprovados, error: errorOrcamentosAprovados } = await supabase
        .from('orcamento_itens')
        .select('id, orcamento:orcamentos(status)')
        .eq('servico_id', servico.id)
        .eq('orcamento.status', 'Aprovado');

      if (errorOrcamentosAprovados) {
        console.error('Erro ao verificar orçamentos aprovados:', errorOrcamentosAprovados);
        throw errorOrcamentosAprovados;
      }

      const { data: orcamentosPendentes, error: errorOrcamentosPendentes } = await supabase
        .from('orcamento_itens')
        .select('id, orcamento:orcamentos(status)')
        .eq('servico_id', servico.id)
        .eq('orcamento.status', 'Pendente');

      if (errorOrcamentosPendentes) {
        console.error('Erro ao verificar orçamentos pendentes:', errorOrcamentosPendentes);
        throw errorOrcamentosPendentes;
      }

      const { data: comandasAbertas, error: errorComandas } = await supabase
        .from('comanda_itens')
        .select('id, comanda:comandas(status)')
        .eq('servico_id', servico.id)
        .eq('comanda.status', 'Aberta');

      if (errorComandas) {
        console.error('Erro ao verificar comandas:', errorComandas);
        throw errorComandas;
      }

      const { data: agendamentos, error: errorAgendamentos } = await supabase
        .from('agendamento_servicos')
        .select('id, agendamento:agendamentos(status)')
        .eq('servico_id', servico.id)
        .in('agendamento.status', ['Agendado', 'Confirmado']);

      if (errorAgendamentos) {
        console.error('Erro ao verificar agendamentos:', errorAgendamentos);
        throw errorAgendamentos;
      }

      const impedimentos = [];
      if (orcamentosAprovados && orcamentosAprovados.length > 0) {
        impedimentos.push('orçamentos aprovados');
      }
      if (orcamentosPendentes && orcamentosPendentes.length > 0) {
        impedimentos.push('orçamentos pendentes');
      }
      if (comandasAbertas && comandasAbertas.length > 0) {
        impedimentos.push('comandas abertas');
      }
      if (agendamentos && agendamentos.length > 0) {
        impedimentos.push('agendamentos marcados');
      }

      if (impedimentos.length > 0) {
        Alert.alert(
          'Não é possível excluir',
          `Este serviço está sendo usado em ${impedimentos.join(', ')}. Remova-o de todas as ocorrências antes de excluí-lo.`
        );
        return;
      }

      Alert.alert(
        'Confirmar exclusão',
        `Deseja realmente excluir o serviço ${servico.nome}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Iniciando exclusão do serviço:', servico.id);
                
        const { error } = await supabase
          .from('servicos')
          .delete()
                    .eq('id', servico.id);

                if (error) {
                  console.error('Erro ao excluir serviço:', error);
                  throw error;
                }

                console.log('Serviço excluído com sucesso');
                await carregarServicos();
      } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        Alert.alert('Erro', 'Não foi possível excluir o serviço');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao verificar impedimentos:', error);
      Alert.alert('Erro', 'Não foi possível verificar se o serviço está em uso');
    }
  };

  const handleSalvarCategoria = async () => {
    if (!nomeCategoria) {
      Alert.alert('Erro', 'Preencha o nome da categoria');
      return;
    }

    try {
      console.log('Iniciando salvamento de categoria...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (categoriaEditando) {
        console.log('Atualizando categoria existente:', categoriaEditando.id);
        const { data, error } = await supabase
          .from('categorias_servicos')
          .update({
            nome: nomeCategoria,
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', categoriaEditando.id);

        if (error) throw error;
        console.log('Categoria atualizada com sucesso:', data);
      } else {
        console.log('Criando nova categoria');
        const { data, error } = await supabase
          .from('categorias_servicos')
          .insert({
            nome: nomeCategoria,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        console.log('Categoria criada com sucesso:', data);
      }

      setNomeCategoria('');
      setCategoriaEditando(null);
      setMostrarModalCategorias(false);
      carregarCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria');
    }
  };

  const handleExcluirCategoria = async (categoria: Categoria) => {
    try {
      const { data: servicosComCategoria, error: errorCheck } = await supabase
        .from('servicos')
        .select('id')
        .eq('categoria_id', categoria.id);

      if (errorCheck) throw errorCheck;

      if (servicosComCategoria && servicosComCategoria.length > 0) {
        Alert.alert(
          'Não é possível excluir',
          'Esta categoria está sendo usada por um ou mais serviços. Remova a categoria dos serviços primeiro.'
        );
        return;
      }

      Alert.alert(
        'Confirmar exclusão',
        `Deseja realmente excluir a categoria ${categoria.nome}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error: errorDelete } = await supabase
                  .from('categorias_servicos')
                  .delete()
                  .eq('id', categoria.id);

                if (errorDelete) throw errorDelete;

                console.log('Categoria excluída com sucesso');
                carregarCategorias();
              } catch (error) {
                console.error('Erro ao excluir categoria:', error);
                Alert.alert('Erro', 'Não foi possível excluir a categoria');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao verificar uso da categoria:', error);
      Alert.alert('Erro', 'Não foi possível verificar se a categoria pode ser excluída');
    }
  };

  const renderItem = ({ item }: { item: Servico }) => (
    <View style={[styles.servicoItem, { backgroundColor }]}>
      <TouchableOpacity style={styles.servicoInfo} onPress={() => {
        setServicoEditando(item);
        setNomeServico(item.nome);
        setPrecoServico((item.preco * 100).toString());
        setCategoriaServico(item.categoria_id || '');
        setDescricaoServico(item.descricao || '');
        setModalVisible(true);
      }}>
        <ThemedText style={styles.servicoNome}>{item.nome}</ThemedText>
        <ThemedText style={styles.servicoDescricao}>{item.descricao}</ThemedText>
        <ThemedText style={styles.servicoPreco}>
          R$ {item.preco.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </ThemedText>
        {item.categoria && (
          <ThemedText style={styles.servicoCategoria}>{item.categoria.nome}</ThemedText>
        )}
      </TouchableOpacity>
      <View style={styles.servicoActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleExcluirServico(item)}
        >
          <Ionicons name="trash" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const servicosFiltrados = categoriaFiltro
    ? servicos.filter(servico => servico.categoria_id === categoriaFiltro)
    : servicos;

  const handleEditar = (servico: Servico) => {
    setEditingServico(servico);
    setNome(servico.nome);
    setDescricao(servico.descricao || '');
    setPreco(servico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCategoriaId(servico.categoria_id);
    carregarCategorias();
    setModalVisible(true);
  };

  const limparFormulario = () => {
    setEditingServico(null);
    setNome('');
    setDescricao('');
    setPreco('0,00');
    setCategoriaId(null);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar serviços..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtrosContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosScroll}
        >
          <TouchableOpacity
            style={[
              styles.filtroButton,
              !categoriaFiltro && styles.filtroButtonSelected
            ]}
            onPress={() => setCategoriaFiltro(null)}
          >
            <ThemedText style={[
              styles.filtroButtonText,
              !categoriaFiltro && styles.filtroButtonTextSelected
            ]}>
              Todos
            </ThemedText>
          </TouchableOpacity>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={[
                styles.filtroButton,
                categoriaFiltro === categoria.id && styles.filtroButtonSelected
              ]}
              onPress={() => setCategoriaFiltro(categoria.id)}
            >
              <ThemedText style={[
                styles.filtroButtonText,
                categoriaFiltro === categoria.id && styles.filtroButtonTextSelected
              ]}>
                {categoria.nome}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={servicosFiltrados}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>Nenhum serviço cadastrado</ThemedText>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {servicoEditando ? 'Editar Serviço' : 'Novo Serviço'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Serviço *</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome do serviço"
                value={nomeServico}
                onChangeText={setNomeServico}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço *</Text>
              <View style={styles.precoContainer}>
                <Text style={styles.precoSimbolo}>R$</Text>
              <TextInput
                  style={[styles.input, styles.precoInput]}
                  placeholder="0,00"
                  value={precoServico ? formatarPreco(precoServico) : ''}
                  onChangeText={handlePrecoChange}
                keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoria *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoriaServico}
                  onValueChange={(itemValue) => setCategoriaServico(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione uma categoria" value="" />
                  {categorias.map((categoria) => (
                    <Picker.Item
                      key={categoria.id}
                      label={categoria.nome}
                      value={categoria.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Digite a descrição do serviço (opcional)"
                value={descricaoServico}
                onChangeText={setDescricaoServico}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
                <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                  setModalVisible(false);
                  setServicoEditando(null);
                  setNomeServico('');
                  setPrecoServico('');
                  setCategoriaServico('');
                  setDescricaoServico('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
                          </TouchableOpacity>

                <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSalvarServico}
              >
                <Text style={styles.modalButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={mostrarModalCategorias}
        onRequestClose={() => setMostrarModalCategorias(false)}
      >
        <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Categoria *</Text>
                  <TextInput
                    style={styles.input}
                placeholder="Digite o nome da categoria"
                value={nomeCategoria}
                onChangeText={setNomeCategoria}
              />
            </View>

            <View style={styles.modalButtons}>
                  <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setMostrarModalCategorias(false);
                  setCategoriaEditando(null);
                  setNomeCategoria('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                        <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSalvarCategoria}
              >
                <Text style={styles.modalButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoriasListContainer}>
              <Text style={styles.categoriasListTitle}>Categorias Existentes</Text>
              <FlatList
                data={categorias}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.categoriaItem}>
                    <View style={styles.categoriaInfo}>
                      <Text style={styles.categoriaNome}>{item.nome}</Text>
                    </View>
                          <View style={styles.categoriaActions}>
                            <TouchableOpacity 
                        style={styles.categoriaActionButton}
                        onPress={() => {
                          setCategoriaEditando(item);
                          setNomeCategoria(item.nome);
                        }}
                            >
                              <Ionicons name="pencil" size={20} color="#7C3AED" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                        style={styles.categoriaActionButton}
                              onPress={() => handleExcluirCategoria(item)}
                            >
                        <Ionicons name="trash" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                  </View>
                    )}
              />
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
    backgroundColor: '#F3F4F6',
  },
  list: {
    padding: 16,
  },
  servicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  servicoInfo: {
    flex: 1,
  },
  servicoNome: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1F2937',
  },
  servicoDescricao: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  servicoPreco: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 4,
  },
  servicoCategoria: {
    fontSize: 14,
    color: '#6B7280',
  },
  servicoObservacoes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  servicoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1F2937',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#1F2937',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
  },
  filtrosContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filtroButtonSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filtroButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filtroButtonTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  categoriasButton: {
    padding: 8,
    marginLeft: 8,
  },
  categoriasListContainer: {
    marginTop: 20,
    maxHeight: 300,
  },
  categoriasListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
  },
  categoriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoriaInfo: {
    flex: 1,
  },
  categoriaNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  categoriaDescricao: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  categoriaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoriaActionButton: {
    padding: 8,
  },
  precoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  precoSimbolo: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  precoInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
  },
}); 