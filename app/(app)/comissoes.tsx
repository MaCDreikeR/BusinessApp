import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  avatar_url?: string;
  faz_atendimento?: boolean;
  role?: string;
}

interface RegistroComissao {
  id: string;
  usuario_id: string;
  valor: number;
  descricao: string;
  data: string;
  created_at: string;
}

interface ComissoesUsuario {
  usuario_id: string;
  total_a_pagar: number;
}

export default function ComissoesScreen() {
  const { estabelecimentoId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [registrosComissao, setRegistrosComissao] = useState<RegistroComissao[]>([]);
  const [valoresComissao, setValoresComissao] = useState<{[key: string]: string}>({});
  const [descricoesComissao, setDescricoesComissao] = useState<{[key: string]: string}>({});
  const [comissoesAPagar, setComissoesAPagar] = useState<{[key: string]: number}>({});

  useEffect(() => {
    console.log('🏢 Estabelecimento ID:', estabelecimentoId);
    console.log('👤 Usuário logado:', user?.email);
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      await carregarUsuarios();
      await carregarComissoesAPagar();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      console.log('🔍 Buscando usuários do estabelecimento:', estabelecimentoId);
      console.log('🔍 Tipo de estabelecimentoId:', typeof estabelecimentoId);
      
      if (!estabelecimentoId) {
        console.error('❌ estabelecimentoId está nulo!');
        Alert.alert('Erro', 'ID do estabelecimento não encontrado');
        return;
      }

      // MÉTODO 1: Tentar usar RPC function (se existir)
      console.log('🚀 Tentando usar função RPC get_usuarios_estabelecimento...');
      const { data: dataRpc, error: errorRpc } = await supabase
        .rpc('get_usuarios_estabelecimento', { 
          p_estabelecimento_id: estabelecimentoId 
        });

      if (!errorRpc && dataRpc) {
        console.log('✅ Usuários encontrados via RPC:', dataRpc.length);
        console.log('📋 Lista de usuários (RPC):', JSON.stringify(dataRpc, null, 2));
        setUsuarios(dataRpc || []);
        return;
      }

      console.log('⚠️ RPC não disponível ou erro:', errorRpc?.message);
      console.log('🔄 Tentando query direta...');

      // MÉTODO 2: Query direta (pode ser bloqueada por RLS)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, avatar_url, faz_atendimento, role, estabelecimento_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .neq('role', 'super_admin')
        .order('nome_completo');

      if (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
        
        // MÉTODO 3: Buscar todos e filtrar manualmente (último recurso)
        console.log('🔄 Última tentativa: buscar todos os usuários...');
        const { data: todosUsuarios, error: errorTodos } = await supabase
          .from('usuarios')
          .select('id, nome_completo, email, avatar_url, faz_atendimento, role, estabelecimento_id');
        
        if (!errorTodos && todosUsuarios) {
          const usuariosFiltrados = todosUsuarios.filter(u => 
            u.estabelecimento_id === estabelecimentoId && u.role !== 'super_admin'
          );
          console.log('✅ Usuários filtrados manualmente:', usuariosFiltrados.length);
          console.log('📋 Lista filtrada:', JSON.stringify(usuariosFiltrados, null, 2));
          setUsuarios(usuariosFiltrados);
          return;
        }
        
        throw error;
      }
      
      console.log('✅ Usuários encontrados via query direta:', data?.length);
      console.log('📋 Lista de usuários:', JSON.stringify(data, null, 2));
      
      setUsuarios(data || []);
    } catch (error) {
      console.error('💥 Erro ao carregar usuários:', error);
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
      console.error('Erro ao carregar comissões a pagar:', error);
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
      console.error('Erro ao carregar registros de comissão:', error);
      Alert.alert('Erro', 'Não foi possível carregar os registros');
    }
  };

  const abrirDetalhes = async (usuario: Usuario) => {
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

  const registrarComissao = async (usuario: Usuario) => {
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
      console.error('Erro ao registrar comissão:', error);
      Alert.alert('Erro', 'Não foi possível registrar a comissão');
    }
  };

  const pagarComissao = async (usuario: Usuario) => {
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
              console.error('Erro ao pagar comissão:', error);
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

  const renderUsuarioCard = ({ item }: { item: Usuario }) => {
    const totalAPagar = calcularTotalComissoes(item.id);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#fff" />
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
          <TouchableOpacity
            style={styles.botaoPagar}
            onPress={() => pagarComissao(item)}
          >
            <Ionicons name="cash" size={20} color="#fff" />
            <Text style={styles.botaoPagarTexto}>Pagar</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.botaoRegistrar}
              onPress={() => registrarComissao(item)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.botaoRegistrarTexto}>Adicionar</Text>
            </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.botaoDetalhes}
          onPress={() => abrirDetalhes(item)}
        >
          <Text style={styles.botaoDetalhesTexto}>Ver histórico</Text>
          <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
        </TouchableOpacity>
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
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comissões</Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          {usuarios.length} usuário(s) encontrado(s)
        </Text>
      </View>

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
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
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
              <TouchableOpacity
                onPress={() => setModalDetalhesVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    backgroundColor: '#8B5CF6',
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
    color: '#111827',
    marginBottom: 2,
  },
  usuarioEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  comissaoAPagarContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  comissaoAPagarLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  comissaoAPagarValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  comissaoAPagarDestaque: {
    color: '#10B981',
  },
  botaoPagar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  botaoPagarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    color: '#6B7280',
    marginBottom: 6,
  },
  valorInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  botaoRegistrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 18,
  },
  botaoRegistrarTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  descricaoContainer: {
    marginTop: 8,
  },
  descricaoInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
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
    color: '#8B5CF6',
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
    color: '#9CA3AF',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  resumoContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  resumoItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  resumoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  resumoValorDestaque: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  vendasTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  vendasList: {
    paddingHorizontal: 20,
  },
  registroCard: {
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  registroData: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#10B981',
  },
  registroValorNegativo: {
    color: '#EF4444',
  },
  registroPago: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#EF4444',
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
    color: '#9CA3AF',
  },
});
