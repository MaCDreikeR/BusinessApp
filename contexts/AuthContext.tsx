// contexts/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { forceSupabaseReconnect, supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { Alert, AppState } from 'react-native';
import { logger } from '../utils/logger';
import { debugLogger } from '../utils/debugLogger';
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
  const appStateRevalidateTimeRef = React.useRef<number>(0); // Debounce para AppState
  const APPSTATE_REVALIDATE_DEBOUNCE = 2000; // Espera 2s entre revalidações
  const sessionUserIdRef = React.useRef<string | null>(null);
  const roleRef = React.useRef<string | null>(null);
  const estabelecimentoIdRef = React.useRef<string | null>(null);
  const revalidateInFlightRef = React.useRef<boolean>(false);
  const revalidateStartedAtRef = React.useRef<number | null>(null);
  const profileLoadPromiseRef = React.useRef<Promise<void> | null>(null);
  const APPSTATE_REVALIDATE_MAX_MS = 35000;

  const clearAuthState = useCallback(async () => {
    setSession(null);
    setUser(null);
    setEstabelecimentoId(null);
    setRole(null);
    sessionUserIdRef.current = null;
    estabelecimentoIdRef.current = null;
    roleRef.current = null;
    await CacheManager.remove(CacheNamespaces.AUTH, 'profile');
  }, []);

  // Buscar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      debugLogger.info('AuthContext', 'loadUserProfile: Buscando perfil', { userId });
      console.log('🟢 [AuthContext] loadUserProfile: Buscando perfil para userId:', userId);
      const { data, error } = await supabase
        .from('usuarios')
        .select('estabelecimento_id, role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        debugLogger.info('AuthContext', 'loadUserProfile: Perfil encontrado', {
          estabelecimento_id: data.estabelecimento_id,
          role: data.role
        });
        console.log('🟢 [AuthContext] loadUserProfile: Perfil encontrado:', {
          estabelecimento_id: data.estabelecimento_id,
          role: data.role
        });
        setEstabelecimentoId(data.estabelecimento_id);
        setRole(data.role);
        estabelecimentoIdRef.current = data.estabelecimento_id;
        roleRef.current = data.role;
        debugLogger.debug('AuthContext', 'Estados atualizados (role setado)');
        console.log('🟢 [AuthContext] loadUserProfile: Estados atualizados (role setado)');

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
      debugLogger.error('AuthContext', 'loadUserProfile: Erro ao buscar perfil', { error: String(error) });
      console.error('🔴 [AuthContext] loadUserProfile: Erro ao buscar perfil:', error);
      logger.error('Erro ao carregar perfil:', error);
      
      // Tentar recuperar do cache
      try {
        debugLogger.warn('AuthContext', 'loadUserProfile: Tentando recuperar do cache');
        console.log('🟡 [AuthContext] loadUserProfile: Tentando recuperar do cache...');
        const cached = await CacheManager.get<any>(CacheNamespaces.AUTH, 'profile');
        if (cached && cached.user_id === userId) {
          debugLogger.info('AuthContext', 'Cache recuperado', cached);
          console.log('🟡 [AuthContext] loadUserProfile: Cache recuperado:', cached);
          setEstabelecimentoId(cached.estabelecimento_id);
          setRole(cached.role);
          estabelecimentoIdRef.current = cached.estabelecimento_id;
          roleRef.current = cached.role;
        } else {
          debugLogger.warn('AuthContext', 'Cache não encontrado ou inválido');
          console.log('🟡 [AuthContext] loadUserProfile: Cache não encontrado ou inválido');
        }
      } catch (cacheError) {
        debugLogger.error('AuthContext', 'Erro ao recuperar cache', { error: String(cacheError) });
        console.error('🔴 [AuthContext] loadUserProfile: Erro ao recuperar cache:', cacheError);
      }
    }
  };

  useEffect(() => {
    const loadUserProfileSafe = async (userId: string) => {
      if (profileLoadPromiseRef.current) {
        await profileLoadPromiseRef.current;
        return;
      }

      const profilePromise = (async () => {
        await loadUserProfile(userId);
      })();

      profileLoadPromiseRef.current = profilePromise;

      try {
        await profilePromise;
      } finally {
        profileLoadPromiseRef.current = null;
      }
    };

    // Carrega sessão inicial
    const initAuth = async () => {
      try {
        debugLogger.info('AuthContext', 'initAuth: Iniciando carga de sessão');
        console.log('🔵 [AuthContext] initAuth: Iniciando carga de sessão...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        debugLogger.info('AuthContext', 'initAuth: Session obtida', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });
        console.log('🔵 [AuthContext] initAuth: Session obtida:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        setSession(session);
        setUser(session?.user ?? null);
        sessionUserIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          debugLogger.debug('AuthContext', 'initAuth: Carregando perfil do usuário');
          console.log('🔵 [AuthContext] initAuth: Carregando perfil do usuário...');
          await loadUserProfileSafe(session.user.id);
        } else {
          debugLogger.debug('AuthContext', 'initAuth: Sem sessão ativa');
          console.log('🔵 [AuthContext] initAuth: Sem sessão ativa');
        }
      } catch (error) {
        debugLogger.error('AuthContext', 'initAuth: Erro', { error: String(error) });
        console.error('🔴 [AuthContext] initAuth: Erro:', error);
        logger.error('Erro ao inicializar auth:', error);
        await clearAuthState();
      } finally {
        debugLogger.debug('AuthContext', 'initAuth: Finalizando (loading=false)');
        console.log('🔵 [AuthContext] initAuth: Finalizando (loading=false)');
        setLoading(false);
      }
    };

    initAuth();

    // Listener de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugLogger.info('AuthContext', 'onAuthStateChange', {
          event,
          hasSession: !!session,
          userId: session?.user?.id
        });
        console.log('🟣 [AuthContext] onAuthStateChange:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id
        });
        logger.info(`Auth event: ${event}`);

        setSession(session);
        setUser(session?.user ?? null);
        sessionUserIdRef.current = session?.user?.id ?? null;

        if (event === 'INITIAL_SESSION') {
          // initAuth já faz o carregamento inicial, evita corrida e duplicação.
          return;
        }

        if (event === 'SIGNED_OUT' || !session?.user) {
          debugLogger.info('AuthContext', 'onAuthStateChange: SIGNED_OUT - Limpando estados');
          console.log('🟣 [AuthContext] onAuthStateChange: SIGNED_OUT - Limpando estados');
          await clearAuthState();
          return;
        }

        // Recarrega perfil em eventos relevantes ou quando contexto ainda não está hidratado.
        if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || !roleRef.current || !estabelecimentoIdRef.current)) {
          debugLogger.debug('AuthContext', 'onAuthStateChange: Recarregando perfil');
          console.log('🟣 [AuthContext] onAuthStateChange: Recarregando perfil...');
          await loadUserProfileSafe(session.user.id);
        }
      }
    );

    // Revalida sessão/perfil ao voltar para foreground (corrige loop após app ocioso)
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      debugLogger.debug('AuthContext', 'AppState mudou', { nextState });
      console.log('🔶 [AuthContext] AppState mudou:', nextState);
      if (nextState !== 'active') return;

      // Evita lock permanente quando um ciclo antigo ficou preso por muito tempo.
      if (
        revalidateInFlightRef.current &&
        revalidateStartedAtRef.current &&
        Date.now() - revalidateStartedAtRef.current > APPSTATE_REVALIDATE_MAX_MS
      ) {
        debugLogger.warn('AuthContext', 'AppState revalidate preso - resetando lock', {
          elapsedMs: Date.now() - revalidateStartedAtRef.current,
        });
        console.warn('[AuthContext] AppState revalidate preso - resetando lock');
        revalidateInFlightRef.current = false;
        revalidateStartedAtRef.current = null;
      }

      // 🔥 Debounce: não revalida se já revalidou nos últimos 2s
      const now = Date.now();
      if (now - appStateRevalidateTimeRef.current < APPSTATE_REVALIDATE_DEBOUNCE) {
        debugLogger.debug('AuthContext', 'AppState revalidate em debounce - Ignorado');
        console.log('🔶 [AuthContext] AppState revalidate em debounce - Ignorado');
        return;
      }
      if (revalidateInFlightRef.current) {
        debugLogger.debug('AuthContext', 'AppState revalidate já em execução - Ignorado');
        console.log('🔶 [AuthContext] AppState revalidate já em execução - Ignorado');
        return;
      }

      appStateRevalidateTimeRef.current = now;
      revalidateInFlightRef.current = true;
      revalidateStartedAtRef.current = now;

      debugLogger.info('AuthContext', 'App voltou para FOREGROUND - Revalidando sessão');
      console.log('🔶 [AuthContext] App voltou para FOREGROUND - Revalidando sessão...');
      try {
        await forceSupabaseReconnect('AuthContext foreground');

        const { data: { session: activeSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        // Se sessão e perfil já estão estáveis, ignora revalidação redundante.
        if (
          activeSession?.user?.id === sessionUserIdRef.current &&
          !!roleRef.current &&
          !!estabelecimentoIdRef.current
        ) {
          debugLogger.debug('AuthContext', 'AppState: Sessão igual, ignorando update');
          console.log('🔶 [AuthContext] AppState: Sessão igual, ignorando update');
          // NÃO usar return - deixa o finally limpar o lock
        } else {
          debugLogger.info('AuthContext', 'Foreground - Session obtida', {
            hasSession: !!activeSession,
            userId: activeSession?.user?.id
          });
          console.log('🔶 [AuthContext] Foreground - Session obtida:', {
            hasSession: !!activeSession,
            userId: activeSession?.user?.id
          });

          setSession(activeSession);
          setUser(activeSession?.user ?? null);
          sessionUserIdRef.current = activeSession?.user?.id ?? null;

          if (activeSession?.user) {
            debugLogger.debug('AuthContext', 'Foreground - Recarregando perfil');
            console.log('🔶 [AuthContext] Foreground - Recarregando perfil...');
            await loadUserProfileSafe(activeSession.user.id);
          } else {
            debugLogger.warn('AuthContext', 'Foreground - Sem sessão, limpando estados');
            console.log('🔶 [AuthContext] Foreground - Sem sessão, limpando estados');
            await clearAuthState();
          }
        }
      } catch (error) {
        debugLogger.error('AuthContext', 'Foreground - Erro ao revalidar', { error: String(error) });
        console.error('🔴 [AuthContext] Foreground - Erro ao revalidar:', error);
        logger.error('Erro ao revalidar auth no foreground:', error);
      } finally {
        revalidateInFlightRef.current = false;
        revalidateStartedAtRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
      syncService.stop();
    };
  }, [clearAuthState]);

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
