import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { View, ActivityIndicator, Dimensions, PixelRatio, Text, TouchableOpacity, Image } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCacheCleanup } from '../hooks/useCacheCleanup';
import * as SplashScreen from 'expo-splash-screen';

// Previne a splash screen de esconder automaticamente
SplashScreen.preventAutoHideAsync();

// Componente "Porteiro" que contém a lógica de redirecionamento
const MainLayout = () => {
  const { user, role, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [isCheckingFirstTime, setIsCheckingFirstTime] = useState(true);
  const [hasBootRendered, setHasBootRendered] = useState(false);
  const lastRedirectRef = React.useRef<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [shouldForceLogin, setShouldForceLogin] = useState(false);
  
  // 🔥 NOVO: Timeout absoluto com fallback garantido
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const ABSOLUTE_TIMEOUT = 20000; // 20 segundos timeout absoluto
  
  // Hook de limpeza automática de cache
  useCacheCleanup();
  
  // 🔥 Timeout absoluto com fallback garantido para login
  useEffect(() => {
    if (authLoading && !hasBootRendered) {
      logger.warn('⏱️ Iniciando timeout de segurança...');
      
      timeoutRef.current = setTimeout(() => {
        logger.error('❌ Timeout absoluto atingido! Forçando navegação para login...');
        setLoadingTimeout(true);
        setShouldForceLogin(true);
        
        // 🔥 FALLBACK GARANTIDO: Força navegação após 2 segundos
        setTimeout(() => {
          logger.error('🚑 Executando fallback de emergência...');
          setHasBootRendered(true); // Força renderização
          router.replace('/(auth)/login' as any);
        }, 2000);
      }, ABSOLUTE_TIMEOUT);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else {
      setLoadingTimeout(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [authLoading, hasBootRendered, router]);

  const safeReplace = (path: string) => {
    if (lastRedirectRef.current !== path) {
      logger.debug(`[safeReplace] Redirecionando: ${lastRedirectRef.current} → ${path}`);
      lastRedirectRef.current = path;
      // Tipagem do expo-router é mais restrita; para rotas absolutas conhecidas, fazemos cast seguro
      router.replace(path as any);
    } else {
      logger.debug(`[safeReplace] Redirecionamento ignorado (mesmo path): ${path}`);
    }
  };

  useEffect(() => {
    // Verifica se é a primeira vez que o usuário abre o app
    const checkFirstTime = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
        setIsFirstTime(hasSeenWelcome === null);
        setIsCheckingFirstTime(false); // Terminou de verificar
      } catch (error) {
        logger.error('Erro ao verificar primeira visita:', error);
        setIsFirstTime(false);
        setIsCheckingFirstTime(false);
      }
    };
    checkFirstTime();
  }, []);

  // Revalida o flag de primeira visita sempre que os segmentos mudarem
  useEffect(() => {
    const syncWelcomeFlag = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
        if (hasSeenWelcome !== null && isFirstTime !== false) {
          setIsFirstTime(false);
        }
      } catch (error) {
        // silenciosamente ignore, manteremos o estado atual
      }
    };
    syncWelcomeFlag();
  }, [segments]);

  useEffect(() => {
    // 🔥 NOVO: Força navegação se timeout for atingido
    if (shouldForceLogin && !authLoading) {
      logger.error('🚑 Forçando navegação para login devido a timeout...');
      setHasBootRendered(true);
      safeReplace('/(auth)/login');
      setShouldForceLogin(false);
      return;
    }
    
    // Espera o AuthContext e a verificação de primeira visita terminarem
    if ((authLoading && !hasBootRendered) || isCheckingFirstTime) {
      logger.debug('[MainLayout] Aguardando carregamento...', { authLoading, hasBootRendered, isCheckingFirstTime });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inAdminGroup = segments[0] === '(admin)';
    const inRoot = segments.length === 0; // Está no index.tsx raiz

    logger.debug('[MainLayout] Estado atual:', { segments, role, user: !!user, authLoading, isFirstTime, hasBootRendered });

    // 1. PRIMEIRA PRIORIDADE: Se é a primeira vez, força boas-vindas
    if (isFirstTime) {
      const currentPage = (segments as string[])[1];
      // Se está na raiz ou não está em boas-vindas, redireciona
      if (inRoot || currentPage !== 'boas-vindas') {
        safeReplace('/(auth)/boas-vindas');
        // Marca como renderizado para esconder splash
        if (!hasBootRendered) setHasBootRendered(true);
        return;
      }
      // Se já está em boas-vindas, marca como renderizado
      if (!hasBootRendered) setHasBootRendered(true);
      return;
    }

    // 2. Se está na raiz e não é primeira vez, decide baseado em autenticação
    if (inRoot) {
      if (!user) {
        safeReplace('/(auth)/login');
        if (!hasBootRendered) setHasBootRendered(true);
        return;
      }
      // Aguarda role ser carregado antes de redirecionar
      if (!role) {
        logger.debug('[MainLayout] Aguardando role na raiz...');
        return;
      }
      if (role === 'super_admin') {
        logger.debug('[MainLayout] Redirecionando super_admin da raiz para dashboard');
        safeReplace('/(admin)/dashboard');
        return;
      }
      safeReplace('/(app)');
      return;
    }

    if (!user && !inAuthGroup) {
      // 3. Se não é a primeira vez E não está logado, manda para o login
      safeReplace('/(auth)/login');
      return;
    }

    // Se está logado mas role ainda não foi carregado, aguarda
    if (user && !role) {
      logger.debug('[MainLayout] Usuário logado, aguardando role...');
      return;
    }

    if (user && role === 'super_admin') {
      // Superusuário: só pode acessar rotas do grupo (admin)
      if (!inAdminGroup) {
        logger.debug('[MainLayout] Super admin detectado, redirecionando para dashboard admin', { segments });
        // Se está tentando ir para (app), reseta o lastRedirect para forçar redirecionamento
        if (inAppGroup) {
          lastRedirectRef.current = null;
        }
        safeReplace('/(admin)/dashboard');
        return;
      }
      // Se já está em (admin), não faz nada e marca como renderizado
      logger.debug('[MainLayout] Super admin já está em (admin), mantendo posição', { segments });
      if (!hasBootRendered) {
        setHasBootRendered(true);
      }
      return;
    }

    if (user && role && role !== 'super_admin') {
      // Usuário comum: só pode acessar rotas do grupo (app)
      if (!inAppGroup) {
        logger.debug('[MainLayout] Usuário comum redirecionando para (app)', { role, segments });
        safeReplace('/(app)');
        return;
      }
      // Se já está em (app), não faz nada
      return;
    }
    // marca que já renderizamos pelo menos uma vez após boot
    if (!hasBootRendered) setHasBootRendered(true);
  }, [user, role, authLoading, isFirstTime, isCheckingFirstTime, segments, router]);

  // Esconde a splash screen quando não estiver mais carregando
  useEffect(() => {
    if (!authLoading && !isCheckingFirstTime && hasBootRendered) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, isCheckingFirstTime, hasBootRendered]);

  // Enquanto carrega, mantém a splash nativa e não renderiza nada
  if ((authLoading && !hasBootRendered) || isCheckingFirstTime) {
    // Mantém a splash screen nativa visível
    return null;
  }

  // Tela de erro de timeout de conexão
  if (loadingTimeout) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#ffffff',
        padding: 20 
      }}>
        {/* Logo do app */}
        <View style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          overflow: 'hidden',
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          backgroundColor: '#fff',
        }}>
          <Image 
            source={require('../assets/images/icon.png')}
            style={{ 
              width: '100%', 
              height: '100%', 
              resizeMode: 'contain'
            }}
          />
        </View>

        {/* Nome do app */}
        <Text style={{ 
          fontSize: 28, 
          fontWeight: '600', 
          color: '#000', 
          marginBottom: 48
        }}>
          BusinessApp
        </Text>

        {/* Mensagem de erro */}
        <View style={{ marginTop: 32, alignItems: 'center', maxWidth: 320 }}>
          <View style={{
              backgroundColor: '#FEF2F2',
              paddingHorizontal: 24,
              paddingVertical: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#FEE2E2',
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#DC2626', 
                textAlign: 'center', 
                marginBottom: 8 
              }}>
                ⚠️ Problema de Conexão
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280', 
                textAlign: 'center', 
                lineHeight: 20 
              }}>
                Não foi possível conectar ao servidor. Verifique sua conexão com a internet.
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.replace('/(auth)/login' as any)}
              style={{ 
                marginTop: 24, 
                backgroundColor: '#7C3AED', 
                paddingHorizontal: 32, 
                paddingVertical: 16, 
                borderRadius: 12,
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text style={{ 
                color: '#fff', 
                fontWeight: '600',
                fontSize: 15
              }}>
                Tentar Novamente
              </Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SÓ renderiza Stack depois de verificar tudo
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
};

// Componente de correção DPI
const DPIWrapper = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = Dimensions.get('window');
  const density = PixelRatio.get();
  
  // Detecção e correção para 274 DPI
  const is274DPI = density >= 1.6 && density <= 1.8;
  
  useEffect(() => {
    if (is274DPI) {
      logger.info('🔧 CORREÇÃO DPI ATIVADA', { density, dpi: Math.round(density * 160) });
    }
  }, [density, is274DPI]);
  
  if (is274DPI) {
    // Para 274 DPI: aplica escala para ocupar tela completa
    return (
      <View style={{
        flex: 1,
        transform: [{ scale: 1.17 }], // 320/274 ≈ 1.168
        width: width / 1.17,
        height: height / 1.17,
      }}>
        {children}
      </View>
    );
  }
  
  // Para outras densidades: comportamento normal
  return <View style={{ flex: 1 }}>{children}</View>;
};

// Componente raiz que "envolve" todo o aplicativo com o provedor de autenticação
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    FontAwesome: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
    FontAwesome5_Solid: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    FontAwesome5_Regular: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
    MaterialCommunityIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });
  
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // Timeout visual após 15 segundos
  useEffect(() => {
    if (!fontsLoaded) {
      const timer = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        {showTimeoutWarning && (
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>
              ⚠️ Problema de conexão detectado
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
              Verifique sua internet e tente novamente
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DPIWrapper>
            <MainLayout />
          </DPIWrapper>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}