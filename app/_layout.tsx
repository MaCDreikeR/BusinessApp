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
import { debugLogger } from '../utils/debugLogger';

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
  const roleWaitSinceRef = React.useRef<number | null>(null);
  
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
        logger.error('❌ Timeout absoluto atingido! Mostrando tela de timeout...');
        setLoadingTimeout(true);
        setHasBootRendered(true); // Sai da splash para mostrar tela de timeout
      }, ABSOLUTE_TIMEOUT);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [authLoading, hasBootRendered]);

  const safeReplace = (path: string) => {
    if (lastRedirectRef.current !== path) {
      debugLogger.info('MainLayout', `safeReplace: ${lastRedirectRef.current || '(nenhum)'} → ${path}`);
      console.log(`🧗 [MainLayout] safeReplace: ${lastRedirectRef.current || '(nenhum)'} → ${path}`);
      logger.debug(`[safeReplace] Redirecionando: ${lastRedirectRef.current} → ${path}`);
      lastRedirectRef.current = path;
      // Tipagem do expo-router é mais restrita; para rotas absolutas conhecidas, fazemos cast seguro
      router.replace(path as any);
    } else {
      debugLogger.debug('MainLayout', `safeReplace: Ignorado (mesmo path): ${path}`);
      console.log(`🧗 [MainLayout] safeReplace: Ignorado (mesmo path): ${path}`);
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

  // REMOVIDO: esse effect estava causando race conditions ao revalidar com cada mudança de segments
  // A verificação inicial em checkFirstTime() é suficiente

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
      debugLogger.debug('MainLayout', 'Aguardando carregamento', { authLoading, hasBootRendered, isCheckingFirstTime });
      logger.debug('[MainLayout] Aguardando carregamento...', { authLoading, hasBootRendered, isCheckingFirstTime });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inAdminGroup = segments[0] === '(admin)';
    const inRoot = segments.length === 0; // Está no index.tsx raiz

    debugLogger.debug('MainLayout', 'Estado atual', { 
      segments: segments.join('/'), 
      role, 
      hasUser: !!user, 
      authLoading, 
      isFirstTime, 
      hasBootRendered 
    });
    logger.debug('[MainLayout] Estado atual:', { segments, role, user: !!user, authLoading, isFirstTime, hasBootRendered });
    // ⚠️ AGUARDA VERIFICAÇÃO DE PRIMEIRA VISITA ANTES DE QUALQUER REDIRECIONAMENTO
    if (isCheckingFirstTime) {
      debugLogger.debug('MainLayout', 'Ainda verificando primeira visita...');
      return;
    }
    // 1. PRIMEIRA PRIORIDADE: Se é a primeira vez, força boas-vindas
    if (isFirstTime) {
      const currentPage = (segments as string[])[1];
      // Se está na raiz ou não está em boas-vindas, redireciona
      if (inRoot || currentPage !== 'boas-vindas') {
        debugLogger.info('MainLayout', 'Primeira vez: redirecionando para boas-vindas');
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
        debugLogger.info('MainLayout', 'Na raiz sem user: redirecionando para login');
        safeReplace('/(auth)/login');
        if (!hasBootRendered) setHasBootRendered(true);
        return;
      }
      // Aguarda role ser carregado antes de redirecionar
      if (!role) {
        debugLogger.debug('MainLayout', 'Na raiz aguardando role');
        logger.debug('[MainLayout] Aguardando role na raiz...');
        return;
      }
      if (role === 'super_admin') {
        debugLogger.info('MainLayout', 'Super admin na raiz: redirecionando para dashboard');
        logger.debug('[MainLayout] Redirecionando super_admin da raiz para dashboard');
        safeReplace('/(admin)/dashboard');
          if (!hasBootRendered) setHasBootRendered(true);
          return;
      }
      debugLogger.info('MainLayout', 'User comum na raiz: redirecionando para (app)');
        if (!hasBootRendered) setHasBootRendered(true);
      safeReplace('/(app)');
      return;
    }

    if (!user && !inAuthGroup) {
      // 3. Se não é a primeira vez E não está logado, manda para o login
      debugLogger.info('MainLayout', 'Sem user fora de auth: redirecionando para login');
      safeReplace('/(auth)/login');
      return;
    }

    // Se está logado mas role ainda não foi carregado, aguarda por tempo limitado
    if (user && !role) {
      if (!roleWaitSinceRef.current) {
        roleWaitSinceRef.current = Date.now();
        debugLogger.warn('MainLayout', 'Usuário logado sem role - Iniciando espera', {
          userId: user.id,
          email: user.email
        });
        console.log('🔷 [MainLayout] Usuário logado sem role - Iniciando espera...', {
          userId: user.id,
          email: user.email
        });
      }

      const waitedMs = Date.now() - roleWaitSinceRef.current;
      
      if (waitedMs > 10000) {
        debugLogger.error('MainLayout', 'TIMEOUT aguardando role (10s) - Forçando login', {
          userId: user.id,
          waitedMs
        });
        console.error('🔴 [MainLayout] TIMEOUT aguardando role (10s) - Forçando login', {
          userId: user.id,
          waitedMs
        });
        logger.error('[MainLayout] Timeout aguardando role; redirecionando para login');
        setHasBootRendered(true);
        safeReplace('/(auth)/login');
        return;
      }

      if (waitedMs % 1000 < 100) { // Log a cada 1s
        debugLogger.debug('MainLayout', `Aguardando role... (${Math.floor(waitedMs/1000)}s)`);
        console.log(`🔷 [MainLayout] Aguardando role... (${Math.floor(waitedMs/1000)}s)`);
      }
      logger.debug('[MainLayout] Usuário logado, aguardando role...', { waitedMs });
      return;
    }

    // Reset quando role for resolvido ou user sair
    if (roleWaitSinceRef.current !== null) {
      debugLogger.info('MainLayout', 'Role resolvido! Resetando timeout', { role });
      console.log('🟢 [MainLayout] Role resolvido! Resetando timeout.', { role });
      roleWaitSinceRef.current = null;
    }

    if (user && role === 'super_admin') {
      // Superusuário: só pode acessar rotas do grupo (admin)
      if (!inAdminGroup) {
        debugLogger.info('MainLayout', 'Super admin fora de admin: redirecionando', { segments: segments.join('/') });
        logger.debug('[MainLayout] Super admin detectado, redirecionando para dashboard admin', { segments });
          if (!hasBootRendered) setHasBootRendered(true);
        safeReplace('/(admin)/dashboard');
        return;
      }
      // Se já está em (admin), não faz nada e marca como renderizado
      debugLogger.debug('MainLayout', 'Super admin já em (admin)', { segments: segments.join('/') });
      logger.debug('[MainLayout] Super admin já está em (admin), mantendo posição', { segments });
      if (!hasBootRendered) {
        setHasBootRendered(true);
      }
      return;
    }

    if (user && role && role !== 'super_admin') {
      // Usuário comum: só pode acessar rotas do grupo (app)
      if (!inAppGroup) {
        debugLogger.info('MainLayout', 'User comum fora de (app): redirecionando', { role, segments: segments.join('/') });
        logger.debug('[MainLayout] Usuário comum redirecionando para (app)', { role, segments });
          if (!hasBootRendered) setHasBootRendered(true);
        safeReplace('/(app)');
        return;
      }
      // Se já está em (app), não faz nada
        if (!hasBootRendered) setHasBootRendered(true);
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

  // Tela de erro de timeout de conexão com logo do app
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
              onPress={() => {
                // Reset do estado para tentar novamente
                setShouldForceLogin(false);
                setLoadingTimeout(false);
                setHasBootRendered(false);
                router.replace('/(auth)/login' as any);
              }}
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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
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
