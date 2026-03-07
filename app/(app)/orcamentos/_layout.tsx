import { Stack } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';

export default function OrcamentosLayout() {
  const { colors } = useTheme();

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
          headerTintColor: colors.primary
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

