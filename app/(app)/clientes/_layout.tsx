import { Stack } from 'expo-router';

export default function ClientesLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        headerLeft: () => null,
        gestureEnabled: true
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="novo" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="selecionar-contato" />
    </Stack>
  );
} 