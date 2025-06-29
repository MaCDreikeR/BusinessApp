import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      console.log('Tentando fazer login...');
      const { user, error } = await supabase.auth.signIn(email, password);
      
      if (error) {
        console.error('Erro retornado pelo signIn:', error);
        Alert.alert(
          'Erro no Login',
          `${error.message}\n${error.details ? `\nDetalhes: ${error.details}` : ''}`
        );
        return;
      }

      if (user) {
        console.log('Login bem sucedido, redirecionando...');
        router.replace('/(tabs)');
      } else {
        console.error('Login falhou: usuário não retornado');
        Alert.alert('Erro', 'Não foi possível completar o login');
      }
    } catch (error: any) {
      console.error('Erro inesperado no login:', error);
      Alert.alert(
        'Erro Inesperado',
        'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Bem-vindo ao AppBusiness</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Digite sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Lembrar-me</Text>
          </TouchableOpacity>

          <Link href="/forgot-password" style={styles.forgotPassword}>
            Esqueceu a senha?
          </Link>
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
          <Link href="/signup" style={styles.signupLink}>
            Criar conta
          </Link>
        </View>

        <TouchableOpacity style={styles.tryFreeButton}>
          <Text style={styles.tryFreeText}>Faça seu teste grátis agora!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportText}>💬 Falar com o Suporte</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Ao realizar login você concorda com nossos{' '}
          <Link href="/terms" style={styles.termsLink}>termos de uso</Link> e{' '}
          <Link href="/privacy" style={styles.termsLink}>política de privacidade</Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
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
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  optionsContainer: {
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
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    marginRight: 8,
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
    fontSize: 14,
    color: '#666',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#8B5CF6',
    textDecorationLine: 'none',
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
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
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#8B5CF6',
    textDecorationLine: 'none',
  },
}); 