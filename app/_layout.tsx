import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, Dimensions, PixelRatio, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

// Componente "Porteiro" que contém a lógica de redirecionamento
const MainLayout = () => {
  const { user, role, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Verifica se é a primeira vez que o usuário abre o app
    const checkFirstTime = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
        setIsFirstTime(hasSeenWelcome === null);
      } catch (error) {
        console.error('Erro ao verificar primeira visita:', error);
        setIsFirstTime(false); // Assume que não é a primeira vez em caso de erro
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
    if (authLoading || isFirstTime === null) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inAdminGroup = segments[0] === '(admin)';

    console.log('[MainLayout] Current segments:', segments);
    console.log('[MainLayout] User role:', role);
    console.log('[MainLayout] In admin group:', inAdminGroup);

    // 2. Lógica de redirecionamento
    if (isFirstTime) {
      // Permite acessar login/cadastro mesmo se o flag ainda não foi revalidado,
      // para evitar loop de navegação quando o usuário sai da tela de boas-vindas.
      const isAuthAllowed = inAuthGroup && (segments[1] === 'login' || segments[1] === 'cadastro');
      if (!isAuthAllowed) {
        // Se for a primeira vez, força a ida para a tela de boas-vindas
        if (segments[1] !== 'boas-vindas') {
          router.replace('/(auth)/boas-vindas');
        }
        return;
      }
    }

    if (!user && !inAuthGroup) {
      // 3. Se não é a primeira vez E não está logado, manda para o login
      router.replace('/(auth)/login');
      return;
    }

    if (user && role === 'super_admin') {
      // Superusuário: só pode acessar rotas do grupo (admin)
      if (!inAdminGroup) {
        router.replace('/(admin)/dashboard');
        return;
      }
      // Se já está em (admin), não faz nada
      return;
    }

    if (user && role && role !== 'super_admin') {
      // Usuário comum: só pode acessar rotas do grupo (app)
      if (!inAppGroup) {
        router.replace('/(app)');
        return;
      }
      // Se já está em (app), não faz nada
      return;
    }
  }, [user, role, authLoading, isFirstTime, segments, router]);

  // Enquanto carrega, mostra uma tela de loading para evitar "piscar" a tela
  if (authLoading || isFirstTime === null) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    );
  }
  
  // O Stack gerencia as telas. O Expo Router cuida do resto.
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      {Platform.OS === 'web' && <PWAInstallBanner />}
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
  return (
    <AuthProvider>
      <DPIWrapper>
        <MainLayout />
      </DPIWrapper>
    </AuthProvider>
  );
}