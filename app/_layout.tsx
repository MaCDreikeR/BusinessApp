import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, Dimensions, PixelRatio } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Componente "Porteiro" que contém a lógica de redirecionamento
const MainLayout = () => {
  const { user, role, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [hasBootRendered, setHasBootRendered] = useState(false);
  const lastRedirectRef = React.useRef<string | null>(null);

  const safeReplace = (path: string) => {
    if (lastRedirectRef.current !== path) {
      lastRedirectRef.current = path;
      // Tipagem do expo-router é mais restrita; para rotas absolutas conhecidas, fazemos cast seguro
      router.replace(path as any);
    }
  };

  useEffect(() => {
    // Verifica se é a primeira vez que o usuário abre o app
    const checkFirstTime = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
        setIsFirstTime(hasSeenWelcome === null);
      } catch (error) {
        console.error('Erro ao verificar primeira visita:', error);
        setIsFirstTime(false);
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
    // Espera o AuthContext e a verificação de primeira visita terminarem
    if ((authLoading && !hasBootRendered) || isFirstTime === null) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inAdminGroup = segments[0] === '(admin)';

  console.log('[MainLayout] segments=', segments, 'role=', role, 'authLoading=', authLoading, 'isFirstTime=', isFirstTime, 'hasBootRendered=', hasBootRendered);

    // Lógica de redirecionamento (primeira visita)
    if (isFirstTime) {
      // Permite acessar login/cadastro mesmo se o flag ainda não foi revalidado,
      // para evitar loop de navegação quando o usuário sai da tela de boas-vindas.
      const currentPage = (segments as string[])[1];
      const isAuthAllowed = inAuthGroup && (currentPage === 'login' || currentPage === 'cadastro');
      if (!isAuthAllowed) {
        // Se for a primeira vez, força a ida para a tela de boas-vindas
        if (currentPage !== 'boas-vindas') {
          safeReplace('/(auth)/boas-vindas');
        }
        return;
      }
    }

    if (!user && !inAuthGroup) {
      // 3. Se não é a primeira vez E não está logado, manda para o login
      safeReplace('/(auth)/login');
      return;
    }

    if (user && role === 'super_admin') {
      // Superusuário: só pode acessar rotas do grupo (admin)
      if (!inAdminGroup) {
        safeReplace('/(admin)/dashboard');
        return;
      }
      // Se já está em (admin), não faz nada
      return;
    }

    if (user && role && role !== 'super_admin') {
      // Usuário comum: só pode acessar rotas do grupo (app)
      if (!inAppGroup) {
        safeReplace('/(app)');
        return;
      }
      // Se já está em (app), não faz nada
      return;
    }
    // marca que já renderizamos pelo menos uma vez após boot
    if (!hasBootRendered) setHasBootRendered(true);
  }, [user, role, authLoading, isFirstTime, segments, router]);

  // Enquanto carrega, mostra uma tela de loading
  if ((authLoading && !hasBootRendered) || isFirstTime === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      {/* Diagnóstico silencioso quando o watchdog atuou (apenas logs no console) */}
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
      console.log('🔧 CORREÇÃO DPI ATIVADA - Densidade:', density, 'DPI:', Math.round(density * 160));
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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <DPIWrapper>
        <MainLayout />
      </DPIWrapper>
    </AuthProvider>
  );
}