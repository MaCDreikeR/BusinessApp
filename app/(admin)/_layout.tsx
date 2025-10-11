import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function AdminLayout() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se o carregamento terminou e o usuário não é super_admin, expulsa ele da rota
    if (!loading && role !== 'super_admin') {
      router.replace('/(app)'); 
    }
  }, [role, loading, router]);

  // Tela de loading enquanto verifica a permissão
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Se for super_admin, mostra a navegação com abas
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#a78bfa',
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
        },
        headerStyle: {
          backgroundColor: '#111827',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitle: 'Painel Global',
          tabBarIcon: ({ color }) => <FontAwesome5 name="tachometer-alt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Contas',
          headerTitle: 'Todas as Contas',
          tabBarIcon: ({ color }) => <FontAwesome5 name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          headerTitle: 'Configurações Globais',
          tabBarIcon: ({ color }) => <FontAwesome5 name="cog" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}