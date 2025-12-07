import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { logger } from '../../utils/logger';
import { theme } from '@utils/theme';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    carregarDadosSalvos();
  }, []);

  const carregarDadosSalvos = async () => {
    try {
      const dadosSalvos = await AsyncStorage.getItem('@loginData');
      if (dadosSalvos) {
        const { email: emailSalvo, senha: senhaSalva, lembrarMe: lembrarMeSalvo } = JSON.parse(dadosSalvos);
        setEmail(emailSalvo);
        setPassword(senhaSalva || '');
        setLembrarMe(lembrarMeSalvo);
      }
    } catch (error) {
      logger.error('Erro ao carregar dados salvos:', error);
    }
  };

  const salvarDados = async () => {
    try {
      if (lembrarMe) {
        await AsyncStorage.setItem('@loginData', JSON.stringify({
          email,
          senha: password,
          lembrarMe
        }));
      } else {
        await AsyncStorage.removeItem('@loginData');
      }
    } catch (error) {
      logger.error('Erro ao salvar dados:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setErrorMessage('E-mail ou senha inválidos, por favor verifique!');
        return;
      }

      if (!data?.user) {
        setErrorMessage('Usuário não encontrado após login');
        return;
      }

      // Se o login for bem sucedido, salva os dados se "Lembrar-me" estiver marcado
      await salvarDados();
      
      // Redireciona para a tela inicial após o login bem-sucedido
      router.replace('/(app)');
      
    } catch (error: any) {
      setErrorMessage('E-mail ou senha inválidos, por favor verifique!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.gradient}
      >
        <Animated.View 
          entering={FadeInDown.duration(1000).springify()}
          style={styles.header}
        >
        <Text style={styles.title}>Bem-vindo ao BusinessApp</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.duration(1000).springify()}
          style={styles.form}
        >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Digite seu e-mail"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMessage('');
            }}
            autoCapitalize="none"
            keyboardType="email-address"
              placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errorMessage && styles.inputError]}
              placeholder="Digite sua senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage('');
              }}
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

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.rememberContainer}>
          <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={[styles.checkbox, lembrarMe && styles.checkboxChecked]}
                onPress={() => setLembrarMe(!lembrarMe)}
              >
                {lembrarMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            <Text style={styles.rememberText}>Lembrar-me</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Ainda não tem uma conta? </Text>
          <Link href="/(auth)/cadastro" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Criar conta</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity style={styles.trialButton}>
          <Text style={styles.trialText}>Faça seu teste grátis agora!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="logo-whatsapp" size={20} color="#0066FF" />
          <Text style={styles.supportText}>Falar com o Suporte</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Ao realizar login você concorda com nossos{' '}
          <Text style={styles.termsLink}>termos de uso</Text> e{' '}
          <Text style={styles.termsLink}>política de privacidade</Text>
        </Text>
        </Animated.View>
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
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 32,
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  forgotText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: theme.colors.primary,
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
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
}); 