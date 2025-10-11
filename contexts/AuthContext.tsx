// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  estabelecimentoId: string | null;
  role: string | null; // ADICIONADO: para guardar a permissão do usuário
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  estabelecimentoId: null,
  role: null,
  loading: true,
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
        // LÓGICA CORRIGIDA: Buscar 'estabelecimento_id' e 'role'
        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('estabelecimento_id, role')
          .eq('id', currentUser.id)
          .single();

        // LOG para debug detalhado
        console.log('[AuthContext] profileData:', profileData);
        console.log('[AuthContext] profileError:', profileError);

        if (profileError) {
          throw new Error(`Erro ao buscar perfil do usuário: ${profileError.message}`);
        }

        if (profileData) {
          setEstabelecimentoId(profileData.estabelecimento_id);
          setRole(profileData.role);

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
        console.error('Erro em fetchUserProfileAndRedirect:', error);
        setEstabelecimentoId(null);
        setRole(null);
        // Em caso de erro, deslogar para evitar estado inconsistente
        await supabase.auth.signOut();
      }
    };

    const fetchInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchUserProfileAndRedirect(currentUser);
      setLoading(false);
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
    };
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      session,
      estabelecimentoId,
      role, 
      loading,
    }),
    [user, session, estabelecimentoId, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};