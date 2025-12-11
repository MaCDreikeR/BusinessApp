import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Switch,
  RefreshControl 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

interface Config {
  id: string;
  chave: string;
  valor: string | null;
  tipo: 'text' | 'number' | 'boolean' | 'json' | 'url' | 'email';
  categoria: string;
  descricao: string | null;
  ordem: number;
}

interface ConfigSection {
  title: string;
  icon: string;
  categoria: string;
  configs: Config[];
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_globais')
        .select('*')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true });

      if (error) throw error;

      setConfigs(data || []);
      
      // Preencher formData com valores atuais
      const initialData: Record<string, any> = {};
      (data || []).forEach(config => {
        if (config.tipo === 'boolean') {
          initialData[config.chave] = config.valor === 'true';
        } else if (config.tipo === 'number') {
          initialData[config.chave] = config.valor ? parseFloat(config.valor) : 0;
        } else {
          initialData[config.chave] = config.valor || '';
        }
      });
      setFormData(initialData);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar as configurações.');
    }
  };

  const fetchPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchConfigs(), fetchPlanos()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Atualizar cada configuração
      const updates = configs.map(config => {
        let valor = formData[config.chave];
        
        // Converter para string conforme o tipo
        if (config.tipo === 'boolean') {
          valor = valor ? 'true' : 'false';
        } else if (config.tipo === 'number') {
          valor = String(valor || 0);
        } else {
          valor = String(valor || '');
        }

        return supabase
          .from('configuracoes_globais')
          .update({ valor })
          .eq('chave', config.chave);
      });

      const results = await Promise.all(updates);
      
      // Verificar erros
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Erro ao salvar algumas configurações');
      }

      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
      await fetchConfigs();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

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
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (error: any) {
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
            }
          },
        },
      ],
    );
  };

  const sections: ConfigSection[] = [
    {
      title: 'Geral da Plataforma',
      icon: 'cog',
      categoria: 'geral',
      configs: configs.filter(c => c.categoria === 'geral'),
    },
    {
      title: 'Novos Cadastros',
      icon: 'user-plus',
      categoria: 'cadastro',
      configs: configs.filter(c => c.categoria === 'cadastro'),
    },
    {
      title: 'Notificações',
      icon: 'bell',
      categoria: 'notificacoes',
      configs: configs.filter(c => c.categoria === 'notificacoes'),
    },
  ];

  const renderConfigInput = (config: Config) => {
    const value = formData[config.chave];

    switch (config.tipo) {
      case 'boolean':
        return (
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{config.descricao}</Text>
            <Switch
              value={value}
              onValueChange={(val) => setFormData({ ...formData, [config.chave]: val })}
              trackColor={{ false: '#374151', true: '#a78bfa' }}
              thumbColor={value ? '#fff' : '#9ca3af'}
            />
          </View>
        );

      case 'number':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{config.descricao}</Text>
            <TextInput
              style={styles.input}
              value={String(value || '')}
              onChangeText={(text) => setFormData({ ...formData, [config.chave]: parseFloat(text) || 0 })}
              keyboardType="numeric"
              placeholderTextColor="#6b7280"
            />
          </View>
        );

      case 'email':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{config.descricao}</Text>
            <TextInput
              style={styles.input}
              value={value || ''}
              onChangeText={(text) => setFormData({ ...formData, [config.chave]: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#6b7280"
            />
          </View>
        );

      case 'url':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{config.descricao}</Text>
            <TextInput
              style={styles.input}
              value={value || ''}
              onChangeText={(text) => setFormData({ ...formData, [config.chave]: text })}
              keyboardType="url"
              autoCapitalize="none"
              placeholderTextColor="#6b7280"
            />
          </View>
        );

      default:
        // text
        if (config.chave === 'cadastro_plano_padrao_id') {
          return (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{config.descricao}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={value || ''}
                  onValueChange={(itemValue) => setFormData({ ...formData, [config.chave]: itemValue })}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item label="Selecione um plano..." value="" />
                  {planos.map(plano => (
                    <Picker.Item key={plano.id} label={plano.nome} value={plano.id} />
                  ))}
                </Picker>
              </View>
            </View>
          );
        } else if (config.chave === 'notif_relatorio_frequencia') {
          return (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{config.descricao}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={value || 'nunca'}
                  onValueChange={(itemValue) => setFormData({ ...formData, [config.chave]: itemValue })}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item label="Nunca" value="nunca" />
                  <Picker.Item label="Diário" value="diario" />
                  <Picker.Item label="Semanal" value="semanal" />
                  <Picker.Item label="Mensal" value="mensal" />
                </Picker>
              </View>
            </View>
          );
        } else {
          return (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{config.descricao}</Text>
              <TextInput
                style={styles.input}
                value={value || ''}
                onChangeText={(text) => setFormData({ ...formData, [config.chave]: text })}
                placeholderTextColor="#6b7280"
              />
            </View>
          );
        }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View style={styles.header}>
        <FontAwesome5 name="cog" size={32} color="#a78bfa" />
        <Text style={styles.headerTitle}>Configurações Globais</Text>
        <Text style={styles.headerSubtitle}>Gerenciar configurações da plataforma</Text>
      </View>

      {sections.map((section) => (
        <View key={section.categoria} style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name={section.icon} size={20} color="#a78bfa" />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>

          <View style={styles.sectionContent}>
            {section.configs.map((config) => (
              <View key={config.chave}>
                {renderConfigInput(config)}
              </View>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <FontAwesome5 name="save" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <FontAwesome5 name="sign-out-alt" size={18} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  contentContainer: {
    padding: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  sectionContent: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  pickerContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#374151',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#a78bfa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});