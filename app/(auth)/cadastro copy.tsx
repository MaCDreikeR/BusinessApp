import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const segmentos = [
  { label: 'Varejo', value: 'varejo' },
  { label: 'Serviços', value: 'servicos' },
  { label: 'Alimentação', value: 'alimentacao' },
  { label: 'Beleza e Estética', value: 'beleza' },
  { label: 'Saúde', value: 'saude' },
  { label: 'Outros', value: 'outros' },
];

// Funções de validação
const validarCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digitoVerificador1 = resto > 9 ? 0 : resto;
  if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digitoVerificador2 = resto > 9 ? 0 : resto;
  if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;

  return true;
};

const validarCNPJ = (cnpj: string) => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

const validarCelular = (celular: string) => {
  const celularLimpo = celular.replace(/\D/g, '');
  return celularLimpo.length === 11;
};

// Funções de formatação
const formatarCPF = (value: string) => {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};

const formatarCNPJ = (value: string) => {
  const cnpj = value.replace(/\D/g, '');
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
};

const formatarCelular = (value: string) => {
  const celular = value.replace(/\D/g, '');
  if (celular.length <= 2) return celular;
  if (celular.length <= 7) return `(${celular.slice(0, 2)}) ${celular.slice(2)}`;
  return `(${celular.slice(0, 2)}) ${celular.slice(2, 7)}-${celular.slice(7, 11)}`;
};

export default function CadastroScreen() {
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [segmento, setSegmento] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceitaTutorial, setAceitaTutorial] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSignUp = async () => {
    try {
      setSaving(true);

      // Validações
      if (!nomeCompleto || !email || !senha || !confirmarSenha || !nomeEstabelecimento || !numeroDocumento || !tipoDocumento || !telefone) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos');
        return;
      }

      if (senha !== confirmarSenha) {
        Alert.alert('Erro', 'As senhas não coincidem');
        return;
      }

      if (tipoDocumento === 'CPF' && !validarCPF(numeroDocumento)) {
        Alert.alert('Erro', 'CPF inválido');
        return;
      }

      if (tipoDocumento === 'CNPJ' && !validarCNPJ(numeroDocumento)) {
        Alert.alert('Erro', 'CNPJ inválido');
        return;
      }

      if (!validarCelular(telefone)) {
        Alert.alert('Erro', 'Celular inválido');
        return;
      }

      // Adicionar delay para evitar erro de limite de requisições
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome: nomeCompleto,
          }
        },
      });

      if (authError) {
        console.error('Erro no cadastro:', authError);
        Alert.alert('Erro', 'Não foi possível criar o usuário. Tente novamente.');
        return;
      }

      if (!authData.user) {
        Alert.alert('Erro', 'Usuário não foi criado corretamente.');
        return;
      }

      // Criar a conta e o primeiro usuário usando a função
      const { data: contaData, error: contaError } = await supabase.rpc('criar_nova_conta', {
        p_nome_estabelecimento: nomeEstabelecimento,
        p_tipo_documento: tipoDocumento,
        p_numero_documento: numeroDocumento,
        p_telefone: telefone,
        p_segmento: segmento,
        p_nome_usuario: nomeCompleto,
        p_email: email,
        p_usuario_id: authData.user.id
      });

      if (contaError) {
        console.error('Erro ao criar conta:', contaError);
        Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.');
        return;
      }

      Alert.alert('Sucesso', 'Cadastro realizado com sucesso! Por favor, verifique o seu e-mail para ativar sua conta.');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', 'Ocorreu um erro durante o cadastro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInDown.duration(1000).springify()}
            style={styles.header}
          >
        <Text style={styles.title}>Cadastre seu Estabelecimento</Text>
        <Text style={styles.subtitle}>Comece sua jornada com o AppBusiness</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(1000).springify()}
            style={styles.form}
          >
        <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Dados do Estabelecimento</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome do Estabelecimento*</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da sua empresa"
              value={nomeEstabelecimento}
              onChangeText={setNomeEstabelecimento}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tipo de Documento*</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={[
                    { label: 'CPF', value: 'CPF' },
                    { label: 'CNPJ', value: 'CNPJ' }
                  ]}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Selecione o tipo de documento"
                  value={tipoDocumento}
                  onChange={item => {
                    setTipoDocumento(item.value);
                    setNumeroDocumento('');
                  }}
                  renderRightIcon={() => (
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  )}
            />
          </View>

          <View style={styles.inputContainer}>
                <Text style={styles.label}>{tipoDocumento}*</Text>
            <TextInput
              style={styles.input}
                  placeholder={tipoDocumento === 'CPF' ? "000.000.000-00" : "00.000.000/0000-00"}
                  value={numeroDocumento}
                  onChangeText={(text) => {
                    const formatted = tipoDocumento === 'CPF' ? formatarCPF(text) : formatarCNPJ(text);
                    setNumeroDocumento(formatted);
                  }}
              keyboardType="numeric"
                  maxLength={tipoDocumento === 'CPF' ? 14 : 18}
                  placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Celular (Com Whatsapp)*</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 0 0000-0000"
              value={telefone}
                  onChangeText={(text) => {
                    const formatted = formatarCelular(text);
                    setTelefone(formatted);
                  }}
              keyboardType="phone-pad"
                  maxLength={15}
                  placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Segmento*</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={segmentos}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Selecione o segmento"
              value={segmento}
              onChange={item => setSegmento(item.value)}
              renderRightIcon={() => (
                <Ionicons name="chevron-down" size={20} color="#666" />
              )}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Dados do Responsável</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Completo*</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome completo"
              value={nomeCompleto}
              onChangeText={setNomeCompleto}
                  placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail*</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Senha*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
                style={[styles.checkbox, aceitaTutorial && styles.checkboxChecked]}
            onPress={() => setAceitaTutorial(!aceitaTutorial)}
          >
                {aceitaTutorial && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Desejo receber um tutorial via WhatsApp sobre como utilizar o sistema
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
                style={[styles.checkbox, aceitaTermos && styles.checkboxChecked]}
            onPress={() => setAceitaTermos(!aceitaTermos)}
          >
                {aceitaTermos && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Li e aceito os{' '}
            <Text style={styles.link}>Termos de Uso</Text> e a{' '}
            <Text style={styles.link}>Política de Privacidade</Text>
          </Text>
        </View>

            <TouchableOpacity 
              style={[styles.createButton, saving && styles.createButtonDisabled]}
              onPress={handleSignUp}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
          <Text style={styles.createButtonText}>Criar Conta</Text>
              )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Já tem uma conta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity style={styles.trialButton}>
          <Text style={styles.trialText}>Faça o teste grátis por 7 dias!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="logo-whatsapp" size={20} color="#0066FF" />
          <Text style={styles.supportText}>Falar com o Suporte</Text>
        </TouchableOpacity>
          </Animated.View>
    </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E9D5FF',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  link: {
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
  createButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  trialButton: {
    marginBottom: 16,
  },
  trialText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportText: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 