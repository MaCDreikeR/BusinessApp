import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import { useMemo } from 'react';
import AgendamentoNotificacao from '../components/AgendamentoNotificacao';
import { useAgendamentoNotificacao } from '../../hooks/useAgendamentoNotificacao';

// Função para calcular largura responsiva do drawer
const getDrawerWidth = (): number | `${number}%` => {
  const screenWidth = Dimensions.get('window').width;
  
  console.log('📐 Largura da tela:', screenWidth);
  
  let width: number | `${number}%`;
  
  // Em telas pequenas (mobile): 80% da largura
  if (screenWidth < 768) {
    width = '80%';
  }
  // Em tablets: 350px fixo
  else if (screenWidth < 1024) {
    width = 350;
  }
  // Em telas grandes (desktop): máximo 280px
  else {
    width = 280;
  }
  
  console.log('📱 Largura do drawer calculada:', width);
  return width;
};

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
  const { permissions } = usePermissions();
  const { role } = useAuth();
  
  // Hook de notificação de agendamento
  const { 
    agendamentoAtivo, 
    mostrarNotificacao, 
    ocultarNotificacao, 
    resetarNotificacao 
  } = useAgendamentoNotificacao();

  // Estado para controlar se o drawer deve ser permanente
  const [isPermanentDrawer, setIsPermanentDrawer] = useState(false);

  // Calcular largura do drawer e tipo de exibição
  const drawerWidth = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const isLargeScreen = width >= 1024;
    
    console.log('📐 Dimensões da tela:', { width, height, isLandscape, isLargeScreen });
    
    // Drawer permanente em landscape em telas grandes
    const shouldBePermanent = isLandscape && isLargeScreen;
    setIsPermanentDrawer(shouldBePermanent);
    
    if (shouldBePermanent) {
      console.log('🖥️ Modo Desktop: Drawer permanente com 280px');
      return 280;
    }
    
    console.log('📱 Modo Mobile/Tablet: Drawer temporário com 300px');
    return 300;
  }, []);

  // Atualizar quando a orientação mudar
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const isLandscape = window.width > window.height;
      const isLargeScreen = window.width >= 1024;
      const shouldBePermanent = isLandscape && isLargeScreen;
      
      console.log('🔄 Orientação mudou:', { 
        width: window.width, 
        height: window.height, 
        isLandscape, 
        shouldBePermanent 
      });
      
      setIsPermanentDrawer(shouldBePermanent);
    });

    return () => subscription?.remove();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      carregarUsuario();
    }, [])
  );

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
      
      // Busca os dados do usuário incluindo o relacionamento com estabelecimento
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`*, estabelecimento:estabelecimentos(*)`)
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw userError;
      }

      setUsuario(userData);

      // Define os dados do estabelecimento vinculado
      if (userData.estabelecimento) {
        setEstabelecimento({
          nome_estabelecimento: userData.estabelecimento.nome,
          tipo_documento: userData.estabelecimento.tipo_documento,
          numero_documento: userData.estabelecimento.numero_documento,
          telefone: userData.estabelecimento.telefone,
          segmento: userData.estabelecimento.segmento
        });
      } else {
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
        <TouchableOpacity 
          style={styles.drawerHeader}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/usuarios');
          }}
          activeOpacity={0.7}
        >
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
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <DrawerContentScrollView 
          {...props}
          contentContainerStyle={{ paddingTop: 0 }}
        >
          <View style={styles.drawerSection}>
          <DrawerItemList {...props} />
          </View>
        </DrawerContentScrollView>
        <View style={styles.drawerFooter}>
          {permissions.pode_ver_configuracoes && (
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => router.push('/configuracoes')}
            >
              <FontAwesome5 name="cog" size={20} color="#666" />
              <Text style={styles.footerButtonText}>Configurações</Text>
            </TouchableOpacity>
          )}
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

  console.log('🎨 Renderizando Drawer com largura:', drawerWidth);
  console.log('🎨 Drawer permanente?', isPermanentDrawer);

  return (
    <>
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#7C3AED',
        drawerActiveTintColor: '#7C3AED',
        drawerInactiveTintColor: '#666',
        headerShown: !isEstoque && !isNovoOrcamento && !isPerfil && !isNovoUsuario,
        drawerType: isPermanentDrawer ? 'permanent' : 'slide',
        swipeEnabled: !isPermanentDrawer,
        drawerItemStyle: {
          display: 'none'
        },
        drawerStyle: {
          backgroundColor: '#F9FAFB',
          width: drawerWidth,
          borderRightWidth: isPermanentDrawer ? 1 : 0,
          borderRightColor: isPermanentDrawer ? '#E5E7EB' : 'transparent',
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
        // Removido drawerItemContainerStyle inválido
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
              {role !== 'profissional' && (
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
              )}
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
          drawerItemStyle: { display: permissions.pode_ver_agenda ? 'flex' : 'none' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              {/* Gerenciar presença - disponível para todos */}
              <TouchableOpacity 
                style={{ marginRight: 16 }}
                onPress={() => {
                  DeviceEventEmitter.emit('togglePresencaUsuarios');
                }}
              >
                <Ionicons name="people-outline" size={24} color="#7C3AED" />
              </TouchableOpacity>
              
              {/* Gerenciar bloqueios - apenas para admins */}
              {role === 'admin' && (
                <TouchableOpacity 
                  style={{ marginRight: 16 }}
                  onPress={() => {
                    DeviceEventEmitter.emit('toggleBloqueioModal');
                  }}
                >
                  <Ionicons name="sunny-outline" size={24} color="#7C3AED" />
                </TouchableOpacity>
              )}
              
              {/* Configurar horários - apenas para admins */}
              {role === 'admin' && (
                <TouchableOpacity 
                  style={{ marginRight: 16 }}
                  onPress={() => {
                    DeviceEventEmitter.emit('toggleHorariosModal');
                  }}
                >
                  <Ionicons name="settings-outline" size={24} color="#7C3AED" />
                </TouchableOpacity>
              )}
              
              {/* Adicionar agendamento - disponível para todos */}
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
          drawerItemStyle: { display: permissions.pode_ver_comandas ? 'flex' : 'none' },
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
          drawerItemStyle: { display: permissions.pode_ver_orcamentos ? 'flex' : 'none' },
        }}
      />

      <Drawer.Screen
        name="vendas"
        options={{
          title: 'Vendas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="shopping-cart" size={20} color={color} />
          ),
          drawerItemStyle: { display: permissions.pode_ver_vendas ? 'flex' : 'none' },
        }}
      />

      <Drawer.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cut" size={size} color={color} />
          ),
          drawerItemStyle: { display: permissions.pode_ver_servicos ? 'flex' : 'none' },
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
          drawerItemStyle: { display: permissions.pode_ver_pacotes ? 'flex' : 'none' },
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
          drawerItemStyle: { display: permissions.pode_ver_estoque ? 'flex' : 'none' },
        }}
      />

      <Drawer.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="chart-bar" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />  
      <Drawer.Screen
  name="clientes" // Nome da pasta/rota
  options={{
    title: 'Clientes',
    headerShown: false, // <-- ADICIONE ESTA LINHA
    drawerIcon: ({ color }) => (
      <FontAwesome5 name="users" size={20} color={color} />
    ),
    drawerItemStyle: { display: permissions.pode_ver_clientes ? 'flex' : 'none' },
  }}
/>

      <Drawer.Screen
        name="aniversariantes"
        options={{
          title: 'Aniversariantes',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="birthday-cake" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
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
          drawerItemStyle: { display: 'none' }, // Oculto - acesso via header do drawer
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
          drawerItemStyle: { display: permissions.pode_ver_fornecedores ? 'flex' : 'none' },
        }}
      />

      <Drawer.Screen
        name="metas"
        options={{
          title: 'Metas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="bullseye" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="despesas"
        options={{
          title: 'Despesas',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="money-bill-alt" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="comissoes"
        options={{
          title: 'Comissões',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="percentage" size={20} color={color} />
          ),
          drawerItemStyle: permissions.pode_ver_comissoes ? undefined : { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="agendamentos-online"
        options={{
          title: 'Agendamentos Online',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="globe" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="automacao"
        options={{
          title: 'Automação',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="robot" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="configuracoes"
        options={{
          title: 'Configurações',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="cog" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="notificacoes"
        options={{
          title: 'Notificações',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="bell" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
        }}
      />

      <Drawer.Screen
        name="suporte"
        options={{
          title: 'Suporte',
          drawerIcon: ({ color }) => (
            <FontAwesome5 name="headset" size={20} color={color} />
          ),
          drawerItemStyle: { display: 'none' }, // Oculto - tela não implementada
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
    
    {/* Notificação de agendamento sobreposta */}
    {agendamentoAtivo && (
      <AgendamentoNotificacao
        visible={mostrarNotificacao}
        cliente={agendamentoAtivo.cliente}
        cliente_foto={agendamentoAtivo.cliente_foto}
        servico={agendamentoAtivo.servico}
        horario={agendamentoAtivo.horario}
        onOcultar={ocultarNotificacao}
        onVerAgendamento={() => {
          resetarNotificacao();
          router.push('/agenda');
        }}
      />
    )}
  </>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
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