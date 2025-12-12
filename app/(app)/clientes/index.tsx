import React, { useState, useEffect, useCallback , useMemo} from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Linking, Modal, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as Contacts from 'expo-contacts';
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../../utils/logger';
import { Cliente as ClienteBase } from '@types';
import { theme } from '@utils/theme';
import { CacheManager, CacheNamespaces, CacheTTL } from '../../../utils/cacheManager';

type ClienteLista = Pick<ClienteBase, 'id' | 'nome' | 'telefone' | 'estabelecimento_id' | 'created_at'> & {
  foto_url?: string;
  debito?: boolean;
  credito?: boolean;
  saldo?: number;
  agendamentos?: {
    id: string;
    data: string;
    status: string;
  }[];
};

export default function ClientesScreen() {
  const { estabelecimentoId } = useAuth();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [pesquisa, setPesquisa] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      carregarClientes();
    }, [])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      // Limpar cache antes de recarregar
      if (estabelecimentoId) {
        const cacheKey = `lista_${estabelecimentoId}`;
        await CacheManager.remove(CacheNamespaces.CLIENTES, cacheKey);
      }
      await carregarClientes();
    } catch (error) {
      logger.error('Erro ao atualizar clientes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const carregarClientes = async () => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      // Tentar buscar do cache (TTL de 5 minutos)
      const cacheKey = `lista_${estabelecimentoId}`;
      const cachedData = await CacheManager.get<ClienteLista[]>(
        CacheNamespaces.CLIENTES,
        cacheKey
      );

      if (cachedData) {
        logger.debug('✅ Usando cache para clientes');
        setClientes(cachedData);
        return;
      }

      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (clientesError) {
        logger.error('Erro ao carregar clientes:', clientesError);
        Alert.alert('Erro', 'Erro ao carregar clientes');
        return;
      }

      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data_hora');

      if (agendamentosError) {
        logger.error('Erro ao carregar agendamentos:', agendamentosError);
        Alert.alert('Erro', 'Erro ao carregar agendamentos');
        return;
      }

      // Buscar todas as movimentações de crediário
      // A tabela crediario_movimentacoes não tem estabelecimento_id, 
      // então vamos buscar só dos clientes deste estabelecimento
      const clienteIds = clientesData?.map(c => c.id) || [];
      
      let movimentacoesData: any[] = [];
      if (clienteIds.length > 0) {
        const { data, error: movimentacoesError } = await supabase
          .from('crediario_movimentacoes')
          .select('cliente_id, tipo, valor')
          .in('cliente_id', clienteIds);

        if (movimentacoesError) {
          logger.error('Erro ao carregar movimentações:', movimentacoesError);
        } else {
          movimentacoesData = data || [];
        }
      }

      // Calcular saldo de cada cliente
      const saldosPorCliente: { [key: string]: number } = {};
      movimentacoesData.forEach(mov => {
        if (!saldosPorCliente[mov.cliente_id]) {
          saldosPorCliente[mov.cliente_id] = 0;
        }
        // Converte o valor para número (pode vir como string do banco)
        const valorNumerico = typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor);
        saldosPorCliente[mov.cliente_id] += valorNumerico;
      });

      const clientesComAgendamentos = clientesData?.map(cliente => {
        const agendamentosDoCliente = agendamentosData?.filter(agendamento => 
          agendamento.cliente === cliente.nome
        ).map(agendamento => ({
          id: agendamento.id,
          data_hora: agendamento.data_hora,
          status: agendamento.status
        })) || [];
        
        const saldo = saldosPorCliente[cliente.id] || 0;
        
        return {
          ...cliente,
          agendamentos: agendamentosDoCliente,
          credito: saldo > 0,
          debito: saldo < 0,
          saldo: saldo
        };
      }) || [];

      setClientes(clientesComAgendamentos);
      
      // Salvar no cache com TTL de 5 minutos
      await CacheManager.set(
        CacheNamespaces.CLIENTES,
        cacheKey,
        clientesComAgendamentos,
        CacheTTL.FIVE_MINUTES
      );
    } catch (error) {
      logger.error('Erro ao carregar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes');
    }
  };

  const filtrarClientes = () => {
    if (!clientes) return [];
    
    let clientesFiltrados = clientes;
    
    if (pesquisa) {
      clientesFiltrados = clientesFiltrados.filter(cliente => 
        cliente.nome.toLowerCase().includes(pesquisa.toLowerCase())
      );
    }
    
    switch (filtro) {
      case 'com_debito':
        clientesFiltrados = clientesFiltrados.filter(cliente => cliente.debito === true);
        break;
      case 'com_credito':
        clientesFiltrados = clientesFiltrados.filter(cliente => cliente.credito === true);
        break;
      case 'agendados':
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        clientesFiltrados = clientesFiltrados.filter(cliente => {
          if (!cliente.agendamentos || cliente.agendamentos.length === 0) return false;
          
          return cliente.agendamentos.some(agendamento => {
            const dataAgendamento = new Date(agendamento.data);
            dataAgendamento.setHours(0, 0, 0, 0);
            return dataAgendamento >= hoje && agendamento.status !== 'cancelado';
          });
        });

        clientesFiltrados.sort((a, b) => {
          const dataA = a.agendamentos && a.agendamentos.length > 0 
            ? new Date(a.agendamentos[0].data).getTime() 
            : Infinity;
          const dataB = b.agendamentos && b.agendamentos.length > 0 
            ? new Date(b.agendamentos[0].data).getTime() 
            : Infinity;
          return dataA - dataB;
        });
        break;
      default:
        break;
    }
    
    return clientesFiltrados;
  };

  const abrirWhatsApp = (telefone: string) => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${numeroLimpo}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          Alert.alert('Erro', 'WhatsApp não está instalado neste dispositivo');
          return;
        }
        return Linking.openURL(url);
      })
      .catch(err => {
        logger.error('Erro ao abrir WhatsApp:', err);
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
      });
  };

  const abrirMenu = () => {
    setMenuAberto(true);
  };

  const fecharMenu = () => {
    setMenuAberto(false);
  };

  const novoCliente = () => {
    fecharMenu();
    router.push('/clientes/novo');
  };

  const importarContato = async () => {
    fecharMenu();
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso aos seus contatos para importá-los.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length === 0) {
        Alert.alert('Nenhum contato', 'Não foram encontrados contatos no dispositivo.');
        return;
      }

      const contatosValidos = data
        .map(contato => {
          const numero = contato.phoneNumbers?.[0]?.number;
          const nome = contato.name;
          if (nome && numero) {
            return { nome, telefone: numero };
          }
          return null;
        })
        .filter(contato => contato !== null);

      if (contatosValidos.length === 0) {
        Alert.alert('Nenhum contato válido', 'Não foram encontrados contatos com nome e número de telefone válidos.');
        return;
      }
      
      router.push({
        pathname: '/clientes/selecionar-contato',
        params: {
          contatos: JSON.stringify(contatosValidos)
        }
      });

    } catch (error) {
      logger.error('Erro ao acessar contatos:', error);
      Alert.alert('Erro', 'Não foi possível acessar os contatos do dispositivo.');
    }
  };

  const abrirDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <View style={styles.container}>
      {/* --- CABEÇALHO COM LAYOUT CORRIGIDO --- */}
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 16 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={abrirDrawer}
          >
            <FontAwesome5 name="bars" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Clientes</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={abrirMenu}
        >
          <FontAwesome5 name="plus" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtrosWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtrosContainer}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <TouchableOpacity 
            style={[styles.filtroItem, filtro === 'todos' && styles.filtroAtivo]}
            onPress={() => setFiltro('todos')}
          >
            <View style={[styles.filtroIcone, filtro === 'todos' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="users" size={16} color={filtro === 'todos' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filtro === 'todos' && styles.filtroTextoAtivo]}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filtro === 'agendados' && styles.filtroAtivo]}
            onPress={() => setFiltro('agendados')}
          >
            <View style={[styles.filtroIcone, filtro === 'agendados' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="calendar" size={16} color={filtro === 'agendados' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filtro === 'agendados' && styles.filtroTextoAtivo]}>Agendados</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filtro === 'com_credito' && styles.filtroAtivo]}
            onPress={() => setFiltro('com_credito')}
          >
            <View style={[styles.filtroIcone, filtro === 'com_credito' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="user" size={16} color={filtro === 'com_credito' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filtro === 'com_credito' && styles.filtroTextoAtivo]}>Com crédito</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filtro === 'com_debito' && styles.filtroAtivo]}
            onPress={() => setFiltro('com_debito')}
          >
            <View style={[styles.filtroIcone, filtro === 'com_debito' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="exclamation-circle" size={16} color={filtro === 'com_debito' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filtro === 'com_debito' && styles.filtroTextoAtivo]}>Com Débito</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.pesquisaContainer}>
        <FontAwesome5 name="search" size={16} color={colors.textTertiary} style={styles.pesquisaIcone} />
        <TextInput
          style={styles.pesquisaInput}
          placeholder="Pesquisar por nome..."
          value={pesquisa}
          onChangeText={setPesquisa}
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <Text style={styles.totalClientes}>
        <Text style={styles.totalClientesNumero}>{filtrarClientes().length}</Text> clientes
      </Text>

      <ScrollView 
        style={styles.listaClientes}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {filtrarClientes().map(cliente => (
          <TouchableOpacity 
            key={cliente.id} 
            style={styles.clienteCard}
            onPress={() => router.push(`/clientes/${cliente.id}`)}
          >
            <View style={styles.clienteFotoContainer}>
              {cliente.foto_url ? (
                <Image 
                  source={{ uri: cliente.foto_url }}
                  style={styles.clienteFoto}
                />
              ) : (
                <View style={styles.clienteFotoPlaceholder}>
                  <FontAwesome5 name="user" size={24} color={colors.textTertiary} />
                </View>
              )}
            </View>
            <View style={styles.clienteInfo}>
              <Text style={styles.clienteNome}>{cliente.nome}</Text>
              {filtro === 'agendados' ? (
                <Text style={styles.clienteTelefone}>
                  {cliente.agendamentos && cliente.agendamentos.length > 0
                    ? new Date(cliente.agendamentos[0].data).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Sem agendamento'}
                </Text>
              ) : filtro === 'com_credito' || filtro === 'com_debito' ? (
                <Text 
                  style={[
                    styles.clienteSaldo,
                    cliente.saldo && cliente.saldo > 0 ? styles.saldoPositivo : styles.saldoNegativo
                  ]}
                >
                  R$ {cliente.saldo?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                </Text>
              ) : (
                <Text style={styles.clienteTelefone}>{cliente.telefone}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => abrirWhatsApp(cliente.telefone)}
            >
              <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={menuAberto}
        transparent={true}
        animationType="fade"
        onRequestClose={fecharMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={fecharMenu}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={novoCliente}
            >
              <FontAwesome5 name="user-plus" size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemTexto}>Novo Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={importarContato}
            >
              <FontAwesome5 name="address-book" size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemTexto}>Importar contatos</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// --- STYLESHEET COM AS MUDANÇAS ---
// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Mantém os grupos da esquerda e direita separados
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: { // Novo estilo para o grupo da esquerda
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    color: theme.colors.primary,
    marginLeft: 10, // Espaçamento entre o ícone de menu e o título
  },
  filtrosWrapper: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtrosContainer: {
    //
  },
  filtroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 95,
  },
  filtroAtivo: {
    backgroundColor: '#EDE9FE',
  },
  filtroIcone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  filtroIconeAtivo: {
    backgroundColor: colors.surface,
  },
  filtroTexto: {
    fontSize: 14,
    color: '#666',
  },
  filtroTextoAtivo: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  pesquisaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pesquisaIcone: {
    marginRight: 8,
  },
  pesquisaInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
  },
  totalClientes: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  totalClientesNumero: {
    color: '#111827',
    fontWeight: 'bold',
  },
  listaClientes: {
    flex: 1,
    paddingHorizontal: 16,
  },
  clienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clienteFotoContainer: {
    marginRight: 12,
  },
  clienteFoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clienteFotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clienteInfo: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  clienteTelefone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  clienteSaldo: {
    fontSize: 16,
    fontWeight: '600',
  },
  saldoPositivo: {
    color: '#10B981',
  },
  saldoNegativo: {
    color: '#EF4444',
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8FFF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  menuItemTexto: {
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
});