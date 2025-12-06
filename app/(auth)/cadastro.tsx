import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { logger } from '../../utils/logger';
import { 
  validarCPF, 
  validarCNPJ, 
  validarTelefone as validarCelular,
  formatarCPF, 
  formatarCNPJ, 
  formatarTelefone as formatarCelular 
} from '../../utils/validators';

const segmentos = [
  { label: 'Varejo', value: 'varejo' },
  { label: 'Serviços', value: 'servicos' },
  { label: 'Alimentação', value: 'alimentacao' },
  { label: 'Beleza e Estética', value: 'beleza' },
  { label: 'Saúde', value: 'saude' },
  { label: 'Outros', value: 'outros' },
];

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
        logger.error('Erro no cadastro:', authError);
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
        logger.error('Erro ao criar conta:', contaError);
        Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.');
        return;
      }

      Alert.alert('Sucesso', 'Cadastro realizado com sucesso! Por favor, verifique o seu e-mail para ativar sua conta.');
      router.replace('/(auth)/login');
    } catch (error) {
      logger.error('Erro no cadastro:', error);
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