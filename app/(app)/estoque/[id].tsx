import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import MaskInput from 'react-native-mask-input';

interface Produto {
  id: string;
  nome: string;
  quantidade: number;
  preco: number;
  codigo: string;
  categoria_id: string;
  fornecedor_id: string;
  marca_id: string;
  quantidade_minima: number;
  categoria?: {
    nome: string;
  };
  fornecedor?: {
    nome: string;
  };
  marca?: {
    nome: string;
  };
  observacoes: string;
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

const PRECO_MASK = [
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  ',',
  /\d/,
  /\d/,
];

export default function EditarProdutoScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [mostrarFornecedores, setMostrarFornecedores] = useState(false);
  const [mostrarMarcas, setMostrarMarcas] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [marcaSelecionada, setMarcaSelecionada] = useState<Marca | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    quantidade: '',
    preco: '',
    codigo: '',
    categoria_id: '',
    fornecedor_id: '',
    marca_id: '',
    quantidade_minima: '',
    observacoes: '',
  });

  useEffect(() => {
    carregarProduto();
    carregarCategorias();
    carregarFornecedores();
    carregarMarcas();
  }, [id]);

  const carregarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_produtos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const carregarFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      Alert.alert('Erro', 'Não foi possível carregar os fornecedores');
    }
  };

  const carregarMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setMarcas(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as marcas');
    }
  };

  const carregarProduto = async () => {
    try {
      setLoading(true);
      
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias_produtos(nome),
          fornecedor:fornecedores(nome),
          marca:marcas(nome)
        `)
        .eq('id', id)
        .single();

      if (produtoError) throw produtoError;

      // Configurar os dados do formulário
      setFormData({
        nome: produto.nome,
        quantidade: produto.quantidade.toString(),
        preco: produto.preco.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        codigo: produto.codigo,
        categoria_id: produto.categoria_id || '',
        fornecedor_id: produto.fornecedor_id || '',
        marca_id: produto.marca_id || '',
        quantidade_minima: produto.quantidade_minima?.toString() || '0',
        observacoes: produto.observacoes || '',
      });

      // Configurar seleções
      if (produto.categoria) {
        setCategoriaSelecionada({ id: produto.categoria_id, nome: produto.categoria.nome });
      }
      if (produto.fornecedor) {
        setFornecedorSelecionado({ id: produto.fornecedor_id, nome: produto.fornecedor.nome });
      }
      if (produto.marca) {
        setMarcaSelecionada({ id: produto.marca_id, nome: produto.marca.nome });
      }

    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do produto');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarCategoria = (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setFormData({ ...formData, categoria_id: categoria.id });
    setMostrarCategorias(false);
  };

  const handleSelecionarFornecedor = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setFormData({ ...formData, fornecedor_id: fornecedor.id });
    setMostrarFornecedores(false);
  };

  const handleSelecionarMarca = (marca: Marca) => {
    setMarcaSelecionada(marca);
    setFormData({ ...formData, marca_id: marca.id });
    setMostrarMarcas(false);
  };

  const handleSalvar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Converter preço de string formatada para número
      const precoNumerico = parseFloat(formData.preco.replace(/[^\d,]/g, '').replace(',', '.'));
      if (isNaN(precoNumerico)) {
        Alert.alert('Erro', 'Preço inválido');
        return;
      }

      // Converter quantidade para número
      const quantidadeNumerica = parseInt(formData.quantidade);
      if (isNaN(quantidadeNumerica)) {
        Alert.alert('Erro', 'Quantidade inválida');
        return;
      }

      // Garantir que quantidade_minima seja um número válido
      const quantidadeMinima = parseInt(formData.quantidade_minima) || 0;
      if (isNaN(quantidadeMinima)) {
        Alert.alert('Erro', 'Quantidade mínima inválida');
        return;
      }

      const { error } = await supabase
        .from('produtos')
        .update({
          ...formData,
          quantidade: quantidadeNumerica,
          preco: precoNumerico,
          quantidade_minima: quantidadeMinima
        })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
      router.back();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o produto');
    }
  };

  const handleExcluir = async () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este produto?',
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
              setLoading(true);
              const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Sucesso', 'Produto excluído com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              console.error('Erro ao excluir produto:', error);
              Alert.alert('Erro', 'Não foi possível excluir o produto');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !produto) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: 'Editar Produto',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Produto *</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              placeholder="Digite o nome do produto"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código *</Text>
            <TextInput
              style={styles.input}
              value={formData.codigo}
              onChangeText={(text) => setFormData({ ...formData, codigo: text })}
              placeholder="Digite o código do produto"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setMostrarCategorias(true)}
            >
              <Text style={categoriaSelecionada ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {categoriaSelecionada ? categoriaSelecionada.nome : 'Selecione uma categoria'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fornecedor *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setMostrarFornecedores(true)}
            >
              <Text style={fornecedorSelecionado ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {fornecedorSelecionado ? fornecedorSelecionado.nome : 'Selecione um fornecedor'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Marca *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setMostrarMarcas(true)}
            >
              <Text style={marcaSelecionada ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {marcaSelecionada ? marcaSelecionada.nome : 'Selecione uma marca'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Produto</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.observacoes}
              onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
              placeholder="Digite observações adicionais"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantidade *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantidade}
                onChangeText={(text) => setFormData({ ...formData, quantidade: text })}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Quantidade Mínima</Text>
              <TextInput
                style={styles.input}
                value={formData.quantidade_minima}
                onChangeText={(text) => setFormData({ ...formData, quantidade_minima: text })}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Preço *</Text>
              <MaskInput
                style={styles.input}
                value={formData.preco}
                onChangeText={(masked, unmasked) => setFormData({ ...formData, preco: masked })}
                mask={PRECO_MASK}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.buttonDisabled]}
            onPress={handleExcluir}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Excluir Produto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Categorias */}
      <Modal
        visible={mostrarCategorias}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarCategorias(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarCategorias(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecione uma categoria</Text>
                <TouchableOpacity
                  onPress={() => setMostrarCategorias(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {categorias.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={styles.modalItem}
                    onPress={() => handleSelecionarCategoria(categoria)}
                  >
                    <Text style={styles.modalItemText}>{categoria.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Fornecedores */}
      <Modal
        visible={mostrarFornecedores}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarFornecedores(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarFornecedores(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecione um fornecedor</Text>
                <TouchableOpacity
                  onPress={() => setMostrarFornecedores(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {fornecedores.map((fornecedor) => (
                  <TouchableOpacity
                    key={fornecedor.id}
                    style={styles.modalItem}
                    onPress={() => handleSelecionarFornecedor(fornecedor)}
                  >
                    <Text style={styles.modalItemText}>{fornecedor.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Marcas */}
      <Modal
        visible={mostrarMarcas}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarMarcas(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarMarcas(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecione uma marca</Text>
                <TouchableOpacity
                  onPress={() => setMostrarMarcas(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {marcas.map((marca) => (
                  <TouchableOpacity
                    key={marca.id}
                    style={styles.modalItem}
                    onPress={() => handleSelecionarMarca(marca)}
                  >
                    <Text style={styles.modalItemText}>{marca.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerButtonPlaceholder: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
}); 