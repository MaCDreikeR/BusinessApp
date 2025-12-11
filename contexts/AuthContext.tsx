// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { logger } from '../utils/logger';
import { CacheManager, CacheNamespaces } from '../utils/cacheManager';
import { syncService } from '../services/syncService';
import * as Device from 'expo-device';

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
  const [role, setRole] = useState<string | null>(null); // ADICIONADO: state para a permissão
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esta função agora também busca o role e verifica o status da conta
    const fetchUserProfileAndRedirect = async (currentUser: User | null) => {
      if (!currentUser) {
        setEstabelecimentoId(null);
        setRole(null);
        return;
      }

      try {
        // Timeout de 15 segundos (aumentado para conexões lentas)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar perfil')), 15000)
        );
        
        const profilePromise = supabase
          .from('usuarios')
          .select('estabelecimento_id, role')
          .eq('id', currentUser.id)
          .single();
        
        // LÓGICA CORRIGIDA: Buscar 'estabelecimento_id' e 'role'
        const { data: profileData, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        logger.database('SELECT', 'usuarios', { profileData, error: profileError });

        if (profileError) {
          throw new Error(`Erro ao buscar perfil do usuário: ${profileError.message}`);
        }

        if (profileData) {
          setEstabelecimentoId(profileData.estabelecimento_id);
          setRole(profileData.role);
          
          // Salvar no cache para uso offline
          await CacheManager.set(
            CacheNamespaces.AUTH,
            'profile',
            {
              estabelecimento_id: profileData.estabelecimento_id,
              role: profileData.role,
              user_id: currentUser.id
            },
            7 * 24 * 60 * 60 * 1000 // Cache por 7 dias
          );

          // LÓGICA DE VERIFICAÇÃO DE STATUS DA CONTA
          if (profileData.role === 'super_admin') {
            // Se for super_admin, não precisa verificar o estabelecimento e pode prosseguir
            return;
          }

          // Para usuários normais, verifica o status do estabelecimento
          if (profileData.estabelecimento_id) {
            const { data: estabelecimento, error: estabelecimentoError } = await supabase
              .from('estabelecimentos')
              .select('status')
              .eq('id', profileData.estabelecimento_id)
              .single();
            
            if (estabelecimentoError) throw new Error(`Erro ao verificar status da conta: ${estabelecimentoError.message}`);

            if (estabelecimento && estabelecimento.status !== 'ativa') {
              // Se a conta não está ativa, desloga o usuário e mostra um alerta
              await supabase.auth.signOut();
              Alert.alert('Acesso Negado', `Sua conta está ${estabelecimento.status}. Por favor, contate o suporte.`);
              router.replace('/(auth)/login');
              return;
            }
          }
        }
      } catch (error) {
        logger.error('Erro em fetchUserProfileAndRedirect:', error);
        
        // Tentar recuperar do cache antes de limpar
        try {
          const cachedProfile = await CacheManager.get<{
            estabelecimento_id: string;
            role: string;
            user_id: string;
          }>(CacheNamespaces.AUTH, 'profile');
          
          if (cachedProfile && cachedProfile.user_id === currentUser.id) {
            logger.warn('🔄 Usando perfil do cache (modo offline)');
            setEstabelecimentoId(cachedProfile.estabelecimento_id);
            setRole(cachedProfile.role);
            // IMPORTANTE: Retornar aqui para evitar limpar os estados
            return;
          }
        } catch (cacheError) {
          logger.error('Erro ao acessar cache:', cacheError);
        }
        
        // Se não conseguiu recuperar do cache, limpar estados
        setEstabelecimentoId(null);
        setRole(null);
        
        // NÃO deslogar em caso de erro de rede - permite uso offline
        // Apenas logar o erro e manter usuário "logado" localmente
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        if (errorMessage.includes('Timeout') || errorMessage.includes('Network')) {
          logger.warn('⚠️ Problema de conexão detectado. App funcionando no modo offline.');
          // Não força signOut - permite que app continue funcionando
        } else {
          // Apenas em erros críticos de autenticação, desloga
          logger.error('❌ Erro crítico de autenticação. Deslogando usuário.');
          await supabase.auth.signOut();
        }
      }
    };

    const fetchInitialSession = async () => {
      setLoading(true);
      try {
        // Timeout de 10 segundos para evitar travamento
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao conectar')), 10000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserProfileAndRedirect(currentUser);

        // Inicializa serviço de sincronização após login
        if (currentUser && estabelecimentoId) {
          logger.info('🔄 Inicializando serviço de sincronização...');
          await syncService.initialize();
          // Sincroniza dados após login (se online)
          syncService.sync(estabelecimentoId);
        }
      } catch (error) {
        logger.error('❌ Erro ao carregar sessão inicial:', error);
        // Limpar sessão local se houver erro de rede
        setSession(null);
        setUser(null);
        setEstabelecimentoId(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserProfileAndRedirect(currentUser);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
      // Para o serviço de sincronização ao desmontar
      syncService.stop();
    };
  }, [router]);

  // Heartbeat: Atualiza last_activity_at e dispositivo a cada 1 minuto para rastrear atividade
  useEffect(() => {
    console.log('🔥 USEEFFECT HEARTBEAT EXECUTOU', { hasUser: !!user, hasEst: !!estabelecimentoId, role });
    
    if (!user) {
      logger.debug('⏸️ Heartbeat: Aguardando usuário logar');
      console.log('⏸️ Aguardando user');
      return;
    }
    
    // Super admin não tem estabelecimento_id, mas precisa do heartbeat
    if (!estabelecimentoId && role !== 'super_admin') {
      logger.debug('⏸️ Heartbeat: Aguardando estabelecimento_id (role:', role, ')');
      return;
    }
    
    logger.info('🟢 Heartbeat ATIVO - User:', user.id, 'Role:', role, 'Estabelecimento:', estabelecimentoId);
    console.log('🟢 HEARTBEAT ATIVO', {
      userId: user.id,
      userEmail: user.email,
      role: role,
      estabelecimentoId: estabelecimentoId
    });

    const getDeviceInfo = () => {
      try {
        const deviceName = Device.deviceName || 'Desconhecido';
        const modelName = Device.modelName || '';
        const osName = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
        const osVersion = Device.osVersion || '';
        const info = `${deviceName} (${modelName}) - ${osName} ${osVersion}`.trim();
        console.log('📱 Device Info:', info);
        return info;
      } catch (error) {
        console.error('❌ Erro ao obter device info:', error);
        return 'Dispositivo Desconhecido';
      }
    };

    const updateActivity = async () => {
      console.log('⏰ updateActivity() CHAMADO');
      try {
        const deviceInfo = getDeviceInfo();
        const now = new Date().toISOString();
        console.log('⏰ Dados para atualizar:', { userId: user.id, now, deviceInfo });
        
        logger.debug('⏰ Heartbeat: Iniciando atualização', { 
          userId: user.id, 
          timestamp: now,
          device: deviceInfo,
          role: role
        });
        
        const { data, error } = await supabase
          .from('usuarios')
          .update({ 
            last_activity_at: now,
            dispositivo: deviceInfo
          })
          .eq('id', user.id)
          .select();

        if (error) {
          logger.error('❌ Erro ao atualizar atividade:', error);
          console.error('SUPABASE UPDATE ERROR:', JSON.stringify(error, null, 2));
        } else {
          logger.debug('✅ Atividade atualizada:', data);
          console.log('✅ SUCESSO - Last activity:', now);
        }
      } catch (error) {
        logger.error('❌ Exceção ao atualizar atividade:', error);
        console.error('EXCEPTION:', error);
      }
    };

    // Atualiza imediatamente ao logar
    logger.info('🚀 Iniciando heartbeat para usuário:', user.id);
    updateActivity();

    // Atualiza a cada 1 minuto (reduzido de 2min para melhor rastreamento)
    const interval = setInterval(updateActivity, 1 * 60 * 1000);

    return () => {
      console.log('🛑 Heartbeat desativado para:', user.id);
      clearInterval(interval);
    };
  }, [user, estabelecimentoId, role]);

  // Função pública de logout manual
  const signOut = async () => {
    try {
      // Para sincronização antes de deslogar
      syncService.stop();

      await supabase.auth.signOut();
      
      // Limpar caches relacionados ao usuário
      await Promise.all([
        CacheManager.remove(CacheNamespaces.AUTH, 'profile'),
        CacheManager.clearNamespace(CacheNamespaces.VENDAS),
        CacheManager.clearNamespace(CacheNamespaces.SERVICOS),
        CacheManager.clearNamespace(CacheNamespaces.CLIENTES),
        CacheManager.clearNamespace(CacheNamespaces.AGENDAMENTOS),
        CacheManager.clearNamespace(CacheNamespaces.ESTOQUE),
        CacheManager.clearNamespace(CacheNamespaces.RELATORIOS),
      ]);
      
      logger.debug('✅ Cache limpo após logout');
      
      setUser(null);
      setSession(null);
      setEstabelecimentoId(null);
      setRole(null);
      router.replace('/(auth)/login');
    } catch (error) {
      logger.error('Erro ao fazer logout manual:', error);
      Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      estabelecimentoId,
      role, 
      loading,
      signOut,
    }),
    [user, session, estabelecimentoId, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};