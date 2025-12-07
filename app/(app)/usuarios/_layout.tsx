import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { theme } from '@utils/theme';

export default function UsuariosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: 'theme.colors.primary',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerLeft: () => <DrawerToggleButton tintColor="theme.colors.primary" />,
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