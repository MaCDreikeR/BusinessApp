import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_TIME_KEY = '@hasSeenWelcome';

export const useFirstTime = () => {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Função unificada para ler storage (mobile/web)
  const getStorageValue = async (): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return localStorage.getItem(FIRST_TIME_KEY);
    }
    return AsyncStorage.getItem(FIRST_TIME_KEY);
  };

  // Função unificada para escrever storage (mobile/web)
  const setStorageValue = async (value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem(FIRST_TIME_KEY, value);
      return;
    }
    return AsyncStorage.setItem(FIRST_TIME_KEY, value);
  };

  const checkFirstTime = async () => {
    try {
      setLoading(true);
      const hasSeenWelcome = await getStorageValue();
      setIsFirstTime(hasSeenWelcome === null);
    } catch (error) {
      console.error('Erro ao verificar primeira visita:', error);
      setIsFirstTime(false);
    } finally {
      setLoading(false);
    }
  };

  const markAsNotFirstTime = async () => {
    try {
      await setStorageValue('true');
      setIsFirstTime(false);
    } catch (error) {
      console.error('Erro ao marcar primeira visita:', error);
    }
  };

  useEffect(() => {
    checkFirstTime();
  }, []);

  return {
    isFirstTime,
    loading,
    markAsNotFirstTime,
    recheckFirstTime: checkFirstTime,
  };
};