import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();

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