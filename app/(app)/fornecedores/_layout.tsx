import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';

export default function FornecedoresLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#7C3AED',
        headerTitleStyle: {
          fontWeight: '600',
          color: '#7C3AED'
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Fornecedores',
          headerLeft: () => <DrawerToggleButton tintColor="#7C3AED" />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/fornecedores/novo')}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="add" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="novo"
        options={{
          title: 'Novo Fornecedor',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Editar Fornecedor',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
} 