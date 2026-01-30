import React, { useEffect, useState , useMemo} from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { logger } from '../../../utils/logger';
import { Usuario as UsuarioBase } from '@types';

type UsuarioLista = Pick<UsuarioBase, 'id' | 'nome_completo' | 'email' | 'telefone' | 'is_principal' | 'created_at'> & {
  avatar_url?: string;
};

export default function ListaUsuariosScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrincipal, setIsPrincipal] = useState<boolean | null>(null);

  useEffect(() => {
    verificarPrincipal();
  }, []);

  useEffect(() => {
    if (isPrincipal !== null) {
      carregarUsuarios();
    }
  }, [isPrincipal]);

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
      logger.error('Erro ao verificar usuário principal:', error);
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

      // Se for principal, carrega todos os usuários do mesmo estabelecimento
      if (isPrincipal) {
        // Primeiro busca o estabelecimento do usuário logado
        const { data: currentUser, error: userError } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;



        // TESTE TEMPORÁRIO: Busca TODOS os usuários (sem filtro)
        // Usar função RPC para contornar políticas RLS
        const { data, error } = await supabase.rpc('get_usuarios_estabelecimento', {
          estabelecimento_uuid: currentUser.estabelecimento_id
        });

        // Segundo teste: consulta específica para Borges por ID
        logger.debug('🔍 DEBUG: Buscando usuário Borges por ID...');
        const { data: borgesData, error: borgesError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', '3f09a534-8bd7-4534-9b53-60eb341ca1f3');
        
        logger.debug('👤 DEBUG: Resultado busca Borges por ID:', borgesData);
        logger.debug('❌ DEBUG: Erro busca Borges:', borgesError);

        // Terceiro teste: busca por email
        logger.debug('📧 DEBUG: Buscando usuário Borges por email...');
        const { data: borgesEmail, error: emailError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', 'fofopereira@gmail.com');
        
        logger.debug('� DEBUG: Resultado busca por email:', borgesEmail);
        logger.debug('❌ DEBUG: Erro busca por email:', emailError);

        logger.debug('🔍 DEBUG: Total usuários no DB:', data?.length);
        logger.debug('📋 DEBUG: TODOS os usuários no DB:', data?.map(u => ({
          nome: u.nome_completo,
          email: u.email,
          estabelecimento_id: u.estabelecimento_id,
          id: u.id
        })));

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
      logger.error('Erro ao carregar usuários:', error);
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
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Carregando usuários...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
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
            <Ionicons name="add" size={20} color={colors.white} />
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {usuarios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <ThemedText style={styles.emptyText}>Nenhum usuário encontrado</ThemedText>
          </View>
        ) : (
          usuarios.map(usuario => (
            <TouchableOpacity
              key={usuario.id}
              onPress={() => router.push(`/usuarios/perfil?userId=${usuario.id}`)}
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

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textTertiary,
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
    color: colors.textTertiary,
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
    backgroundColor: colors.primaryLight,
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
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text,
  },
  info: {
    fontSize: 14,
    marginBottom: 2,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
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