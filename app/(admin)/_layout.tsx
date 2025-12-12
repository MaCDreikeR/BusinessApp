import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function AdminLayout() {
  const { role, loading, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
  };

  useEffect(() => {
    // Se o carregamento terminou e o usuário não é super_admin, expulsa ele da rota
    // MAS só redireciona se role estiver definido (não null)
    if (!loading && role && role !== 'super_admin') {
      router.replace('/(app)'); 
    }
  }, [role, loading, router]);

  // Tela de loading enquanto verifica a permissão
  // Mostra loading se ainda está carregando OU se role ainda não foi definido
  if (loading || !role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Se não for super_admin, retorna null (o useEffect vai redirecionar)
  if (role !== 'super_admin') {
    return null;
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
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginRight: 16, padding: 8 }}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color="#ff0000ff" />
          </TouchableOpacity>
        ),
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
        name="planos"
        options={{
          title: 'Planos',
          headerTitle: 'Gerenciar Planos',
          tabBarIcon: ({ color }) => <FontAwesome5 name="tags" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          headerTitle: 'Logs de Atividades',
          tabBarIcon: ({ color }) => <FontAwesome5 name="history" size={24} color={color} />,
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
      <Tabs.Screen
        name="assinaturas"
        options={{
          href: null, // Oculta do tab navigator
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="conta-detalhes/[id]"
        options={{
          href: null, // Oculta do tab navigator
          headerShown: false,
        }}
      />
    </Tabs>
  );
}