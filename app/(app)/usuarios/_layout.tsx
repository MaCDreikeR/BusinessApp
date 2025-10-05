import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';

export default function UsuariosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#7C3AED',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerLeft: () => <DrawerToggleButton tintColor="#7C3AED" />,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Usuários',
          headerShown: true,
        }}
      />
      <Stack.Screen
       name="[id]"
        options={{
           headerShown: false }} />
      <Stack.Screen
        name="perfil"
        options={{
          title: 'Editar Perfil',
          headerShown: true,
        }}
      />
    </Stack>
  );
} 