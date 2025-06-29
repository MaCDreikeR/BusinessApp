import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Linking, Modal } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  foto_url?: string;
  user_id: string;
  created_at: string;
  debito?: boolean;
  credito?: boolean;
  agendamentos?: {
    id: string;
    data: string;
    status: string;
  }[];
};

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [pesquisa, setPesquisa] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      carregarClientes();
    }, [])
  );

  const carregarClientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');

      if (clientesError) {
        console.error('Erro ao carregar clientes:', clientesError);
        Alert.alert('Erro', 'Erro ao carregar clientes');
        return;
      }

      // Buscar agendamentos
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora');

      if (agendamentosError) {
        console.error('Erro ao carregar agendamentos:', agendamentosError);
        Alert.alert('Erro', 'Erro ao carregar agendamentos');
        return;
      }

      // Combinar os dados
      const clientesComAgendamentos = clientesData?.map(cliente => {
        const agendamentosDoCliente = agendamentosData?.filter(agendamento => 
          agendamento.cliente === cliente.nome
        ).map(agendamento => ({
          id: agendamento.id,
          data: agendamento.data_hora,
          status: agendamento.status
        })) || [];

        return {
          ...cliente,
          agendamentos: agendamentosDoCliente
        };
      }) || [];

      console.log('Clientes com agendamentos:', clientesComAgendamentos);
      setClientes(clientesComAgendamentos);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes');
    }
  };

  const filtrarClientes = () => {
    if (!clientes) return [];
    
    let clientesFiltrados = clientes;
    
    // Aplicar filtro de pesquisa por nome
    if (pesquisa) {
      clientesFiltrados = clientesFiltrados.filter(cliente => 
        cliente.nome.toLowerCase().includes(pesquisa.toLowerCase())
      );
    }
    
    // Aplicar filtros específicos
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

        // Ordenar por data e horário do agendamento mais próximo
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
        // 'todos' - não aplica filtro adicional
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
          Alert.alert(
            'Erro',
            'WhatsApp não está instalado neste dispositivo'
          );
          return;
        }
        return Linking.openURL(url);
      })
      .catch(err => {
        console.error('Erro ao abrir WhatsApp:', err);
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

      if (data.length > 0) {
        const contatosValidos = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
        
        if (contatosValidos.length === 0) {
          Alert.alert('Nenhum contato', 'Não foram encontrados contatos com número de telefone.');
          return;
        }

        router.push({
          pathname: '/clientes/selecionar-contato',
          params: {
            contatos: JSON.stringify(contatosValidos.map(c => ({
              nome: c.name,
              telefone: c.phoneNumbers[0].number,
            })))
          }
        });
      } else {
        Alert.alert('Nenhum contato', 'Não foram encontrados contatos no dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao acessar contatos:', error);
      Alert.alert('Erro', 'Não foi possível acessar os contatos do dispositivo.');
    }
  };

  const abrirDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={abrirDrawer}
          >
            <FontAwesome5 name="bars" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <Text style={styles.title}>Clientes</Text>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={abrirMenu}
          >
            <FontAwesome5 name="plus" size={20} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.filtrosWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filtrosContainer}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <TouchableOpacity 
              style={[styles.filtroItem, filtro === 'todos' && styles.filtroAtivo]}
              onPress={() => setFiltro('todos')}
            >
              <View style={[styles.filtroIcone, filtro === 'todos' && styles.filtroIconeAtivo]}>
                <FontAwesome5 name="users" size={16} color={filtro === 'todos' ? '#7C3AED' : '#666'} />
              </View>
              <Text style={[styles.filtroTexto, filtro === 'todos' && styles.filtroTextoAtivo]}>Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filtroItem, filtro === 'agendados' && styles.filtroAtivo]}
              onPress={() => setFiltro('agendados')}
            >
              <View style={[styles.filtroIcone, filtro === 'agendados' && styles.filtroIconeAtivo]}>
                <FontAwesome5 name="calendar" size={16} color={filtro === 'agendados' ? '#7C3AED' : '#666'} />
              </View>
              <Text style={[styles.filtroTexto, filtro === 'agendados' && styles.filtroTextoAtivo]}>Agendados</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filtroItem, filtro === 'com_credito' && styles.filtroAtivo]}
              onPress={() => setFiltro('com_credito')}
            >
              <View style={[styles.filtroIcone, filtro === 'com_credito' && styles.filtroIconeAtivo]}>
                <FontAwesome5 name="user" size={16} color={filtro === 'com_credito' ? '#7C3AED' : '#666'} />
              </View>
              <Text style={[styles.filtroTexto, filtro === 'com_credito' && styles.filtroTextoAtivo]}>Com crédito</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filtroItem, filtro === 'com_debito' && styles.filtroAtivo]}
              onPress={() => setFiltro('com_debito')}
            >
              <View style={[styles.filtroIcone, filtro === 'com_debito' && styles.filtroIconeAtivo]}>
                <FontAwesome5 name="exclamation-circle" size={16} color={filtro === 'com_debito' ? '#7C3AED' : '#666'} />
              </View>
              <Text style={[styles.filtroTexto, filtro === 'com_debito' && styles.filtroTextoAtivo]}>Com Débito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.pesquisaContainer}>
          <FontAwesome5 name="search" size={16} color="#9CA3AF" style={styles.pesquisaIcone} />
          <TextInput
            style={styles.pesquisaInput}
            placeholder="Pesquisar por nome..."
            value={pesquisa}
            onChangeText={setPesquisa}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.totalClientes}>
          <Text style={styles.totalClientesNumero}>{filtrarClientes().length}</Text> clientes
        </Text>

        <ScrollView 
          style={styles.listaClientes}
          showsVerticalScrollIndicator={false}
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
                    <FontAwesome5 name="user" size={24} color="#9CA3AF" />
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
                <FontAwesome5 name="user-plus" size={20} color="#7C3AED" />
                <Text style={styles.menuItemTexto}>Novo Cliente</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={importarContato}
              >
                <FontAwesome5 name="address-book" size={20} color="#7C3AED" />
                <Text style={styles.menuItemTexto}>Importar contatos</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerButtonImport: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  filtrosWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtrosContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  filtroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  filtroIconeAtivo: {
    backgroundColor: '#fff',
  },
  filtroTexto: {
    fontSize: 14,
    color: '#666',
  },
  filtroTextoAtivo: {
    color: '#7C3AED',
    fontWeight: '500',
  },
  pesquisaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#F3F4F6',
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
    color: '#6B7280',
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
    backgroundColor: '#fff',
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