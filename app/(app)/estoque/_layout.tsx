import { Stack } from 'expo-router';
import { TouchableOpacity, View, Alert, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { theme } from '@utils/theme';

export default function EstoqueLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.primary
        },
        headerShadowVisible: false,
        headerLeft: () => <DrawerToggleButton tintColor={theme.colors.primary} />,
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
                <Ionicons name="list" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/estoque/novo')}
              >
                <Ionicons name="add" size={24} color={theme.colors.primary} />
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
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
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