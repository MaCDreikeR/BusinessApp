import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Dropdown } from 'react-native-element-dropdown';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';

// Segmentos igual tela de cadastro
const segmentos = [
  { label: 'Beleza', value: 'beleza' },
  { label: 'Estética', value: 'estetica' },
  { label: 'Barbearia', value: 'barbearia' },
  { label: 'Clínica', value: 'clinica' },
  { label: 'Outro', value: 'outro' },
];

export default function ContaDetalhes() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'users'>('info');
  const [estab, setEstab] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [segmento, setSegmento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      // Buscar estabelecimento e usuários
      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('*, usuarios:usuarios(*)')
        .eq('id', id)
        .single();
      if (est) {
        setEstab(est);
        setUsuarios(est.usuarios || []);
        setNomeEstabelecimento(est.nome_fantasia || '');
        setSegmento(est.segmento || '');
        setNumeroDocumento(est.cnpj || '');
        // Buscar usuário principal
        const principal = (est.usuarios || []).find((u: any) => u.is_principal);
        setEmailPrincipal(principal?.email || '');
        setTelefone(principal?.telefone || '');
      }
      setLoading(false);
    };
    fetchDetails();
  }, [id]);

  const salvarAlteracoes = async () => {
    setSaving(true);
    try {
      // Atualizar estabelecimento
      await supabase
        .from('estabelecimentos')
        .update({
          nome_fantasia: nomeEstabelecimento,
          segmento,
          cnpj: tipoDocumento === 'CNPJ' ? numeroDocumento : null,
        })
        .eq('id', id);
      // Atualizar/criar usuário principal
      let principal = usuarios.find(u => u.is_principal);
      if (principal) {
        await supabase
          .from('usuarios')
          .update({ email: emailPrincipal, telefone })
          .eq('id', principal.id);
      } else if (emailPrincipal) {
        await supabase
          .from('usuarios')
          .insert({
            nome_completo: nomeEstabelecimento,
            email: emailPrincipal,
            telefone,
            is_principal: true,
            estabelecimento_id: id,
            role: 'admin',
          });
      }
      Alert.alert('Sucesso', 'Dados salvos com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message ?? 'Tente novamente mais tarde.');
    }
    setSaving(false);
  };

  const alterarStatus = async (status: 'ativa' | 'suspensa' | 'banida') => {
    if (!estab) return;
    Alert.alert(
      `Confirmar ${status}`,
      `Deseja realmente alterar o status da conta para "${status}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: async () => {
            try {
              await supabase.from('estabelecimentos').update({ status }).eq('id', id);
              setEstab({ ...estab, status });
              Alert.alert('Sucesso', 'Status atualizado com sucesso.');
            } catch (e: any) {
              Alert.alert('Erro', e.message ?? 'Não foi possível atualizar o status.');
            }
          }
        }
      ]
    );
  };

  // Helper para cor por status
  const statusColor = (s?: string) => {
    switch (s) {
      case 'ativa':
        return '#22c55e';
      case 'suspensa':
        return '#f59e0b';
      case 'banida':
        return '#ef4444';
      default:
        return '#9CA3AF';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Conta</Text>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{nomeEstabelecimento}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor(estab?.status) }]} />
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => setTab('info')} style={[styles.tabBtn, tab === 'info' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>Informações</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('users')} style={[styles.tabBtn, tab === 'users' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Usuários ({usuarios.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === 'info' ? (
          <>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total de Usuários</Text>
                <Text style={styles.metricValue}>{usuarios.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Criado em</Text>
                <Text style={styles.metricValue}>{estab?.created_at ? format(new Date(estab.created_at), 'dd/MM/yyyy') : '-'}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Dados da Conta</Text>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>E-mail Principal</Text>
                <TextInput style={styles.input} value={emailPrincipal} onChangeText={setEmailPrincipal} placeholderTextColor="#9CA3AF" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Telefone</Text>
                <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="(99) 99999-9999" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Nome do Estabelecimento</Text>
                <TextInput style={styles.input} value={nomeEstabelecimento} onChangeText={setNomeEstabelecimento} placeholderTextColor="#9CA3AF" />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Segmento</Text>
                <Dropdown
                  style={styles.input}
                  data={segmentos}
                  labelField="label"
                  valueField="value"
                  value={segmento}
                  onChange={item => setSegmento(item.value)}
                  placeholder="Selecione o segmento"
                  placeholderStyle={{ color: '#9CA3AF' }}
                  selectedTextStyle={{ color: '#fff' }}
                  itemTextStyle={{ color: '#111827' }}
                  containerStyle={{ backgroundColor: '#fff' }}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Tipo de Documento</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={[styles.pickerOption, tipoDocumento === 'CPF' && styles.pickerOptionActive]}
                    onPress={() => setTipoDocumento('CPF')}
                  >
                    <Text style={[styles.pickerText, tipoDocumento === 'CPF' && styles.pickerTextActive]}>CPF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.pickerOption, tipoDocumento === 'CNPJ' && styles.pickerOptionActive]}
                    onPress={() => setTipoDocumento('CNPJ')}
                  >
                    <Text style={[styles.pickerText, tipoDocumento === 'CNPJ' && styles.pickerTextActive]}>CNPJ</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>{tipoDocumento}</Text>
                <TextInput style={styles.input} value={numeroDocumento} onChangeText={setNumeroDocumento} placeholderTextColor="#9CA3AF" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={salvarAlteracoes} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#6366f1', marginTop: 8 }]} onPress={() => {
                if (!emailPrincipal) return Alert.alert('Erro', 'E-mail do usuário principal não encontrado.');
                supabase.auth.resetPasswordForEmail(emailPrincipal)
                  .then(({ error }) => {
                    if (error) Alert.alert('Erro', 'Não foi possível enviar o e-mail de redefinição.');
                    else Alert.alert('Sucesso', 'E-mail de redefinição enviado!');
                  });
              }}>
                <Text style={[styles.saveBtnText, { color: '#fff' }]}>Redefinir senha do usuário principal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#ef4444' }]} onPress={() => Alert.alert('Excluir', 'Funcionalidade em desenvolvimento')}>
                <FontAwesome5 name="trash" size={14} color="#111827" />
                <Text style={styles.adminBtnText}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#f59e0b' }]} onPress={() => alterarStatus('suspensa')}>
                <FontAwesome5 name="pause" size={14} color="#111827" />
                <Text style={styles.adminBtnText}>Suspender</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#22c55e' }]} onPress={() => alterarStatus('ativa')}>
                <FontAwesome5 name="check" size={14} color="#111827" />
                <Text style={styles.adminBtnText}>Ativar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.sectionCard}>
            {usuarios.map(u => (
              <View key={u.id} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.nome_completo ?? '—'}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                {u.is_principal && <Text style={styles.principalTag}>Principal</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  headerBar: {
    height: 60,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    elevation: 1,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    padding: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickerOptionActive: {
    backgroundColor: '#6366f1',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  adminBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  principalTag: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});