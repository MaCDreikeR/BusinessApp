import React, { useState, useEffect , useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { Usuario as UsuarioBase } from '@types';
import { Button } from '../../components/Button2';

type UsuarioComissao = Pick<UsuarioBase, 'id' | 'nome_completo' | 'email' | 'role'> & {
  avatar_url?: string;
  faz_atendimento?: boolean;
  recebe_comissao?: boolean;
};

type RegistroComissao = {
  id: string;
  usuario_id: string;
  valor: number;
  descricao: string;
  data: string;
  created_at: string;
};

type ComissoesUsuario = {
  usuario_id: string;
  total_a_pagar: number;
};

export default function ComissoesScreen() {
  const { estabelecimentoId, user } = useAuth();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioComissao[]>([]);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioComissao | null>(null);
  const [registrosComissao, setRegistrosComissao] = useState<RegistroComissao[]>([]);
  const [valoresComissao, setValoresComissao] = useState<{[key: string]: string}>({});
  const [descricoesComissao, setDescricoesComissao] = useState<{[key: string]: string}>({});
  const [comissoesAPagar, setComissoesAPagar] = useState<{[key: string]: number}>({});
  const [configComissoes, setConfigComissoes] = useState<{[key: string]: boolean}>({});
  const [todosUsuarios, setTodosUsuarios] = useState<UsuarioComissao[]>([]); // Para o modal de config

  useFocusEffect(
    useCallback(() => {
      logger.debug('🏢 Estabelecimento ID:', estabelecimentoId);
      logger.debug('👤 Usuário logado:', user?.email);
      carregarDados();

      // Listener para o botão de configuração no header
      const subscription = DeviceEventEmitter.addListener('abrirConfigComissoes', () => {
        abrirModalConfig();
      });

      return () => subscription.remove();
    }, [estabelecimentoId, user?.email])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);
      await carregarUsuarios();
      await carregarComissoesAPagar();
    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      logger.debug('🔍 Buscando usuários do estabelecimento:', estabelecimentoId);
      logger.debug('🔍 Tipo de estabelecimentoId:', typeof estabelecimentoId);
      
      if (!estabelecimentoId) {
        logger.error('❌ estabelecimentoId está nulo!');
        Alert.alert('Erro', 'ID do estabelecimento não encontrado');
        return;
      }

      // MÉTODO 1: Tentar usar RPC function (se existir)
      logger.debug('🚀 Tentando usar função RPC get_usuarios_estabelecimento...');
      const { data: dataRpc, error: errorRpc } = await supabase
        .rpc('get_usuarios_estabelecimento', { 
          p_estabelecimento_id: estabelecimentoId 
        });

      if (!errorRpc && dataRpc) {
        logger.debug('✅ Usuários encontrados via RPC:', dataRpc.length);
        logger.debug('📋 Lista de usuários (RPC):', JSON.stringify(dataRpc, null, 2));
        setUsuarios(dataRpc || []);
        return;
      }

      logger.debug('⚠️ RPC não disponível ou erro:', errorRpc?.message);
      logger.debug('🔄 Tentando query direta...');

      // MÉTODO 2: Query direta (pode ser bloqueada por RLS)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento, role, estabelecimento_id, recebe_comissao')
        .eq('estabelecimento_id', estabelecimentoId)
        .neq('role', 'super_admin')
        .order('nome_completo');

      if (error) {
        logger.error('❌ Erro ao buscar usuários:', error);
        logger.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
        
        // MÉTODO 3: Buscar todos e filtrar manualmente (último recurso)
        logger.debug('🔄 Última tentativa: buscar todos os usuários...');
        const { data: todosUsuarios, error: errorTodos } = await supabase
          .from('usuarios')
          .select('id, nome_completo, email, avatar_url, faz_atendimento, role, estabelecimento_id, recebe_comissao');
        
        if (!errorTodos && todosUsuarios) {
          // Filtrar por estabelecimento e por recebe_comissao
          const usuariosFiltrados = todosUsuarios.filter(u => {
            if (u.estabelecimento_id !== estabelecimentoId || u.role === 'super_admin') {
              return false;
            }
            // Se recebe_comissao for null, usar padrão baseado na role
            const podeReceber = u.recebe_comissao !== null 
              ? u.recebe_comissao 
              : (u.role === 'funcionario' || u.role === 'profissional');
            return podeReceber;
          });
          logger.debug('✅ Usuários filtrados manualmente:', usuariosFiltrados.length);
          logger.debug('📋 Lista filtrada:', JSON.stringify(usuariosFiltrados, null, 2));
          setUsuarios(usuariosFiltrados);
          return;
        }
        
        throw error;
      }
      
      logger.debug('✅ Usuários encontrados via query direta:', data?.length);
      logger.debug('📋 Lista de usuários:', JSON.stringify(data, null, 2));
      
      // Filtrar usuários que podem receber comissão
      const usuariosFiltrados = (data || []).filter(u => {
        // Se recebe_comissao for null, usar padrão baseado na role
        const podeReceber = u.recebe_comissao !== null 
          ? u.recebe_comissao 
          : (u.role === 'funcionario' || u.role === 'profissional');
        return podeReceber;
      });
      
      logger.debug('✅ Usuários que podem receber comissão:', usuariosFiltrados.length);
      setUsuarios(usuariosFiltrados);
    } catch (error) {
      logger.error('💥 Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários. Verifique as permissões RLS.');
    }
  };

  const carregarComissoesAPagar = async () => {
    try {
      const { data, error } = await supabase
        .from('comissoes_registros')
        .select('usuario_id, valor')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      // Calcular total a pagar por usuário (soma de todos os registros)
      const totaisPorUsuario: {[key: string]: number} = {};
      (data || []).forEach(registro => {
        if (!totaisPorUsuario[registro.usuario_id]) {
          totaisPorUsuario[registro.usuario_id] = 0;
        }
        totaisPorUsuario[registro.usuario_id] += parseFloat(String(registro.valor));
      });

      setComissoesAPagar(totaisPorUsuario);
    } catch (error) {
      logger.error('Erro ao carregar comissões a pagar:', error);
    }
  };

  const carregarRegistrosComissao = async (usuarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('comissoes_registros')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrosComissao(data || []);
    } catch (error) {
      logger.error('Erro ao carregar registros de comissão:', error);
      Alert.alert('Erro', 'Não foi possível carregar os registros');
    }
  };

  const abrirDetalhes = async (usuario: UsuarioComissao) => {
    setUsuarioSelecionado(usuario);
    await carregarRegistrosComissao(usuario.id);
    setModalDetalhesVisible(true);
  };

  const formatarValor = (texto: string) => {
    // Remove tudo exceto números
    const apenasNumeros = texto.replace(/\D/g, '');
    
    if (!apenasNumeros) return '';
    
    // Converte para número e divide por 100 para ter os centavos
    const numero = parseInt(apenasNumeros) / 100;
    
    // Formata com vírgula e separador de milhar
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const registrarComissao = async (usuario: UsuarioComissao) => {
    const valorFormatado = valoresComissao[usuario.id];
    const descricao = descricoesComissao[usuario.id]?.trim() || '';

    if (!valorFormatado) {
      Alert.alert('Atenção', 'Por favor, informe um valor para a comissão');
      return;
    }

    try {
      // Remove formatação e converte para float
      const valorFloat = parseFloat(valorFormatado.replace(/\./g, '').replace(',', '.'));
      
      if (valorFloat <= 0) {
        Alert.alert('Atenção', 'O valor deve ser maior que zero');
        return;
      }
      
      const { error } = await supabase
        .from('comissoes_registros')
        .insert({
          usuario_id: usuario.id,
          estabelecimento_id: estabelecimentoId,
          valor: valorFloat,
          descricao: descricao || null,
          data: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      Alert.alert('Sucesso', `Comissão de R$ ${valorFloat.toFixed(2)} registrada para ${usuario.nome_completo}`);
      
      // Limpar campos
      setValoresComissao(prev => ({ ...prev, [usuario.id]: '' }));
      setDescricoesComissao(prev => ({ ...prev, [usuario.id]: '' }));
      
      carregarDados();
    } catch (error) {
      logger.error('Erro ao registrar comissão:', error);
      Alert.alert('Erro', 'Não foi possível registrar a comissão');
    }
  };

  const pagarComissao = async (usuario: UsuarioComissao) => {
    const totalAPagar = comissoesAPagar[usuario.id] || 0;

    if (totalAPagar <= 0) {
      Alert.alert('Atenção', 'Não há comissões pendentes para este usuário');
      return;
    }

    Alert.alert(
      'Confirmar Pagamento',
      `Deseja confirmar o pagamento de R$ ${totalAPagar.toFixed(2)} para ${usuario.nome_completo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              // Criar registro de pagamento (valor negativo para zerar o saldo)
              const { error } = await supabase
                .from('comissoes_registros')
                .insert({
                  usuario_id: usuario.id,
                  estabelecimento_id: estabelecimentoId,
                  valor: -totalAPagar, // Negativo zera o saldo
                  descricao: `Pagamento realizado`,
                  data: new Date().toISOString().split('T')[0],
                });

              if (error) throw error;

              Alert.alert('Sucesso', `Pagamento de R$ ${totalAPagar.toFixed(2)} realizado com sucesso!`);
              carregarDados();
            } catch (error) {
              logger.error('Erro ao pagar comissão:', error);
              Alert.alert('Erro', 'Não foi possível processar o pagamento');
            }
          },
        },
      ]
    );
  };

  const calcularTotalComissoes = (usuarioId: string) => {
    return comissoesAPagar[usuarioId] || 0;
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const carregarConfigComissoes = async () => {
    try {
      // Buscar configurações salvas E TODOS os usuários para o modal
      const { data: configs, error } = await supabase
        .from('usuarios')
        .select('id, recebe_comissao, role, nome_completo')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      const configMap: {[key: string]: boolean} = {};
      const todosUsersArray: UsuarioComissao[] = [];
      
      configs?.forEach(user => {
        // Se recebe_comissao for null/undefined, usar valor padrão baseado na role
        if (user.recebe_comissao !== null && user.recebe_comissao !== undefined) {
          configMap[user.id] = user.recebe_comissao;
        } else {
          // Padrão: funcionario e profissional = true, principal = false
          configMap[user.id] = user.role === 'funcionario' || user.role === 'profissional';
        }
        
        // Adicionar à lista de todos os usuários para o modal
        todosUsersArray.push({
          id: user.id,
          nome: user.nome_completo || 'Sem nome',
          role: user.role,
          recebe_comissao: user.recebe_comissao
        });
      });

      setConfigComissoes(configMap);
      setTodosUsuarios(todosUsersArray);
    } catch (error) {
      logger.error('Erro ao carregar configurações de comissão:', error);
    }
  };

  const alternarComissao = async (usuarioId: string, novoValor: boolean) => {
    try {
      // Atualizar no banco
      const { error } = await supabase
        .from('usuarios')
        .update({ recebe_comissao: novoValor })
        .eq('id', usuarioId);

      if (error) throw error;

      // Atualizar estado local
      setConfigComissoes(prev => ({ ...prev, [usuarioId]: novoValor }));
      
      // Recarregar lista de usuários para refletir mudanças
      await carregarUsuarios();
      
      logger.debug(`✅ Comissão ${novoValor ? 'ativada' : 'desativada'} para usuário ${usuarioId}`);
    } catch (error) {
      logger.error('Erro ao alterar configuração de comissão:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a configuração');
    }
  };

  const abrirModalConfig = async () => {
    await carregarConfigComissoes();
    setModalConfigVisible(true);
  };

  const renderUsuarioCard = ({ item }: { item: UsuarioComissao }) => {
    const totalAPagar = calcularTotalComissoes(item.id);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View style={styles.usuarioInfo}>
              <Text style={styles.usuarioNome}>{item.nome_completo}</Text>
              <Text style={styles.usuarioEmail}>{item.email}</Text>
            </View>
          </View>
        </View>

        {/* Seção de Comissões a Pagar */}
        <View style={styles.comissaoAPagarContainer}>
          <Text style={styles.comissaoAPagarLabel}>Comissões a pagar:</Text>
          <Text style={[styles.comissaoAPagarValor, totalAPagar > 0 && styles.comissaoAPagarDestaque]}>
            {totalAPagar.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </Text>
        </View>

        {/* Botão Pagar (só aparece se houver saldo) */}
        {totalAPagar > 0 && (
          <Button
            variant="primary"
            size="small"
            icon="cash"
            onPress={() => pagarComissao(item)}
            style={styles.botaoPagar}
          >
            Pagar
          </Button>
        )}

        <View style={styles.cardBody}>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Adicionar Comissão</Text>
              <TextInput
                style={styles.valorInput}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                value={valoresComissao[item.id] || ''}
                onChangeText={(text) => {
                  const valorFormatado = formatarValor(text);
                  setValoresComissao(prev => ({ ...prev, [item.id]: valorFormatado }));
                }}
              />
            </View>
            <Button
              variant="primary"
              size="small"
              icon="add-circle"
              onPress={() => registrarComissao(item)}
              style={styles.botaoRegistrar}
            >
              Adicionar
            </Button>
          </View>

          <View style={styles.descricaoContainer}>
            <TextInput
              style={styles.descricaoInput}
              placeholder="Descrição (opcional)"
              multiline
              numberOfLines={2}
              value={descricoesComissao[item.id] || ''}
              onChangeText={(text) => {
                setDescricoesComissao(prev => ({ ...prev, [item.id]: text }));
              }}
            />
          </View>
        </View>

        <Button
          variant="ghost"
          size="small"
          icon="chevron-forward"
          onPress={() => abrirDetalhes(item)}
          style={styles.botaoDetalhes}
        >
          Ver histórico
        </Button>
      </View>
    );
  };

  const renderRegistroComissao = ({ item }: { item: RegistroComissao }) => {
    const isNegativo = parseFloat(String(item.valor)) < 0;
    
    return (
      <View style={styles.registroCard}>
        <View style={styles.registroHeader}>
          <Text style={styles.registroDescricao} numberOfLines={2}>
            {item.descricao || 'Sem descrição'}
          </Text>
          <Text style={styles.registroData}>
            {new Date(item.data).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={styles.registroBody}>
          <Text style={[
            styles.registroValor,
            isNegativo && styles.registroValorNegativo
          ]}>
            {parseFloat(String(item.valor)).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </Text>
          {isNegativo && (
            <Text style={styles.registroPago}>PAGO</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={usuarios}
        renderItem={renderUsuarioCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.borderLight} />
            <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
          </View>
        }
      />

      {/* Modal de Detalhes */}
      <Modal
        visible={modalDetalhesVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalDetalhesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Histórico - {usuarioSelecionado?.nome_completo}
              </Text>
              <Button
                variant="ghost"
                size="small"
                icon="close"
                onPress={() => setModalDetalhesVisible(false)}
                style={styles.modalCloseButton}
              />
            </View>

            <View style={styles.resumoContainer}>
              <View style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Total de Comissões</Text>
                <Text style={styles.resumoValorDestaque}>
                  {registrosComissao
                    .reduce((sum, r) => sum + parseFloat(String(r.valor)), 0)
                    .toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                </Text>
              </View>
              <View style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Registros</Text>
                <Text style={styles.resumoValor}>{registrosComissao.length}</Text>
              </View>
            </View>

            <Text style={styles.vendasTitulo}>Comissões Registradas</Text>

            <FlatList
              data={registrosComissao}
              renderItem={renderRegistroComissao}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.vendasList}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>
                    Nenhuma comissão registrada ainda
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Configuração */}
      <Modal
        visible={modalConfigVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalConfigCenter}>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitleCenter}>Quem recebe comissão?</Text>
              <Button 
                variant="ghost"
                size="small"
                icon="close"
                onPress={() => setModalConfigVisible(false)}
                style={styles.closeButtonCenter}
              />
            </View>

            <ScrollView style={styles.configListCenter} showsVerticalScrollIndicator={false}>
              {todosUsuarios.map((usuario) => {
                const isAtivo = configComissoes[usuario.id] ?? 
                  (usuario.role === 'funcionario' || usuario.role === 'profissional');
                
                return (
                  <View key={usuario.id} style={styles.configItemCenter}>
                    <View style={styles.configItemInfoCenter}>
                      <Text style={styles.configItemNomeCenter}>{usuario.nome}</Text>
                    </View>
                    <Switch
                      value={isAtivo}
                      onValueChange={(valor) => alternarComissao(usuario.id, valor)}
                      trackColor={{ false: colors.border, true: colors.primary + '80' }}
                      thumbColor={isAtivo ? colors.primaryContrast : colors.borderLight}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  usuarioEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  comissaoAPagarContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  comissaoAPagarLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  comissaoAPagarValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  comissaoAPagarDestaque: {
    color: colors.success,
  },
  botaoPagar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  botaoPagarTexto: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  valorInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  botaoRegistrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 18,
  },
  botaoRegistrarTexto: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  descricaoContainer: {
    marginTop: 8,
  },
  descricaoInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  botaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  botaoDetalhesTexto: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalTitleCenter: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCenter: {
    padding: 2,
  },
  resumoContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  resumoItem: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
  resumoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  resumoValorDestaque: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  vendasTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  vendasList: {
    paddingHorizontal: 20,
  },
  registroCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  registroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  registroDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  registroData: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  registroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  registroValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  registroValorNegativo: {
    color: colors.error,
  },
  registroPago: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyListText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  modalConfig: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    marginTop: 'auto',
  },
  modalConfigCenter: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '50%',
    width: '60%',
    paddingTop: 0,
    overflow: 'hidden',
  },
  configListCenter: {
    maxHeight: 280,
    paddingHorizontal: 0,
  },
  configItemCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  configItemInfoCenter: {
    flex: 1,
  },
  configItemNomeCenter: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  configSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  configList: {
    maxHeight: 400,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  configItemInfo: {
    flex: 1,
  },
  configItemNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  configItemRole: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
