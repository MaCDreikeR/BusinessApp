import { Stack , router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../../../contexts/ThemeContext';

export default function FornecedoresLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.primary
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Fornecedores',
          headerLeft: () => <DrawerToggleButton tintColor={colors.primary} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/fornecedores/novo')}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
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
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
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
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}