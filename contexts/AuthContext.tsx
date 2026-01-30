// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { CacheManager, CacheNamespaces } from '../utils/cacheManager';
import { syncService } from '../services/syncService';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  estabelecimentoId: string | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  estabelecimentoId: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Buscar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('estabelecimento_id, role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setEstabelecimentoId(data.estabelecimento_id);
        setRole(data.role);

        // Salvar no cache
        await CacheManager.set(
          CacheNamespaces.AUTH,
          'profile',
          { estabelecimento_id: data.estabelecimento_id, role: data.role, user_id: userId },
          7 * 24 * 60 * 60 * 1000
        );

        // Verificar status da conta (se não for super_admin)
        if (data.role !== 'super_admin' && data.estabelecimento_id) {
          const { data: estabelecimento } = await supabase
            .from('estabelecimentos')
            .select('status')
            .eq('id', data.estabelecimento_id)
            .single();

          if (estabelecimento && estabelecimento.status !== 'ativa') {
            await supabase.auth.signOut();
            Alert.alert('Acesso Negado', `Sua conta está ${estabelecimento.status}.`);
            return;
          }
        }

        // Inicializar sync
        if (data.estabelecimento_id) {
          syncService.initialize().then(() => {
            syncService.sync(data.estabelecimento_id);
          }).catch(err => logger.error('Erro sync:', err));
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar perfil:', error);
      
      // Tentar recuperar do cache
      try {
        const cached = await CacheManager.get<any>(CacheNamespaces.AUTH, 'profile');
        if (cached && cached.user_id === userId) {
          setEstabelecimentoId(cached.estabelecimento_id);
          setRole(cached.role);
        }
      } catch {}
    }
  };

  useEffect(() => {
    // Carrega sessão inicial
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        logger.error('Erro ao inicializar auth:', error);
        setSession(null);
        setUser(null);
        setEstabelecimentoId(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listener de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info(`Auth event: ${event}`);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && event === 'SIGNED_IN') {
          await loadUserProfile(session.user.id);
        }

        if (event === 'SIGNED_OUT') {
          setEstabelecimentoId(null);
          setRole(null);
          await CacheManager.remove(CacheNamespaces.AUTH, 'profile');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      syncService.stop();
    };
  }, []);

  // SignOut
  const signOut = async () => {
    try {
      syncService.stop();
      await supabase.auth.signOut();
      
      // Limpar caches
      await Promise.all([
        CacheManager.remove(CacheNamespaces.AUTH, 'profile'),
        CacheManager.clearNamespace(CacheNamespaces.VENDAS),
        CacheManager.clearNamespace(CacheNamespaces.SERVICOS),
        CacheManager.clearNamespace(CacheNamespaces.CLIENTES),
        CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS),
        CacheManager.clearNamespace(CacheNamespaces.ESTOQUE),
        CacheManager.clearNamespace(CacheNamespaces.RELATORIOS),
      ]);
      
      setUser(null);
      setSession(null);
      setEstabelecimentoId(null);
      setRole(null);
      router.replace('/(auth)/login');
    } catch (error) {
      logger.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível sair.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        estabelecimentoId,
        role,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
