import React, { useEffect, useState , useMemo } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { usePathname , router , Stack , useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Image, Alert, ActivityIndicator, Dimensions, Platform , DeviceEventEmitter } from 'react-native';
import { DrawerContentScrollView, DrawerItemList , DrawerContentComponentProps } from '@react-navigation/drawer';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import AgendamentoNotificacao from '../../components/AgendamentoNotificacao';
import { useAgendamentoNotificacao } from '../../hooks/useAgendamentoNotificacao';
import { logger } from '../../utils/logger';
import { theme } from '@utils/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { SyncIndicator } from '../../components/SyncIndicator';

// Função para calcular largura responsiva do drawer
const getDrawerWidth = (): number | `${number}%` => {
  const screenWidth = Dimensions.get('window').width;
  
  logger.debug('📐 Largura da tela:', screenWidth);
  
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
  
  logger.debug('📱 Largura do drawer calculada:', width);
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
  const [hasLoadedAvatar, setHasLoadedAvatar] = useState(false); // evita piscadas após primeira carga
  const { permissions } = usePermissions();
  const { role } = useAuth();
  const { colors, isDark } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  // Styles dinâmicos baseados no tema
  const dynamicStyles = useMemo(() => StyleSheet.create({
    drawerHeader: {
      padding: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    placeholderAvatar: {
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    placeholderText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold' as const,
    },
    appName: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    drawerFooter: {
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerButtonText: {
      marginLeft: 12,
      fontSize: 15,
      color: colors.textSecondary,
    },
  }), [colors]);
  
  // Hook de notificação de agendamento
  const { 
    agendamentoAtivo, 
    mostrarNotificacao, 
    ocultarNotificacao, 
    resetarNotificacao 
  } = useAgendamentoNotificacao();

  // Estado para controlar se o drawer deve ser permanente
  const [isPermanentDrawer, setIsPermanentDrawer] = useState(false);

  // Calcular largura do drawer e tipo de exibição - INICIALIZAÇÃO ÚNICA
  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const isLargeScreen = width >= 1024;
    const shouldBePermanent = isLandscape && isLargeScreen;
    
    logger.debug('📐 Dimensões iniciais da tela:', { width, height, isLandscape, isLargeScreen });
    setIsPermanentDrawer(shouldBePermanent);
    
    // Listener para mudanças de orientação
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newIsLandscape = window.width > window.height;
      const newIsLargeScreen = window.width >= 1024;
      const newShouldBePermanent = newIsLandscape && newIsLargeScreen;
      
      logger.debug('🔄 Orientação mudou:', { 
        width: window.width, 
        height: window.height, 
        isLandscape: newIsLandscape, 
        shouldBePermanent: newShouldBePermanent 
      });
      
      setIsPermanentDrawer(newShouldBePermanent);
    });

    return () => subscription?.remove();
  }, []);

  // Largura do drawer baseada no estado
  const drawerWidth = useMemo(() => {
    const width = isPermanentDrawer ? 280 : 300;
    // Log removido para evitar spam no console
    return width;
  }, [isPermanentDrawer]);

  useFocusEffect(
    React.useCallback(() => {
      carregarUsuario();
    }, [])
  );

  useEffect(() => {
    if (usuario?.avatar_url) {
      setAvatarUrl(usuario.avatar_url);
      setHasLoadedAvatar(false); // reseta somente quando a URL muda
    }
  }, [usuario?.avatar_url]);

  async function carregarUsuario() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.debug('Usuário não autenticado');
        return;
      }

      logger.debug('Buscando dados do usuário:', user.id);
      
      // Busca os dados do usuário incluindo o relacionamento com estabelecimento
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`*, estabelecimento:estabelecimentos(*)`)
        .eq('id', user.id)
        .single();

      if (userError) {
        logger.error('Erro ao buscar usuário:', userError);
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
      logger.error('Erro ao carregar usuário:', error);
    }
  }

  const CustomDrawerContent = (props: DrawerContentComponentProps) => {
    const { signOut } = useAuth();
    const handleLogout = async () => {
      logger.debug('[Drawer] Botão Sair pressionado');
      if (typeof window !== 'undefined') {
        // Ambiente web: logout direto
        try {
          await signOut();
          setUsuario(null);
          setEstabelecimento(null);
          window.localStorage.clear();
          window.sessionStorage.clear();
          window.location.replace('/');
        } catch (error) {
          logger.error('Erro ao fazer logout:', error);
        }
      } else {
        // Ambiente mobile: confirmação
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
                logger.debug('[Drawer] Confirmou logout');
                try {
                  await signOut();
                  setUsuario(null);
                  setEstabelecimento(null);
                } catch (error) {
                  logger.error('Erro ao fazer logout:', error);
                  Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
                }
              }
            }
          ]
        );
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableOpacity 
          style={dynamicStyles.drawerHeader}
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
                }}
                style={styles.logo}
                  onLoadStart={() => {
                    // Mostra indicador apenas na primeira carga da URL atual
                    if (!hasLoadedAvatar) setLoadingAvatar(true);
                  }}
                  onLoadEnd={() => {
                    setHasLoadedAvatar(true);
                    setLoadingAvatar(false);
                  }}
                  onError={() => {
                    setLoadingAvatar(false);
                    setAvatarUrl(null);
                  }}
                />
                {loadingAvatar && (
                  <ActivityIndicator 
                    size="small" 
                    color={theme.colors.primary} 
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            ) : (
              <View style={[styles.logo, dynamicStyles.placeholderAvatar]}>
                <Text style={dynamicStyles.placeholderText}>
                  {usuario?.nome_completo?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={dynamicStyles.appName}>
              {estabelecimento?.nome_estabelecimento || 'Carregando...'}
            </Text>
            <Text style={dynamicStyles.subtitle}>
              {usuario?.nome_completo || 'Carregando...'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <DrawerContentScrollView 
          {...props}
          contentContainerStyle={{ paddingTop: 0 }}
        >
          <View style={styles.drawerSection}>
          <DrawerItemList {...props} />
          </View>
        </DrawerContentScrollView>
        <View style={dynamicStyles.drawerFooter}>
          {permissions.pode_ver_configuracoes && (
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => router.push('/configuracoes')}
            >
              <FontAwesome5 name="cog" size={20} color="#666" />
              <Text style={dynamicStyles.footerButtonText}>Configurações</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.push('/suporte')}
          >
            <FontAwesome5 name="headset" size={20} color={colors.textSecondary} />
            <Text style={dynamicStyles.footerButtonText}>Suporte</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.footerButton, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 16 }]}
            onPress={handleLogout}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color={colors.error} />
            <Text style={[styles.footerButtonText, { color: '#DC2626' }]}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Logs removidos para evitar spam no console

  return (
    <>
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: theme.colors.primary,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        headerShown: !isEstoque && !isNovoOrcamento && !isPerfil && !isNovoUsuario,
        drawerType: isPermanentDrawer ? 'permanent' : 'slide',
        swipeEnabled: !isPermanentDrawer,
        drawerItemStyle: {
          display: 'none'
        },
        drawerStyle: {
          backgroundColor: colors.background,
          width: drawerWidth,
          borderRightWidth: isPermanentDrawer ? 1 : 0,
          borderRightColor: isPermanentDrawer ? colors.border : 'transparent',
        },
        drawerContentStyle: {
          backgroundColor: colors.background,
        },
        drawerLabelStyle: {
          marginLeft: 12,
          fontSize: 16,
          fontWeight: '500',
        },
        drawerActiveBackgroundColor: isDark ? colors.primaryDark : '#F3E8FF',
        drawerInactiveBackgroundColor: 'transparent',
        // Removido drawerItemContainerStyle inválido
        headerRight: () => {
          if (isOrcamentos) {
            return (
              <View style={{ flexDirection: 'row', marginRight: 16, gap: 12, alignItems: 'center' }}>
                <SyncIndicator />
                <TouchableOpacity 
                  onPress={() => {
                    router.push('/orcamentos/novo');
                  }}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }
          if (isServicos) {
            return (
              <View style={{ flexDirection: 'row', marginRight: 16, gap: 12, alignItems: 'center' }}>
                <SyncIndicator />
                <TouchableOpacity 
                  onPress={() => {
                    DeviceEventEmitter.emit('abrirModalCategorias');
                  }}
                >
                  <Ionicons name="list" size={24} color={colors.primary} />
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
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }
          if (pathname === '/agenda') {
            return (
              <View style={{ flexDirection: 'row', marginRight: 16, gap: 12, alignItems: 'center' }}>
                <SyncIndicator />
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
                    borderColor: theme.colors.primary
                  }}
                >
                  <FontAwesome5 name="calendar-alt" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }
          
          // Header padrão com SyncIndicator
          return (
            <View style={{ marginRight: 16 }}>
              <SyncIndicator />
            </View>
          );
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
                    borderColor: theme.colors.primary
                  }}
                >
                  <FontAwesome5 name="receipt" size={16} color={theme.colors.primary} />
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
                  borderColor: theme.colors.primary
                }}
              >
                <FontAwesome5 name="calendar-alt" size={16} color={theme.colors.primary} />
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
                <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              
              {/* Gerenciar bloqueios - apenas para admins */}
              {role === 'admin' && (
                <TouchableOpacity 
                  style={{ marginRight: 16 }}
                  onPress={() => {
                    DeviceEventEmitter.emit('toggleBloqueioModal');
                  }}
                >
                  <Ionicons name="sunny-outline" size={24} color={theme.colors.primary} />
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
                  <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              
              {/* Adicionar agendamento - disponível para todos */}
              <TouchableOpacity 
                onPress={() => router.push('/agenda/novo')}
              >
                <Ionicons name="add" size={24} color={theme.colors.primary} />
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
              <Ionicons name="add" size={24} color={theme.colors.primary} />
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
                <Ionicons name="list" size={24} color={theme.colors.primary} />
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
                <Ionicons name="add" size={24} color={theme.colors.primary} />
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
              <Ionicons name="add" size={24} color={theme.colors.primary} />
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
          headerShown: false,
          drawerItemStyle: { display: permissions.pode_ver_relatorios ? 'flex' : 'none' },
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                DeviceEventEmitter.emit('abrirConfigComissoes');
              }}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
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
          drawerItemStyle: { display: permissions.pode_ver_automacao ? 'flex' : 'none' },
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
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
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

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: theme.colors.primary,
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
    color: colors.textSecondary,
  },
  drawerSection: {
    marginTop: 8,
  },
  drawerFooter: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
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