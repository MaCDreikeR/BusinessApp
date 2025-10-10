// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  estabelecimentoId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  estabelecimentoId: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (currentUser: User | null) => {
      if (!currentUser) {
        setEstabelecimentoId(null);
        return;
      }
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil do usuário:', profileError.message);
          setEstabelecimentoId(null);
        } else if (profileData) {
          setEstabelecimentoId(profileData.estabelecimento_id);
        }
      } catch (error) {
        console.error('Erro em fetchUserProfile:', error);
        setEstabelecimentoId(null);
      }
    };

    const fetchInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchUserProfile(currentUser);
      setLoading(false);
    };

    fetchInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserProfile(currentUser);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // CORREÇÃO: useMemo é adicionado para evitar renderizações desnecessárias
  const value = useMemo(
    () => ({
      user,
      session,
      estabelecimentoId,
      loading,
    }),
    [user, session, estabelecimentoId, loading]
  );
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};