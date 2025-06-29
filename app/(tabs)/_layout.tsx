import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="profile" 
        options={{
          headerShown: true,
          title: 'Perfil',
        }}
      />
    </Stack>
  );
}
