import { Stack } from 'expo-router';

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
            backgroundColor: '#fff'
          },
          headerTintColor: '#7C3AED'
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