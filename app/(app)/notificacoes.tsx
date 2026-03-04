import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCreateStyles, ColorTheme } from '../../utils/accentTheme';
import { getHistoricoNotificacoes } from '../../services/notifications';
import { logger } from '../../utils/logger';
import { Button } from '../../components/Button2';

// Função para formatar a data
function formatarData(dataString: string) {
  const data = new Date(dataString);
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = data.toLocaleString('pt-BR', { month: 'long' });
  const hora = data.getHours().toString().padStart(2, '0');
  const minuto = data.getMinutes().toString().padStart(2, '0');
  
  return `${dia} de ${mes} às ${hora}:${minuto}`;
}

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  data_envio: string;
};

export default function NotificacoesScreen() {
  // Melhoria #2: useCreateStyles elimina repetição de useMemo + useTheme
  // Combina ambos em uma única chamada com acesso a colors e design tokens
  const styles = useCreateStyles(({ colors, design }) => createStyles(colors, design));
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const historico = await getHistoricoNotificacoes();
      setNotificacoes(historico);
    } catch (error) {
      logger.error('Erro ao carregar notificações:', error);
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
          color={colors.primary} 
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
          <Ionicons name="notifications-off" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <Button 
              variant="ghost"
              size="medium"
              icon="refresh"
              onPress={carregarNotificacoes}
              style={styles.refreshButton}
            />
          }
        />
      )}
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
// Melhoria #1: Type safety com ColorTheme em vez de any
// Melhoria #4: Usando DESIGN_TOKENS para spacing e typography
const createStyles = (colors: ColorTheme, design: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: design.spacing.lg,
  },
  refreshButton: {
    alignSelf: 'flex-end',
    padding: design.spacing.md,
    marginBottom: design.spacing.lg,
  },
  notificacaoItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: design.radius.md,
    padding: design.spacing.lg,
    marginBottom: design.spacing.md,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: design.spacing.md,
  },
  notificacaoConteudo: {
    flex: 1,
  },
  notificacaoTitulo: {
    fontSize: design.typography.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: design.spacing.xs,
  },
  notificacaoMensagem: {
    fontSize: design.typography.sm,
    color: colors.textSecondary,
    marginBottom: design.spacing.sm,
  },
  notificacaoData: {
    fontSize: design.typography.xs,
    color: colors.textSecondary,
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
    padding: design.spacing.lg,
  },
  emptyText: {
    fontSize: design.typography.base,
    color: colors.textSecondary,
    marginTop: design.spacing.md,
  },
});
