import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../../components/Themed';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  is_principal: boolean;
  avatar_url?: string;
  created_at: string;
}

export default function ListaUsuariosScreen() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrincipal, setIsPrincipal] = useState(false);

  useEffect(() => {
    verificarPrincipal();
    carregarUsuarios();
  }, []);

  async function verificarPrincipal() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('is_principal')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsPrincipal(usuario?.is_principal || false);
    } catch (error) {
      console.error('Erro ao verificar usuário principal:', error);
    }
  }

  async function carregarUsuarios() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Se for principal, carrega todos os usuários
      if (isPrincipal) {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('faz_atendimento', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsuarios(data || []);
      } else {
        // Se não for principal, carrega apenas o próprio usuário
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUsuarios(data ? [data] : []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError('Erro ao carregar usuários. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    carregarUsuarios();
  }, [isPrincipal]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <ThemedText style={styles.loadingText}>Carregando usuários...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={carregarUsuarios}
        >
          <ThemedText style={styles.retryButtonText}>Tentar Novamente</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header com botão adicionar */}
      {isPrincipal && (
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Usuários</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/usuarios/novo')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>Novo Usuário</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {usuarios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#666" />
            <ThemedText style={styles.emptyText}>Nenhum usuário encontrado</ThemedText>
          </View>
        ) : (
          usuarios.map(usuario => (
            <TouchableOpacity
              key={usuario.id}
              onPress={() => router.push('/usuarios/perfil')}
              style={styles.cardContainer}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.userIcon}>
                    {usuario.avatar_url ? (
                      <Image 
                        source={{ 
                          uri: `${usuario.avatar_url}?v=${Date.now()}`,
                          headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                          }
                        }} 
                        style={styles.userAvatar} 
                      />
                    ) : (
                      <ThemedText style={styles.userInitials}>
                        {usuario.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <ThemedText style={styles.nome}>{usuario.nome_completo}</ThemedText>
                    <ThemedText style={styles.info}>{usuario.email}</ThemedText>
                    {usuario.telefone && (
                      <ThemedText style={styles.info}>{usuario.telefone}</ThemedText>
                    )}
                  </View>
                </View>
                <View style={styles.badgesContainer}>
                  {usuario.is_principal && (
                    <View style={[styles.badge, styles.principalBadge]}>
                      <ThemedText style={styles.badgeText}>Principal</ThemedText>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  userInfo: {
    flex: 1,
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  info: {
    fontSize: 14,
    marginBottom: 2,
    color: '#666',
  },
  data: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  principalBadge: {
    backgroundColor: '#7C3AED',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 