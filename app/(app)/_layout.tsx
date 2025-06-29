import { Drawer } from 'expo-router/drawer';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AppLayout() {
  const pathname = usePathname();
  const isEstoque = pathname?.startsWith('/estoque');
  const isOrcamentos = pathname.startsWith('/orcamentos');
  const isNovoOrcamento = pathname === '/orcamentos/novo';
  const isServicos = pathname.startsWith('/servicos');
  const isPerfil = pathname === '/perfil';
  const isNovoUsuario = pathname === '/usuarios/novo';
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [estabelecimento, setEstabelecimento] = useState<any>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (usuario?.avatar_url) {
      setAvatarUrl(usuario.avatar_url);
    }
  }, [usuario?.avatar_url]);

  async function carregarUsuario() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Usuário não autenticado');
        return;
      }

      console.log('Buscando dados do usuário:', user.id);
      
      // Busca os dados do usuário incluindo os dados da conta
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          *,
          conta:contas (
            nome_estabelecimento,
            tipo_documento,
            numero_documento,
            telefone,
            segmento
          )
        `)
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw userError;
      }

      console.log('Dados do usuário:', userData);
      setUsuario(userData);
      
      // Define os dados do estabelecimento da conta
      if (userData.conta) {
        console.log('Usando dados da conta:', userData.conta);
        setEstabelecimento({
          nome_estabelecimento: userData.conta.nome_estabelecimento,
          tipo_documento: userData.conta.tipo_documento,
          numero_documento: userData.conta.numero_documento,
          telefone: userData.conta.telefone,
          segmento: userData.conta.segmento
        });
      } else {
        console.log('Usuário não tem dados de conta');
        setEstabelecimento(null);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  }

  const CustomDrawerContent = (props: DrawerContentComponentProps) => {
    const handleLogout = async () => {
      Alert.alert(
        'Sair',
        'Deseja realmente sair da sua conta?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Erro ao fazer logout:', error.message);
          Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
          return;
        }
        
        // Limpa qualquer estado do usuário em memória
        setUsuario(null);
        setEstabelecimento(null);

        // Força a navegação para a tela inicial
                router.replace('/(auth)/login');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
      }
            }
          }
        ]
      );
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.drawerHeader}>
          <View style={styles.logoContainer}>
            {avatarUrl ? (
              <View>
              <Image 
                source={{ 
                    uri: avatarUrl,
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                }}
                style={styles.logo}
                  onLoadStart={() => setLoadingAvatar(true)}
                  onLoadEnd={() => setLoadingAvatar(false)}
                  onError={() => {
                    setLoadingAvatar(false);
                    setAvatarUrl(null);
                  }}
                />
                {loadingAvatar && (
                  <ActivityIndicator 
                    size="small" 
                    color="#7C3AED" 
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            ) : (
              <View style={[styles.logo, styles.placeholderAvatar]}>
                <Text style={styles.placeholderText}>
                  {usuario?.nome_completo?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.appName}>
              {estabelecimento?.nome_estabelecimento || 'Carregando...'}
            </Text>
            <Text style={styles.subtitle}>
              {usuario?.nome_completo || 'Carregando...'}
            </Text>
          </View>
        </View>
        <DrawerContentScrollView 
          {...props}
          contentContainerStyle={{ paddingTop: 0 }}
        >
          <View style={styles.drawerSection}>
          <DrawerItemList {...props} />
          </View>
        </DrawerContentScrollView>
        <View style={styles.drawerFooter}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.push('/configuracoes')}
          >
            <FontAwesome5 name="cog" size={20} color="#666" />
            <Text style={styles.footerButtonText}>Configurações</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.push('/suporte')}
          >
            <FontAwesome5 name="headset" size={20} color="#666" />
            <Text style={styles.footerButtonText}>Suporte</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.footerButton, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8, paddingTop: 16 }]}
            onPress={handleLogout}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color="#DC2626" />
            <Text style={[styles.footerButtonText, { color: '#DC2626' }]}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#7C3AED',
        drawerActiveTintColor: '#7C3AED',
        drawerInactiveTintColor: '#666',
        headerShown: !isEstoque && !isNovoOrcamento && !isPerfil && !isNovoUsuario,
        drawerItemStyle: {
          display: 'none'
        },
        drawerStyle: {
          backgroundColor: '#F9FAFB',
          width: '80%',
        },
        drawerContentStyle: {
          backgroundColor: '#F9FAFB',
        },
        drawerLabelStyle: {
          marginLeft: 12,
          fontSize: 16,
          fontWeight: '500',
        },
        drawerActiveBackgroundColor: '#F3E8FF',
        drawerInactiveBackgroundColor: 'transparent',
        drawerItemContainerStyle: {
          marginHorizontal: 8,
          marginVertical: 4,
          borderRadius: 8,
          paddingRight: 8,
        },
        headerRight: () => {
          if (isOrcamentos) {
            return (
              <TouchableOpacity 
                onPress={() => {
                  router.push('/orcamentos/novo');
                }}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="add" size={24} color="#7C3AED" />
              </TouchableOpacity>
            );
          }
          if (isServicos) {
            return (
              <View style={{ flexDirection: 'row', marginRight: 16, gap: 16 }}>
                <TouchableOpacity 
                  onPress={() => {
                    DeviceEventEmitter.emit('abrirModalCategorias');
                  }}
                >
                  <Ionicons name="list" size={24} color="#7C3AED" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (pathname === '/servicos') {
                      DeviceEventEmitter.emit('addServico');
                    } else {
                      router.push('/servicos');
                      setTimeout(() => {
                        DeviceEventEmitter.emit('addServico');
                      }, 100);
                    }
                  }}
                >
                  <Ionicons name="add" size={24} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            );
          }
          if (pathname === '/agenda') {
            return (
              <View style={{ marginRight: 16 }}>
                <TouchableOpacity 
                  onPress={() => {
                    if (pathname === '/agenda') {
                      router.push('/agenda/novo');
                    } else {
                      router.push('/agenda');
                      setTimeout(() => {
                        router.push('/agenda/novo');
                      }, 100);
                    }
                  }}
                  style={{ 
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#F3E8FF',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#7C3AED'
                  }}
                >
                  <FontAwesome5 name="calendar-alt" size={16} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            );
          }
        }
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Visão Geral',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="home" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  if (pathname === '/comandas') {
                    DeviceEventEmitter.emit('novaComanda');
                  } else {
                    router.push('/comandas');
                    setTimeout(() => {
                      DeviceEventEmitter.emit('novaComanda');
                    }, 100);
                  }
                }}
                style={{ 
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#F3E8FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#7C3AED'
                }}
              >
                <FontAwesome5 name="receipt" size={16} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (pathname === '/agenda') {
                    router.push('/agenda/novo');
                  } else {
                    router.push('/agenda');
                    setTimeout(() => {
                      router.push('/agenda/novo');
                    }, 100);
                  }
                }}
                style={{ 
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#F3E8FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#7C3AED'
                }}
              >
                <FontAwesome5 name="calendar-alt" size={16} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Drawer.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="calendar-alt" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <TouchableOpacity 
                style={{ marginRight: 16 }}
                onPress={() => {
                  DeviceEventEmitter.emit('togglePresencaUsuarios');
                }}
              >
                <Ionicons name="people-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ marginRight: 16 }}
                onPress={() => {
                  DeviceEventEmitter.emit('toggleBloqueioModal');
                }}
              >
                <Ionicons name="sunny-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ marginRight: 16 }}
                onPress={() => {
                  DeviceEventEmitter.emit('toggleHorariosModal');
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/agenda/novo')}
              >
                <Ionicons name="add" size={24} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Drawer.Screen
        name="comandas"
        options={{
          title: 'Comandas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="receipt" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (pathname === '/comandas') {
                  DeviceEventEmitter.emit('novaComanda');
                } else {
                  router.push('/comandas');
                  setTimeout(() => {
                    DeviceEventEmitter.emit('novaComanda');
                  }, 100);
                }
              }}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="add" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }}
      />

      <Drawer.Screen
        name="orcamentos"
        options={{
          title: 'Orçamentos',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="file-invoice-dollar" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="vendas"
        options={{
          title: 'Vendas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="shopping-cart" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cut" size={size} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <TouchableOpacity 
                onPress={() => {
                  DeviceEventEmitter.emit('abrirModalCategorias');
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="list" size={24} color="#7C3AED" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (pathname === '/servicos') {
                    DeviceEventEmitter.emit('addServico');
                  } else {
                    router.push('/servicos');
                    setTimeout(() => {
                      DeviceEventEmitter.emit('addServico');
                    }, 100);
                  }
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="add" size={24} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Drawer.Screen
        name="pacotes"
        options={{
          title: 'Pacotes',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="box" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
          headerRight: () => (
            <TouchableOpacity 
              style={{ marginRight: 16 }}
              onPress={() => {
                if (pathname === '/pacotes') {
                  DeviceEventEmitter.emit('addPacote');
                } else {
                  router.push('/pacotes');
                  setTimeout(() => {
                    DeviceEventEmitter.emit('addPacote');
                  }, 100);
                }
              }}
            >
              <Ionicons name="add" size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }}
      />

      <Drawer.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="chart-bar" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="aniversariantes"
        options={{
          title: 'Aniversariantes',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="birthday-cake" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="usuarios"
        options={{
          title: 'Usuários',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="users" size={20} color={color} />
          ),
          headerShown: false,
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="fornecedores"
        options={{
          title: 'Fornecedores',
          headerShown: false,
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="truck" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="metas"
        options={{
          title: 'Metas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="bullseye" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="despesas"
        options={{
          title: 'Despesas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="money-bill-alt" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="agendamentos-online"
        options={{
          title: 'Agendamentos Online',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="globe" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="automacao"
        options={{
          title: 'Automação',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="robot" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="configuracoes"
        options={{
          title: 'Configurações',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="cog" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="notificacoes"
        options={{
          title: 'Notificações',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="bell" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'flex' },
        }}
      />

      <Drawer.Screen
        name="suporte"
        options={{
          title: 'Suporte',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="headset" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="agenda/novo"
        options={{
          title: 'Novo Agendamento',
          drawerItemStyle: { display: 'none' },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/agenda')}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
          )
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  placeholderAvatar: {
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  drawerSection: {
    marginTop: 8,
  },
  drawerFooter: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  footerButtonText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#4B5563',
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
  },
}); 