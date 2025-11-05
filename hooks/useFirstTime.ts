import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_TIME_KEY = '@hasSeenWelcome';

export const useFirstTime = () => {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkFirstTime = async () => {
    try {
      setLoading(true);
      const hasSeenWelcome = await AsyncStorage.getItem(FIRST_TIME_KEY);
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
      await AsyncStorage.setItem(FIRST_TIME_KEY, 'true');
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