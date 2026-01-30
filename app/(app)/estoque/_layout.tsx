import { Stack , router } from 'expo-router';
import { TouchableOpacity, View, Alert, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EstoqueLayout() {
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
        headerLeft: () => <DrawerToggleButton tintColor={colors.primary} />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Estoque',
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 16, gap: 16 }}>
              <TouchableOpacity 
                onPress={() => {
                  DeviceEventEmitter.emit('addCategoriaProduto');
                }}
              >
                <Ionicons name="list" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/estoque/novo')}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="novo"
        options={{
          title: 'Novo Produto',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ 
                marginLeft: 0,
                padding: 8,
                marginRight: 8
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Editar Produto',
        }}
      />
    </Stack>
  );
}