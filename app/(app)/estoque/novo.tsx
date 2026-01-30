import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';
import MaskInput from 'react-native-mask-input';
import { logger } from '../../../utils/logger';
import { Fornecedor as FornecedorBase } from '@types';
import { theme } from '@utils/theme';
import { useTheme } from '../../../contexts/ThemeContext';

type CategoriaEstoque = {
  id: string;
  nome: string;
};

type FornecedorEstoque = Pick<FornecedorBase, 'id' | 'nome'>;

type MarcaEstoque = {
  id: string;
  nome: string;
};

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

export default function NovoProdutoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { estabelecimentoId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaEstoque[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorEstoque[]>([]);
  const [marcas, setMarcas] = useState<MarcaEstoque[]>([]);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [mostrarFornecedores, setMostrarFornecedores] = useState(false);
  const [mostrarMarcas, setMostrarMarcas] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<CategoriaEstoque | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorEstoque | null>(null);
  const [marcaSelecionada, setMarcaSelecionada] = useState<MarcaEstoque | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    quantidade: '',
    preco: '',
    codigo: '',
    categoria_id: '',
    fornecedor_id: '',
    marca_id: '',
    quantidade_minima: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarCategorias();
    carregarFornecedores();
    carregarMarcas();
  }, []);

  const carregarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_produtos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      logger.error('Erro ao carregar categorias:', error);
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
      logger.error('Erro ao carregar fornecedores:', error);
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
      logger.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as marcas');
    }
  };

  const formatarPreco = (valor: string) => {
    // Remove caracteres não numéricos
    const valorNumerico = valor.replace(/\D/g, '');
    // Converte para número e divide por 100 para considerar os centavos
    const valorFormatado = (Number(valorNumerico) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return valorFormatado;
  };

  const handleSalvar = async () => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado. Entre novamente.');
        return;
      }

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
        .insert([
          {
            ...formData,
            quantidade: quantidadeNumerica,
            preco: precoNumerico,
            quantidade_minima: quantidadeMinima,
            estabelecimento_id: estabelecimentoId
          }
        ]);

      if (error) throw error;

      Alert.alert(
        'Sucesso',
        'Produto cadastrado com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(app)/estoque')
          }
        ]
      );
    } catch (error) {
      logger.error('Erro ao cadastrar produto:', error);
      Alert.alert('Erro', 'Não foi possível cadastrar o produto');
    }
  };

  const handleSelecionarCategoria = (categoria: CategoriaEstoque) => {
    setCategoriaSelecionada(categoria);
    setFormData({ ...formData, categoria_id: categoria.id });
    setMostrarCategorias(false);
  };

  const handleSelecionarFornecedor = (fornecedor: FornecedorEstoque) => {
    setFornecedorSelecionado(fornecedor);
    setFormData({ ...formData, fornecedor_id: fornecedor.id });
    setMostrarFornecedores(false);
  };

  const handleSelecionarMarca = (marca: MarcaEstoque) => {
    setMarcaSelecionada(marca);
    setFormData({ ...formData, marca_id: marca.id });
    setMostrarMarcas(false);
  };

  const handlePrecoChange = (text: string) => {
    const valorNumerico = text.replace(/\D/g, '');
    const valorFormatado = (Number(valorNumerico) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setFormData({ ...formData, preco: valorFormatado });
  };

  return (
    <View style={styles.container}>
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
              placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Código *</Text>
          <TextInput
            style={styles.input}
            value={formData.codigo}
            onChangeText={(text) => setFormData({ ...formData, codigo: text })}
            placeholder="Digite o código do produto"
              placeholderTextColor={colors.textTertiary}
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
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
              placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Preço *</Text>
              <TextInput
                style={styles.input}
                value={formData.preco}
                onChangeText={handlePrecoChange}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSalvar}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Salvando...' : 'Salvar Produto'}
          </Text>
        </TouchableOpacity>
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
                  <Ionicons name="close" size={24} color={colors.text} />
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
                  <Ionicons name="close" size={24} color={colors.text} />
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
                  <Ionicons name="close" size={24} color={colors.text} />
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

// Função auxiliar para criar estilos dinâmicos
function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    formContainer: {
      flex: 1,
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
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16,
      color: '#111827',
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    pickerButton: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerButtonText: {
      fontSize: 16,
      color: '#111827',
    },
    pickerButtonPlaceholder: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginBottom: 32,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    modalContent: {
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#111827',
    },
    modalCloseButton: {
      padding: 4,
    },
    modalList: {
      maxHeight: 300,
    },
    modalItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalItemText: {
      fontSize: 16,
      color: colors.text,
    },
  });
}