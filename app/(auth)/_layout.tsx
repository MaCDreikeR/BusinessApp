import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthLayout() {
  const [session, setSession] = useState(null);
  const { colors } = useTheme();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.debug('Erro ao obter sessão:', error.message);
          setSession(null);
          return;
        }

        setSession(session);
      } catch (error) {
        logger.debug('Erro ao inicializar auth:', error);
        setSession(null);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top']}>
      <StatusBar style="light" backgroundColor={colors.primary} translucent={false} />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="boas-vindas" />
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
        </Stack>
      </View>
    </SafeAreaView>
  );
} 