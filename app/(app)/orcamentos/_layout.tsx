import { Stack } from 'expo-router';
import { theme } from '@utils/theme';

export default function OrcamentosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Orçamentos'
        }}
      />
      <Stack.Screen
        name="novo"
        options={{
          title: 'Novo Orçamento',
          headerShown: true,
          headerBackTitle: 'Voltar',
          headerStyle: {
            backgroundColor: colors.surface
          },
          headerTintColor: theme.colors.primary
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalhes do Orçamento'
        }}
      />
    </Stack>
  );
} 