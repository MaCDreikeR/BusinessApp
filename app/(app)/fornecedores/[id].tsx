import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import MaskInput, { Masks } from 'react-native-mask-input';
import { logger } from '../../../utils/logger';
import { Fornecedor as FornecedorBase } from '@types';
import { theme } from '@utils/theme';

type ValidationErrors = {
  [key: string]: string;
};

type FornecedorDetalhes = Pick<FornecedorBase, 'id' | 'nome'> & {
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string;
};

export default function EditarFornecedorScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: '',
  });

  useEffect(() => {
    carregarFornecedor();
  }, [id]);

  // Função para sanitizar strings
  const sanitizeString = (str: string) => {
    return str.trim().replace(/[<>]/g, '');
  };

  // Função para validar email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para validar CNPJ
  const isValidCNPJ = (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    return cleanCNPJ.length === 14;
  };

  // Função para validar CEP
  const isValidCEP = (cep: string) => {
    const cleanCEP = cep.replace(/[^\d]/g, '');
    return cleanCEP.length === 8;
  };

  // Função para validar telefone
  const isValidPhone = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validação do nome
    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome é obrigatório';
    } else if (formData.nome.length < 3) {
      newErrors.nome = 'O nome deve ter pelo menos 3 caracteres';
    }

    // Validação do CNPJ
    if (formData.cnpj && !isValidCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    // Validação do telefone
    if (formData.telefone && !isValidPhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }

    // Validação do email
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    // Validação do CEP
    if (formData.cep && !isValidCEP(formData.cep)) {
      newErrors.cep = 'CEP inválido';
    }

    // Validação do estado
    if (formData.estado && formData.estado.length !== 2) {
      newErrors.estado = 'Estado deve ter 2 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const carregarFornecedor = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          telefone: data.telefone || '',
          email: data.email || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          cep: data.cep || '',
          observacoes: data.observacoes || '',
        });
      }
    } catch (error) {
      logger.error('Erro ao carregar fornecedor:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const buscarCep = async (cep: string) => {
    try {
      // Remove caracteres não numéricos do CEP
      const cepLimpo = cep.replace(/\D/g, '');
      
      // Verifica se o CEP tem 8 dígitos
      if (cepLimpo.length !== 8) return;

      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('Erro', 'CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }));
    } catch (error) {
      logger.error('Erro ao buscar CEP:', error);
      Alert.alert('Erro', 'Não foi possível buscar o endereço');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        const errorMessages = Object.values(errors).join('\n');
        Alert.alert('Erro de Validação', errorMessages);
        return;
      }

      setLoading(true);

      // Sanitiza os dados antes de salvar
      const sanitizedData = {
        nome: sanitizeString(formData.nome),
        cnpj: formData.cnpj.replace(/[^\d]/g, ''),
        telefone: formData.telefone.replace(/[^\d]/g, ''),
        email: formData.email.toLowerCase().trim(),
        endereco: sanitizeString(formData.endereco),
        cidade: sanitizeString(formData.cidade),
        estado: formData.estado.toUpperCase(),
        cep: formData.cep.replace(/[^\d]/g, ''),
        observacoes: sanitizeString(formData.observacoes),
      };

      const { error } = await supabase
        .from('fornecedores')
        .update(sanitizedData)
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Fornecedor atualizado com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.push('/fornecedores/'),
        },
      ]);
    } catch (error) {
      logger.error('Erro ao atualizar fornecedor:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const renderError = (fieldName: string) => {
    if (errors[fieldName]) {
      return <Text style={styles.errorText}>{errors[fieldName]}</Text>;
    }
    return null;
  };

  if (loading && !formData.nome) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="theme.colors.primary" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.formContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[styles.input, errors.nome && styles.inputError]}
              value={formData.nome}
              onChangeText={(text) => {
                setFormData({ ...formData, nome: text });
                setErrors({ ...errors, nome: '' });
              }}
              placeholder="Nome do fornecedor"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
            {renderError('nome')}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CNPJ</Text>
            <MaskInput
              style={[styles.input, errors.cnpj && styles.inputError]}
              value={formData.cnpj}
              onChangeText={(masked, unmasked) => {
                setFormData({ ...formData, cnpj: masked });
                setErrors({ ...errors, cnpj: '' });
              }}
              placeholder="00.000.000/0000-00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              returnKeyType="next"
              mask={Masks.BRL_CNPJ}
            />
            {renderError('cnpj')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <MaskInput
              style={[styles.input, errors.telefone && styles.inputError]}
              value={formData.telefone}
              onChangeText={(masked, unmasked) => {
                setFormData({ ...formData, telefone: masked });
                setErrors({ ...errors, telefone: '' });
              }}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              returnKeyType="next"
              mask={Masks.BRL_PHONE}
            />
            {renderError('telefone')}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                setErrors({ ...errors, email: '' });
              }}
              placeholder="email@exemplo.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
            {renderError('email')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP</Text>
            <View style={styles.cepContainer}>
              <MaskInput
                style={[
                  styles.input, 
                  errors.cep && styles.inputError,
                  { flex: 1 }
                ]}
                value={formData.cep}
                onChangeText={(masked, unmasked) => {
                  setFormData({ ...formData, cep: masked });
                  setErrors({ ...errors, cep: '' });
                  if (unmasked.length === 8) {
                    buscarCep(unmasked);
                  }
                }}
                placeholder="00000-000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                returnKeyType="next"
                mask={[/\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/]}
              />
              {loadingCep && (
                <ActivityIndicator 
                  size="small" 
                  color="theme.colors.primary" 
                  style={styles.cepLoader} 
                />
              )}
            </View>
            {renderError('cep')}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput
              style={styles.input}
              value={formData.endereco}
              onChangeText={(text) => setFormData({ ...formData, endereco: text })}
              placeholder="Rua, número, complemento"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
              editable={!loadingCep}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={formData.cidade}
                onChangeText={(text) => setFormData({ ...formData, cidade: text })}
                placeholder="Cidade"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                editable={!loadingCep}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Estado</Text>
              <TextInput
                style={[styles.input, errors.estado && styles.inputError]}
                value={formData.estado}
                onChangeText={(text) => {
                  setFormData({ ...formData, estado: text });
                  setErrors({ ...errors, estado: '' });
                }}
                placeholder="UF"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
                autoCapitalize="characters"
                editable={!loadingCep}
              />
              {renderError('estado')}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.observacoes}
              onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
              placeholder="Adicione observações sobre o fornecedor..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Confirmar Exclusão',
                'Tem certeza que deseja excluir este fornecedor?',
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
                          .from('fornecedores')
                          .delete()
                          .eq('id', id);

                        if (error) throw error;

                        Alert.alert('Sucesso', 'Fornecedor excluído com sucesso!', [
                          {
                            text: 'OK',
                            onPress: () => router.push('/fornecedores/'),
                          },
                        ]);
                      } catch (error) {
                        logger.error('Erro ao excluir fornecedor:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o fornecedor');
                      } finally {
                        setLoading(false);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.deleteButtonText}>Excluir Fornecedor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
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
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: 'theme.colors.primary',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
  },
  cepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cepLoader: {
    marginLeft: 8,
  },
});