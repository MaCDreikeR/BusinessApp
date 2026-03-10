import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { CacheManager, CacheNamespaces } from '../../utils/cacheManager';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { NativeModulesProxy } from 'expo-modules-core';
import { Button } from '../../components/Button';

const MAX_LOGIN_ATTEMPTS = 3;
const WINDOW_MS = 30 * 60 * 1000;
const LOCK_MS = 30 * 60 * 1000;
const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_login_email';

type LoginFieldErrorKey = 'email' | 'password';
type LoginFieldErrors = Partial<Record<LoginFieldErrorKey, string>>;

type LoginRateLimitData = {
  attempts: number;
  windowStartedAt: number;
  lockUntil?: number;
};

type BackendRateLimitResponse = {
  success: boolean;
  blocked: boolean;
  attempts?: number;
  max_attempts?: number;
  remaining_attempts?: number;
  retry_after_minutes?: number;
  lock_until?: string | null;
};

type LocalAuthenticationModule = typeof import('expo-local-authentication');

const getLocalAuthenticationModule = (): LocalAuthenticationModule | null => {
  const hasNativeLocalAuth = Boolean(
    (NativeModulesProxy as Record<string, unknown>)?.ExpoLocalAuthentication
  );

  if (!hasNativeLocalAuth) {
    return null;
  }

  try {
    const module = require('expo-local-authentication') as LocalAuthenticationModule;
    if (module && typeof module.authenticateAsync === 'function') {
      return module;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const passwordInputRef = useRef<TextInput>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'warning'>('error');

  const setFieldError = (field: LoginFieldErrorKey, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: LoginFieldErrorKey) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const shakeOffset = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  useEffect(() => {
    (async () => {
      try {
        await carregarDadosSalvos();
        await verificarBiometria();
        await carregarRateLimit();
      } catch (error) {
        logger.warn('Erro durante inicialização da tela de login:', error);
      }
    })();
  }, []);

  const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const isValidEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const verificarBiometria = async () => {
    try {
      const LocalAuthentication = getLocalAuthenticationModule();

      if (!LocalAuthentication) {
        setBiometricAvailable(false);
        setBiometricEnabled(false);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const enabledFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      setBiometricAvailable(hasHardware && isEnrolled);
      setBiometricEnabled(enabledFlag === 'true');

      if (enabledFlag === 'true') {
        const biometricEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
        if (biometricEmail) {
          setEmail(biometricEmail);
        }
      }
    } catch (error) {
      logger.warn('Erro ao verificar biometria:', error);
      setBiometricAvailable(false);
      setBiometricEnabled(false);
    }
  };

  const carregarRateLimit = async () => {
    try {
      const rateLimitData = await CacheManager.get<LoginRateLimitData>(
        CacheNamespaces.USER_PREFS,
        'login_rate_limit'
      );

      if (!rateLimitData?.lockUntil) {
        setLockUntil(null);
        return;
      }

      if (rateLimitData.lockUntil > Date.now()) {
        setLockUntil(rateLimitData.lockUntil);
      } else {
        await CacheManager.remove(CacheNamespaces.USER_PREFS, 'login_rate_limit');
        setLockUntil(null);
      }
    } catch (error) {
      logger.warn('Erro ao carregar rate limit de login:', error);
    }
  };

  const limparRateLimit = async () => {
    setLockUntil(null);
    await CacheManager.remove(CacheNamespaces.USER_PREFS, 'login_rate_limit');
  };

  const registrarTentativaFalha = async () => {
    const now = Date.now();
    try {
      const current = await CacheManager.get<LoginRateLimitData>(
        CacheNamespaces.USER_PREFS,
        'login_rate_limit'
      );

      let nextData: LoginRateLimitData;

      if (!current || now - current.windowStartedAt > WINDOW_MS) {
        nextData = {
          attempts: 1,
          windowStartedAt: now,
        };
      } else {
        nextData = {
          attempts: current.attempts + 1,
          windowStartedAt: current.windowStartedAt,
        };
      }

      if (nextData.attempts >= MAX_LOGIN_ATTEMPTS) {
        nextData.lockUntil = now + LOCK_MS;
        setLockUntil(nextData.lockUntil);
      }

      await CacheManager.set(CacheNamespaces.USER_PREFS, 'login_rate_limit', nextData);
    } catch (error) {
      logger.warn('Erro ao registrar tentativa de login:', error);
    }
  };

  const checkBackendRateLimit = async (normalizedEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<BackendRateLimitResponse>('auth-rate-limit', {
        body: { email: normalizedEmail, action: 'check' },
      });

      if (error) return { blocked: false, retryAfterMinutes: 0 };

      if (data?.blocked) {
        const lockTimestamp = data.lock_until
          ? new Date(data.lock_until).getTime()
          : Date.now() + (data.retry_after_minutes ?? 30) * 60000;
        setLockUntil(lockTimestamp);
      }

      return {
        blocked: Boolean(data?.blocked),
        retryAfterMinutes: data?.retry_after_minutes ?? 0,
      };
    } catch (error) {
      return { blocked: false, retryAfterMinutes: 0 };
    }
  };

  const registrarTentativaFalhaBackend = async (normalizedEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<BackendRateLimitResponse>('auth-rate-limit', {
        body: { email: normalizedEmail, action: 'failure' },
      });

      if (error) return { blocked: false, retryAfterMinutes: 0 };

      if (data?.blocked) {
        const lockTimestamp = data.lock_until
          ? new Date(data.lock_until).getTime()
          : Date.now() + (data.retry_after_minutes ?? 30) * 60000;
        setLockUntil(lockTimestamp);
      }

      return {
        blocked: Boolean(data?.blocked),
        retryAfterMinutes: data?.retry_after_minutes ?? 0,
      };
    } catch (error) {
      return { blocked: false, retryAfterMinutes: 0 };
    }
  };

  const limparRateLimitBackend = async (normalizedEmail: string) => {
    try {
      await supabase.functions.invoke<BackendRateLimitResponse>('auth-rate-limit', {
        body: { email: normalizedEmail, action: 'success' },
      });
    } catch (error) {}
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      await triggerErrorFeedback('Biometria não está disponível neste dispositivo');
      return;
    }

    const LocalAuthentication = getLocalAuthenticationModule();

    if (!LocalAuthentication) {
      await triggerErrorFeedback('Biometria indisponível neste build. Use login com senha.');
      return;
    }

    try {
      setBiometricLoading(true);

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Entrar com biometria',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      if (!authResult.success) {
        await triggerErrorFeedback('Autenticação biométrica cancelada ou falhou');
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        await triggerErrorFeedback('Sessão expirada. Faça login com e-mail e senha.');
        return;
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {}

      showToast('Login com biometria realizado!', 'success');
      router.replace('/(app)');
    } catch (error) {
      logger.error('Erro no login biométrico:', error);
      await triggerErrorFeedback('Não foi possível autenticar com biometria');
    } finally {
      setBiometricLoading(false);
    }
  };

  const carregarDadosSalvos = async () => {
    try {
      const dadosSalvos = await CacheManager.get<{ email: string; lembrarMe: boolean }>(
        CacheNamespaces.USER_PREFS,
        'login_data'
      );
      
      if (dadosSalvos) {
        setEmail(dadosSalvos.email);
        setPassword('');
        setLembrarMe(dadosSalvos.lembrarMe);
      }
    } catch (error) {}
  };

  const salvarDados = async () => {
    try {
      if (lembrarMe) {
        await CacheManager.set(
          CacheNamespaces.USER_PREFS,
          'login_data',
          { email, lembrarMe }
        );
      } else {
        await CacheManager.remove(CacheNamespaces.USER_PREFS, 'login_data');
      }
    } catch (error) {}
  };

  const triggerErrorFeedback = async (message: string) => {
    showToast(message, 'error');
    shakeOffset.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (lockUntil && lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((lockUntil - Date.now()) / 60000);
      await triggerErrorFeedback(`Muitas tentativas. Tente novamente em ${minutesLeft} min.`);
      return;
    }

    if (!normalizedEmail || !password) {
      if (!normalizedEmail) setFieldError('email', 'Informe seu e-mail');
      if (!password) setFieldError('password', 'Informe sua senha');
      await triggerErrorFeedback('Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setFieldError('email', 'Digite um e-mail válido');
      await triggerErrorFeedback('Digite um e-mail válido');
      return;
    }

    try {
      setLoading(true);
      setFieldErrors({});

      const backendCheck = await checkBackendRateLimit(normalizedEmail);
      if (backendCheck.blocked) {
        const retry = backendCheck.retryAfterMinutes || 30;
        await triggerErrorFeedback(`Muitas tentativas. Tente novamente em ${retry} min.`);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      
      if (error) {
        await registrarTentativaFalha();
        const backendFailure = await registrarTentativaFalhaBackend(normalizedEmail);

        if (backendFailure.blocked) {
          const retry = backendFailure.retryAfterMinutes || 30;
          await triggerErrorFeedback(`Muitas tentativas. Tente novamente em ${retry} min.`);
          return;
        }

        setFieldError('email', 'Credenciais inválidas');
        setFieldError('password', 'Credenciais inválidas');
        await triggerErrorFeedback('E-mail ou senha inválidos, por favor verifique!');
        return;
      }

      if (!data?.user) {
        await registrarTentativaFalha();
        const backendFailure = await registrarTentativaFalhaBackend(normalizedEmail);

        if (backendFailure.blocked) {
          const retry = backendFailure.retryAfterMinutes || 30;
          await triggerErrorFeedback(`Muitas tentativas. Tente novamente em ${retry} min.`);
          return;
        }

        setFieldError('email', 'Usuário não encontrado');
        await triggerErrorFeedback('Usuário não encontrado após login');
        return;
      }

      await limparRateLimit();
      await limparRateLimitBackend(normalizedEmail);
      await salvarDados();

      if (biometricAvailable) {
        Alert.alert(
          'Login Biométrico',
          'Deseja salvar seus dados para entrar com a biometria no futuro?',
          [
            {
              text: 'Agora não',
              style: 'cancel',
              onPress: () => {
                // Remove a configuração de biometria se o usuário recusar
                SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
                SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
                setBiometricEnabled(false);
              },
            },
            {
              text: 'Sim',
              onPress: async () => {
                await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
                await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, normalizedEmail);
                setBiometricEnabled(true);
                showToast('Login com biometria ativado!', 'success');
              },
            },
          ]
        );
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {}

      showToast('Login realizado com sucesso!', 'success');
      router.replace('/(app)');
      
    } catch (error: any) {
      await registrarTentativaFalha();
      await registrarTentativaFalhaBackend(normalizedEmail);
      await triggerErrorFeedback('E-mail ou senha inválidos, por favor verifique!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text
              style={styles.title}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Bem-vindo ao BusinessApp
            </Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>
          </View>

          <View>
            <Animated.View style={[styles.form, shakeStyle, { backgroundColor: colors.surface }]}>
              
              {toastMessage ? (
                <View
                  accessible
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.toastContainer,
                    {
                      backgroundColor:
                        toastType === 'success'
                          ? colors.success
                          : toastType === 'warning'
                            ? colors.warning
                            : colors.error,
                    },
                  ]}
                >
                  <Ionicons
                    name={toastType === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                    fieldErrors.email && { borderColor: colors.error },
                  ]}
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearFieldError('email');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  autoCorrect={false}
                  textContentType="emailAddress"
                  accessibilityLabel="Campo de e-mail"
                  accessibilityHint="Digite seu e-mail para entrar"
                />
                {fieldErrors.email ? <Text style={[styles.inlineErrorText, { color: colors.error }]}>{fieldErrors.email}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[
                      styles.input,
                      styles.passwordInput,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                      fieldErrors.password && { borderColor: colors.error },
                    ]}
                    placeholder="Digite sua senha"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearFieldError('password');
                    }}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={colors.textTertiary}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    textContentType="password"
                    accessibilityLabel="Campo de senha"
                    accessibilityHint="Digite sua senha para entrar"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    accessibilityHint="Alterna a visibilidade da senha"
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={24} 
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {fieldErrors.password ? <Text style={[styles.inlineErrorText, { color: colors.error }]}>{fieldErrors.password}</Text> : null}
              </View>

              <View style={styles.rememberContainer}>
                <View style={styles.checkboxContainer}>
                    <TouchableOpacity 
                      style={[styles.checkbox, { backgroundColor: colors.background, borderColor: colors.border }, lembrarMe && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setLembrarMe(!lembrarMe)}
                      accessibilityRole="checkbox"
                      accessibilityLabel="Lembrar de mim"
                      accessibilityState={{ checked: lembrarMe }}
                      accessibilityHint="Ative para lembrar seu e-mail neste dispositivo"
                    >
                      {lembrarMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </TouchableOpacity>
                  <Text style={[styles.rememberText, { color: colors.textSecondary }]}>Lembrar-me</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Esqueci minha senha"
                  accessibilityHint="Abre recuperação de senha"
                >
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              </View>

              {biometricAvailable && biometricEnabled ? (
                <Button
                  variant="outline"
                  size="medium"
                  onPress={handleBiometricLogin}
                  disabled={biometricLoading || loading}
                  loading={biometricLoading}
                  icon="finger-print-outline"
                  fullWidth
                  style={{ marginBottom: 12 }}
                >
                  Entrar com biometria
                </Button>
              ) : null}

              <Button
                variant="primary"
                size="large"
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                fullWidth
                style={{ marginBottom: 16 }}
              >
                Entrar
              </Button>

              <View style={styles.signupContainer}>
                <Text style={[styles.signupText, { color: colors.textSecondary }]}>Ainda não tem uma conta? </Text>
                <Link href="/(auth)/cadastro" asChild>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Criar conta"
                    accessibilityHint="Abre a tela de cadastro"
                  >
                    <Text style={[styles.signupLink, { color: colors.primary }]}>Criar conta</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity
                style={styles.trialButton}
                accessibilityRole="button"
                accessibilityLabel="Fazer teste grátis"
              >
                <Text style={[styles.trialText, { color: colors.successDark }]}>Faça seu teste grátis agora!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportButton}
                accessibilityRole="button"
                accessibilityLabel="Falar com o suporte"
              >
                <Ionicons name="logo-whatsapp" size={20} color={colors.link} />
                <Text style={[styles.supportText, { color: colors.link }]}>Falar com o Suporte</Text>
              </TouchableOpacity>

              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                Ao realizar login você concorda com nossos{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>termos de uso</Text> e{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>política de privacidade</Text>
              </Text>

            </Animated.View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
    width: '100%',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textOnPrimarySecondary,
    textAlign: 'center',
  },
  form: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: colors.shadow,
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
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
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
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 14,
  },
  inlineErrorText: {
    marginTop: 6,
    fontSize: 12,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  trialButton: {
    marginBottom: 16,
  },
  trialText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  supportText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '500',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});