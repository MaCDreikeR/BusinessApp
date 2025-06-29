import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('@hasSeenWelcome');
        if (!hasSeenWelcome) {
          router.replace('/(auth)/boas-vindas');
        }
      } catch (error) {
        console.error('Erro ao verificar primeira visita:', error);
      }
    };

    checkFirstTime();
  }, []);

  return <Redirect href="/(auth)/boas-vindas" />;
} 