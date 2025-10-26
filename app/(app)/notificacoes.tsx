import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistoricoNotificacoes } from '../../services/notifications';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  data_envio: string;
}

// Função para formatar a data
function formatarData(dataString: string) {
  const data = new Date(dataString);
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = data.toLocaleString('pt-BR', { month: 'long' });
  const hora = data.getHours().toString().padStart(2, '0');
  const minuto = data.getMinutes().toString().padStart(2, '0');
  
  return `${dia} de ${mes} às ${hora}:${minuto}`;
}

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const historico = await getHistoricoNotificacoes();
      setNotificacoes(historico);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de notificações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
  }, []);

  const renderItem = ({ item }: { item: Notificacao }) => (
    <TouchableOpacity style={styles.notificacaoItem}>
      <View style={styles.notificacaoIcon}>
        <Ionicons 
          name={item.tipo === 'agendamento' ? 'calendar' : 
                item.tipo === 'aniversario' ? 'gift' : 
                'notifications'} 
          size={24} 
          color="#7C3AED" 
        />
      </View>
      <View style={styles.notificacaoConteudo}>
        <Text style={styles.notificacaoTitulo}>{item.titulo}</Text>
        <Text style={styles.notificacaoMensagem}>{item.mensagem}</Text>
        <Text style={styles.notificacaoData}>
          {formatarData(item.data_envio)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Carregando notificações...</Text>
        </View>
      ) : notificacoes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={carregarNotificacoes}
            >
              <Ionicons name="refresh" size={24} color="#7C3AED" />
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    padding: 16,
  },
  refreshButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 16,
  },
  notificacaoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  notificacaoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificacaoConteudo: {
    flex: 1,
  },
  notificacaoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificacaoMensagem: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  notificacaoData: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
}); 