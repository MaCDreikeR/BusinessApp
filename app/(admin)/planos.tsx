import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number | null;
  max_usuarios: number | null;
  max_clientes: number | null;
  max_produtos: number | null;
  max_agendamentos_mes: number | null;
  recursos: any;
  ativo: boolean;
  ordem: number;
  created_at: string;
  _count?: {
    assinaturas: number;
  };
}

export default function PlanosScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco_mensal: '',
    preco_anual: '',
    max_usuarios: '',
    max_clientes: '',
    max_produtos: '',
    max_agendamentos_mes: '',
  });

  const fetchPlanos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;

      // Verificar se os dados são válidos
      if (!data || !Array.isArray(data)) {
        console.warn('Dados de planos inválidos:', data);
        setPlanos([]);
        return;
      }

      // Buscar contagem de assinaturas para cada plano
      const planosComContagem = await Promise.all(
        data.map(async (plano) => {
          // Garantir que plano tem id
          if (!plano || !plano.id) {
            console.warn('Plano sem ID:', plano);
            return null;
          }

          const { count } = await supabase
            .from('assinaturas')
            .select('id', { count: 'exact', head: true })
            .eq('plano_id', plano.id);

          return {
            ...plano,
            nome: plano.nome || 'Sem nome',
            descricao: plano.descricao || null,
            preco_mensal: Number(plano.preco_mensal) || 0,
            preco_anual: plano.preco_anual ? Number(plano.preco_anual) : null,
            _count: { assinaturas: count || 0 },
          };
        })
      );

      // Filtrar planos nulos
      setPlanos(planosComContagem.filter(p => p !== null) as Plano[]);
    } catch (error: any) {
      console.error('Erro ao carregar planos:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os planos.');
      setPlanos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanos();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlanos();
    setRefreshing(false);
  }, []);

  const handleEdit = (plano: Plano) => {
    setEditingId(plano.id);
    setFormData({
      nome: plano.nome,
      descricao: plano.descricao || '',
      preco_mensal: plano.preco_mensal.toString(),
      preco_anual: plano.preco_anual?.toString() || '',
      max_usuarios: plano.max_usuarios?.toString() || '',
      max_clientes: plano.max_clientes?.toString() || '',
      max_produtos: plano.max_produtos?.toString() || '',
      max_agendamentos_mes: plano.max_agendamentos_mes?.toString() || '',
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('planos')
        .update({
          nome: formData.nome,
          descricao: formData.descricao || null,
          preco_mensal: parseFloat(formData.preco_mensal) || 0,
          preco_anual: formData.preco_anual ? parseFloat(formData.preco_anual) : null,
          max_usuarios: formData.max_usuarios ? parseInt(formData.max_usuarios) : null,
          max_clientes: formData.max_clientes ? parseInt(formData.max_clientes) : null,
          max_produtos: formData.max_produtos ? parseInt(formData.max_produtos) : null,
          max_agendamentos_mes: formData.max_agendamentos_mes ? parseInt(formData.max_agendamentos_mes) : null,
        })
        .eq('id', editingId);

      if (error) throw error;

      Alert.alert('Sucesso', 'Plano atualizado com sucesso!');
      setEditingId(null);
      fetchPlanos();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o plano.');
    }
  };

  const handleToggleAtivo = async (plano: Plano) => {
    try {
      const { error } = await supabase
        .from('planos')
        .update({ ativo: !plano.ativo })
        .eq('id', plano.id);

      if (error) throw error;

      Alert.alert('Sucesso', `Plano ${!plano.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      fetchPlanos();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível alterar o status do plano.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Carregando planos...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.viewSubscriptionsButton}
          onPress={() => router.push('/(admin)/assinaturas')}
        >
          <FontAwesome5 name="list" size={16} color="#fff" />
          <Text style={styles.viewSubscriptionsText}>Ver Assinaturas</Text>
        </TouchableOpacity>
      </View>

      {planos.map((plano) => (
        <View key={plano.id} style={styles.planoCard}>
          {editingId === plano.id ? (
            // Modo Edição
            <>
              <TextInput
                style={styles.input}
                value={formData.nome}
                onChangeText={(text) => setFormData({ ...formData, nome: text })}
                placeholder="Nome do plano"
                placeholderTextColor="#6B7280"
              />
              <TextInput
                style={styles.input}
                value={formData.descricao}
                onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                placeholder="Descrição"
                placeholderTextColor="#6B7280"
                multiline
              />
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Preço Mensal</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.preco_mensal}
                    onChangeText={(text) => setFormData({ ...formData, preco_mensal: text })}
                    placeholder="0.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Preço Anual</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.preco_anual}
                    onChangeText={(text) => setFormData({ ...formData, preco_anual: text })}
                    placeholder="0.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Máx. Usuários</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.max_usuarios}
                    onChangeText={(text) => setFormData({ ...formData, max_usuarios: text })}
                    placeholder="Ilimitado"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Máx. Clientes</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.max_clientes}
                    onChangeText={(text) => setFormData({ ...formData, max_clientes: text })}
                    placeholder="Ilimitado"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Máx. Produtos</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.max_produtos}
                    onChangeText={(text) => setFormData({ ...formData, max_produtos: text })}
                    placeholder="Ilimitado"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Agend./Mês</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.max_agendamentos_mes}
                    onChangeText={(text) => setFormData({ ...formData, max_agendamentos_mes: text })}
                    placeholder="Ilimitado"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4ade80' }]}
                  onPress={handleSave}
                >
                  <FontAwesome5 name="check" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Salvar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                  onPress={() => setEditingId(null)}
                >
                  <FontAwesome5 name="times" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Modo Visualização
            <>
              <View style={styles.planoHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planoNome}>{plano.nome || 'Sem nome'}</Text>
                  {plano.descricao && (
                    <Text style={styles.planoDescricao}>{plano.descricao}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: plano.ativo ? '#4ade80' : '#6B7280' }]}>
                  <Text style={styles.statusText}>{plano.ativo ? 'Ativo' : 'Inativo'}</Text>
                </View>
              </View>

              <View style={styles.precoRow}>
                <View style={styles.precoCard}>
                  <Text style={styles.precoLabel}>Mensal</Text>
                  <Text style={styles.precoValue}>
                    R$ {plano.preco_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                {plano.preco_anual && (
                  <View style={styles.precoCard}>
                    <Text style={styles.precoLabel}>Anual</Text>
                    <Text style={styles.precoValue}>
                      R$ {plano.preco_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.limitsGrid}>
                <View style={styles.limitItem}>
                  <FontAwesome5 name="users" size={14} color="#60a5fa" />
                  <Text style={styles.limitLabel}>Usuários</Text>
                  <Text style={styles.limitValue}>{plano.max_usuarios || '∞'}</Text>
                </View>
                <View style={styles.limitItem}>
                  <FontAwesome5 name="user-friends" size={14} color="#34d399" />
                  <Text style={styles.limitLabel}>Clientes</Text>
                  <Text style={styles.limitValue}>{plano.max_clientes || '∞'}</Text>
                </View>
                <View style={styles.limitItem}>
                  <FontAwesome5 name="box" size={14} color="#fbbf24" />
                  <Text style={styles.limitLabel}>Produtos</Text>
                  <Text style={styles.limitValue}>{plano.max_produtos || '∞'}</Text>
                </View>
                <View style={styles.limitItem}>
                  <FontAwesome5 name="calendar-alt" size={14} color="#8b5cf6" />
                  <Text style={styles.limitLabel}>Agend./Mês</Text>
                  <Text style={styles.limitValue}>{plano.max_agendamentos_mes || '∞'}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <FontAwesome5 name="building" size={16} color="#a78bfa" />
                  <Text style={styles.statValue}>{plano._count?.assinaturas || 0}</Text>
                  <Text style={styles.statLabel}>Assinaturas</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#60a5fa' }]}
                  onPress={() => handleEdit(plano)}
                >
                  <FontAwesome5 name="edit" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: plano.ativo ? '#f59e0b' : '#4ade80' }]}
                  onPress={() => handleToggleAtivo(plano)}
                >
                  <FontAwesome5 name={plano.ativo ? 'pause' : 'play'} size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>{plano.ativo ? 'Desativar' : 'Ativar'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  viewSubscriptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#a78bfa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewSubscriptionsText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  planoCard: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  planoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planoNome: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  planoDescricao: { fontSize: 14, color: '#9CA3AF' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  precoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  precoCard: {
    flex: 1,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  precoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  precoValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  limitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  limitItem: {
    width: '47%',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  limitLabel: { fontSize: 11, color: '#9CA3AF', marginVertical: 4 },
  limitValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  statLabel: { fontSize: 12, color: '#9CA3AF' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: { flex: 1 },
  label: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
});
