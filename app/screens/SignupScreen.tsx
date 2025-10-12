import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import MaskInput from 'react-native-mask-input';
import { supabase, testConnection } from '../../lib/supabase';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    nomeEstabelecimento: '',
    cnpj: '',
    celular: '',
    segmento: '',
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    receberTutorial: false,
    aceitarTermos: false
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const segmentos = [
    { label: 'Selecione o segmento', value: '' },
    { label: 'Varejo', value: 'varejo' },
    { label: 'Serviços', value: 'servicos' },
    { label: 'Alimentação', value: 'alimentacao' },
    { label: 'Beleza e Estética', value: 'beleza' },
    { label: 'Saúde', value: 'saude' },
    { label: 'Outros', value: 'outros' }
  ];

  const validateForm = () => {
    if (!formData.nomeEstabelecimento) {
      Alert.alert('Erro', 'Nome do estabelecimento é obrigatório');
      return false;
    }
    if (!formData.cnpj || formData.cnpj.length < 14) {
      Alert.alert('Erro', 'CNPJ inválido');
      return false;
    }
    if (!formData.celular || formData.celular.length < 11) {
      Alert.alert('Erro', 'Celular inválido');
      return false;
    }
    if (!formData.segmento) {
      Alert.alert('Erro', 'Selecione um segmento');
      return false;
    }
    if (!formData.nomeCompleto) {
      Alert.alert('Erro', 'Nome completo é obrigatório');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      Alert.alert('Erro', 'E-mail inválido');
      return false;
    }
    if (!formData.senha || formData.senha.length < 8) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 8 caracteres');
      return false;
    }
    if (formData.senha !== formData.confirmarSenha) {
      Alert.alert('Erro', 'As senhas não conferem');
      return false;
    }
    if (!formData.aceitarTermos) {
      Alert.alert('Erro', 'Você precisa aceitar os termos de uso');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome_completo: formData.nomeCompleto,
            receber_tutorial: formData.receberTutorial,
            estabelecimento: {
              nome: formData.nomeEstabelecimento,
              cnpj: formData.cnpj.replace(/\D/g, ''),
              celular: formData.celular.replace(/\D/g, ''),
              segmento: formData.segmento,
            },
          },
        },
      });

      if (error) {
        console.error('Erro detalhado:', error);
        Alert.alert(
          'Erro ao criar conta',
          `Detalhes do erro: ${error.message}`
        );
        return;
      }

      Alert.alert(
        'Sucesso',
        'Conta criada com sucesso! Você será redirecionado para o login.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(auth)/login')
          }
        ]
      );
    } catch (error: any) {
      console.error('Erro inesperado:', error);
      Alert.alert(
        'Erro ao criar conta',
        `Ocorreu um erro inesperado: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const ok = await testConnection();
      if (ok) Alert.alert('Sucesso', 'Conexão com o Supabase bem-sucedida.');
      else Alert.alert('Erro de Conexão', 'Não foi possível conectar ao Supabase.');
    } catch (error: any) {
      Alert.alert(
        'Erro Inesperado',
        `Ocorreu um erro ao testar a conexão: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Cadastre seu Estabelecimento</Text>
        <Text style={styles.subtitle}>Comece sua jornada com o AppBusiness</Text>

        <Text style={styles.label}>Nome do Estabelecimento*</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome da sua empresa"
          value={formData.nomeEstabelecimento}
          onChangeText={(text) => setFormData({...formData, nomeEstabelecimento: text})}
        />

        <Text style={styles.label}>CNPJ*</Text>
        <MaskInput
          value={formData.cnpj}
          onChangeText={(text, rawText) => setFormData({...formData, cnpj: text})}
          mask={[/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '-', /\d/, /\d/]}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Celular (Com WhatsApp)*</Text>
        <MaskInput
          value={formData.celular}
          onChangeText={(text, rawText) => setFormData({...formData, celular: text})}
          mask={['(', /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]}
          placeholder="(00) 00000-0000"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Segmento*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.segmento}
            onValueChange={(itemValue) => setFormData({...formData, segmento: itemValue})}
            style={styles.picker}
          >
            {segmentos.map((seg) => (
              <Picker.Item key={seg.value} label={seg.label} value={seg.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.sectionTitle}>Dados do Responsável</Text>

        <Text style={styles.label}>Nome Completo*</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome completo"
          value={formData.nomeCompleto}
          onChangeText={(text) => setFormData({...formData, nomeCompleto: text})}
        />

        <Text style={styles.label}>E-mail*</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha*</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Mínimo 8 caracteres"
            value={formData.senha}
            onChangeText={(text) => setFormData({...formData, senha: text})}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar Senha*</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Digite a senha novamente"
            value={formData.confirmarSenha}
            onChangeText={(text) => setFormData({...formData, confirmarSenha: text})}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, formData.receberTutorial && styles.checkboxChecked]}
            onPress={() => setFormData({...formData, receberTutorial: !formData.receberTutorial})}
          >
            {formData.receberTutorial && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Desejo receber um tutorial via WhatsApp sobre como utilizar o sistema
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, formData.aceitarTermos && styles.checkboxChecked]}
            onPress={() => setFormData({...formData, aceitarTermos: !formData.aceitarTermos})}
          >
            {formData.aceitarTermos && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Li e aceito os{' '}
            <Text style={styles.link}>Termos de Uso</Text> e a{' '}
            <Text style={styles.link}>Política de Privacidade</Text>
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Criar Conta</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Já tem uma conta? </Text>
          <Link href="/(auth)/login" style={styles.loginLink}>
            Fazer login
          </Link>
        </View>

        <TouchableOpacity style={styles.tryFreeButton}>
          <Text style={styles.tryFreeText}>Faça o teste grátis por 7 dias!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportText}>💬 Falar com o Suporte</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, loading && styles.testButtonDisabled]}
          onPress={handleTestConnection}
          disabled={loading}
        >
          <Text style={styles.testButtonText}>Testar Conexão</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 50,
    marginBottom: 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    marginRight: 8,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  link: {
    color: '#8B5CF6',
    textDecorationLine: 'none',
  },
  createButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#8B5CF6',
    fontSize: 14,
    textDecorationLine: 'none',
  },
  tryFreeButton: {
    marginBottom: 16,
  },
  tryFreeText: {
    color: '#10B981',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  supportButton: {
    marginBottom: 24,
  },
  supportText: {
    color: '#4285F4',
    fontSize: 14,
    textAlign: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  testButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
}); 