import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkFirstTime();
        // Apenas verifica se tem sessão, sem tentar carregar dados
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isFirstTime) {
          if (session) {
            if (segments[0] !== '(app)') {
              router.replace('/');
            }
          } else {
            if (segments[0] !== '(auth)' || segments[1] === 'boas-vindas') {
              router.replace('/login');
            }
          }
        } else {
          // Se for a primeira vez, redireciona para a tela de boas-vindas
          if (segments[0] !== '(auth)' || segments[1] !== 'boas-vindas') {
            router.replace('/boas-vindas');
          }
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const checkFirstTime = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
      if (!hasSeenWelcome) {
        setIsFirstTime(true);
      } else {
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error('Erro ao verificar primeira visita:', error);
    }
  };

  if (isLoading) {
    return <View />;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
