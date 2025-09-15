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

// Suas funções de validação e formatação permanecem as mesmas...
const validarCPF = (cpf: string) => { /* ... seu código de validação ... */ return true; };
const validarCNPJ = (cnpj: string) => { /* ... seu código de validação ... */ return true; };
const validarCelular = (celular: string) => { /* ... seu código de validação ... */ return true; };
const formatarCPF = (value: string) => { /* ... seu código de formatação ... */ return value; };
const formatarCNPJ = (value: string) => { /* ... seu código de formatação ... */ return value; };
const formatarCelular = (value: string) => { /* ... seu código de formatação ... */ return value; };


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
    // Suas validações de formulário continuam aqui...
    if (!nomeCompleto || !email || !senha) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos do responsável.');
        return;
    }

    setSaving(true);

    // Agora, a chamada é uma só e muito mais simples
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          // Passamos todos os dados extras aqui. O gatilho no backend vai usar isso.
          nome: nomeCompleto,
          nome_estabelecimento: nomeEstabelecimento,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.replace(/\D/g, ''),
          telefone: telefone.replace(/\D/g, ''),
          segmento: segmento,
        }
      }
    });

    if (error) {
      Alert.alert('Erro no Cadastro', error.message || 'Não foi possível criar o usuário.');
    } else if (data.user) {
      Alert.alert('Cadastro Realizado!', 'Enviamos um e-mail de confirmação para você. Por favor, verifique sua caixa de entrada para ativar sua conta.');
      router.replace('/(auth)/login');
    }
    
    setSaving(false);
  };

  return (
    // ... seu JSX do formulário continua exatamente o mesmo aqui ...
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* ... todo o seu layout ... */}
        <TouchableOpacity 
            style={[styles.createButton, saving && styles.createButtonDisabled]}
            onPress={handleSignUp}
            disabled={saving}
        >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Criar Conta</Text>}
        </TouchableOpacity>
        {/* ... resto do seu layout ... */}
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