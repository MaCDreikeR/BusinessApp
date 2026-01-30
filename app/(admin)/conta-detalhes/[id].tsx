import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput, Button, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Dropdown } from 'react-native-element-dropdown';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../../contexts/AuthContext';
import { getStartOfDayLocal, getEndOfDayLocal, addMinutesLocal } from '../../../lib/timezone';

interface ContaMetrics {
  totalUsuarios: number;
  totalClientes: number;
  totalAgendamentos: number;
  totalComandas: number;
  totalProdutos: number;
  totalServicos: number;
  totalPacotes: number;
  totalOrcamentos: number;
  totalFornecedores: number;
  receitaTotal: number;
  receitaMesAtual: number;
  comandasAbertas: number;
  agendamentosHoje: number;
  ultimoAcesso: string | null;
  usuariosOnline: number;
  usuariosOnlineDetalhes: { id: string; nome_completo: string; email: string; last_sign_in_at: string }[];
  dispositivos: { dispositivo: string; ultimo_acesso: string }[];
}

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
  const [tab, setTab] = useState<'info' | 'metrics' | 'atividades' | 'users'>('info');
  const [estab, setEstab] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<ContaMetrics | null>(null);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [segmento, setSegmento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetails = async () => {
    try {
      // Buscar estabelecimento e usuários
      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('*, usuarios:usuarios(*)')
        .eq('id', id)
        .single();
        
        if (est) {
          setEstab(est);
          setUsuarios(est.usuarios || []);
          setNomeEstabelecimento(est.nome || '');
          setSegmento(est.segmento || '');
          setTipoDocumento(est.tipo_documento || 'CNPJ');
          setNumeroDocumento(est.numero_documento || '');
          // Buscar usuário principal
          const principal = (est.usuarios || []).find((u: any) => u.is_principal);
          setEmailPrincipal(principal?.email || '');
          setTelefone(principal?.telefone || '');

          // Buscar métricas em paralelo
          const [
            { count: totalUsuarios },
            { count: totalClientes },
            { count: totalAgendamentos },
            { count: totalComandas },
            { count: totalProdutos },
            { count: totalServicos },
            { count: totalPacotes },
            { count: totalOrcamentos },
            { count: totalFornecedores },
            { data: comandasFinalizadas },
            { data: comandasMesAtual },
            { count: comandasAbertas },
            { count: agendamentosHoje },
            { data: ultimosUsuarios },
          ] = await Promise.all([
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('comandas').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('servicos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('pacotes').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('orcamentos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('fornecedores').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id),
            supabase.from('comandas').select('valor_total').eq('estabelecimento_id', id).eq('status', 'fechada'),
            supabase.from('comandas').select('valor_total').eq('estabelecimento_id', id).eq('status', 'fechada')
              .gte('data_fechamento', (() => {
                const primeiroDia = new Date();
                primeiroDia.setDate(1);
                return getStartOfDayLocal(primeiroDia);
              })()),
            supabase.from('comandas').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id).eq('status', 'aberta'),
            supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', id)
              .gte('data_hora', getStartOfDayLocal())
              .lte('data_hora', getEndOfDayLocal()),
            supabase.from('usuarios').select('last_activity_at, dispositivo').eq('estabelecimento_id', id).order('last_activity_at', { ascending: false }).limit(1),
          ]);

          const receitaTotal = comandasFinalizadas?.reduce((acc, c) => acc + (c.valor_total || 0), 0) || 0;
          const receitaMesAtual = comandasMesAtual?.reduce((acc, c) => acc + (c.valor_total || 0), 0) || 0;
          const ultimoAcesso = ultimosUsuarios && ultimosUsuarios.length > 0 ? ultimosUsuarios[0].last_activity_at : null;

          // Buscar usuários online (últimos 3 minutos - heartbeat atualiza a cada 1min)
          // Se não atualizou nos últimos 3min, provavelmente desconectou
          const tresMinutosAtras = addMinutesLocal(new Date(), -3);
          const { data: usuariosAtivos } = await supabase
            .from('usuarios')
            .select('id, nome_completo, email, last_activity_at, dispositivo')
            .eq('estabelecimento_id', id)
            .not('last_activity_at', 'is', null)
            .gte('last_activity_at', tresMinutosAtras)
            .order('last_activity_at', { ascending: false });

          const usuariosOnline = usuariosAtivos?.length || 0;
          const usuariosOnlineDetalhes = usuariosAtivos?.map(u => ({
            ...u,
            last_sign_in_at: u.last_activity_at // Compatibilidade com o tipo existente
          })) || [];

          // Debug: Logar informações sobre usuários online
          console.log('🔍 Debug Usuários Online:', {
            totalAtivos: usuariosOnline,
            tresMinutosAtras,
            agora: new Date().toISOString(),
            agoraLocal: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            usuarios: usuariosAtivos?.map(u => ({
              nome: u.nome_completo || u.email,
              lastActivity: u.last_activity_at,
              lastActivityLocal: new Date(u.last_activity_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              minutosAtras: Math.round((Date.now() - new Date(u.last_activity_at).getTime()) / 60000),
              dispositivo: u.dispositivo
            }))
          });
          
          // Buscar dispositivos únicos dos últimos 30 dias
          const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: dispositivosData } = await supabase
            .from('usuarios')
            .select('dispositivo, last_activity_at')
            .eq('estabelecimento_id', id)
            .gte('last_activity_at', trintaDiasAtras)
            .not('dispositivo', 'is', null)
            .order('last_activity_at', { ascending: false });

          // Agrupar dispositivos únicos
          const dispositivosUnicos = new Map<string, string>();
          dispositivosData?.forEach(d => {
            if (d.dispositivo && !dispositivosUnicos.has(d.dispositivo)) {
              dispositivosUnicos.set(d.dispositivo, d.last_activity_at);
            }
          });

          const dispositivos = Array.from(dispositivosUnicos.entries()).map(([dispositivo, ultimo_acesso]) => ({
            dispositivo,
            ultimo_acesso
          }));

          setMetrics({
            totalUsuarios: totalUsuarios || 0,
            totalClientes: totalClientes || 0,
            totalAgendamentos: totalAgendamentos || 0,
            totalComandas: totalComandas || 0,
            totalProdutos: totalProdutos || 0,
            totalServicos: totalServicos || 0,
            totalPacotes: totalPacotes || 0,
            totalOrcamentos: totalOrcamentos || 0,
            totalFornecedores: totalFornecedores || 0,
            receitaTotal,
            receitaMesAtual,
            comandasAbertas: comandasAbertas || 0,
            agendamentosHoje: agendamentosHoje || 0,
            ultimoAcesso,
            usuariosOnline,
            usuariosOnlineDetalhes,
            dispositivos,
          });
        }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDetails();
      setLoading(false);
    };
    loadData();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Forçar atualização do last_activity_at dos usuários desta conta antes de buscar
    try {
      await supabase.rpc('update_user_activity', { 
        p_estabelecimento_id: id 
      }).then(() => {
        console.log('✅ Atividade dos usuários atualizada via RPC');
      });
    } catch (error) {
      console.log('⚠️ RPC não disponível, continuando...');
    }
    
    await fetchDetails();
    setRefreshing(false);
  };

  const salvarAlteracoes = async () => {
    setSaving(true);
    try {
      // Atualizar estabelecimento
      await supabase
        .from('estabelecimentos')
        .update({
          nome: nomeEstabelecimento,
          segmento,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
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

  const excluirConta = async () => {
    if (!estab) return;
    
    Alert.alert(
      '⚠️ ATENÇÃO: Excluir Conta',
      `Esta ação é IRREVERSÍVEL!\n\nTodos os dados da conta "${nomeEstabelecimento}" serão permanentemente deletados:\n\n• ${usuarios.length} usuário(s)\n• Agendamentos\n• Clientes\n• Vendas\n• Produtos\n• E todos os outros dados\n\nDeseja realmente excluir esta conta?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'EXCLUIR PERMANENTEMENTE', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete do estabelecimento (cascade deve deletar os usuários e dados relacionados)
              const { error } = await supabase
                .from('estabelecimentos')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert(
                'Conta Excluída',
                'A conta foi excluída permanentemente com sucesso.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(admin)/users')
                  }
                ]
              );
            } catch (e: any) {
              setLoading(false);
              Alert.alert('Erro ao excluir', e.message ?? 'Não foi possível excluir a conta. Tente novamente.');
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={{ color: '#9ca3af', marginTop: 12 }}>Carregando detalhes...</Text>
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

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#a78bfa"
            colors={["#a78bfa"]}
          />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{nomeEstabelecimento}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor(estab?.status) }]} />
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => setTab('info')} style={[styles.tabBtn, tab === 'info' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>Info</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('metrics')} style={[styles.tabBtn, tab === 'metrics' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'metrics' && styles.tabTextActive]}>Métricas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('atividades')} style={[styles.tabBtn, tab === 'atividades' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'atividades' && styles.tabTextActive]}>Atividades</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('users')} style={[styles.tabBtn, tab === 'users' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Usuários ({usuarios.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === 'metrics' ? (
          metrics ? (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📊 Usuários & Clientes</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="users" size={20} color="#60a5fa" />
                    <Text style={styles.metricValue}>{metrics.totalUsuarios}</Text>
                    <Text style={styles.metricLabel}>Usuários</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="user-friends" size={20} color="#34d399" />
                    <Text style={styles.metricValue}>{metrics.totalClientes}</Text>
                    <Text style={styles.metricLabel}>Clientes</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📦 Catálogo</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="box" size={20} color="#fbbf24" />
                    <Text style={styles.metricValue}>{metrics.totalProdutos}</Text>
                    <Text style={styles.metricLabel}>Produtos</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="concierge-bell" size={20} color="#f472b6" />
                    <Text style={styles.metricValue}>{metrics.totalServicos}</Text>
                    <Text style={styles.metricLabel}>Serviços</Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="shopping-bag" size={20} color="#a78bfa" />
                    <Text style={styles.metricValue}>{metrics.totalPacotes}</Text>
                    <Text style={styles.metricLabel}>Pacotes</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="truck" size={20} color="#fb923c" />
                    <Text style={styles.metricValue}>{metrics.totalFornecedores}</Text>
                    <Text style={styles.metricLabel}>Fornecedores</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📅 Operações</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="calendar-alt" size={20} color="#8b5cf6" />
                    <Text style={styles.metricValue}>{metrics.totalAgendamentos}</Text>
                    <Text style={styles.metricLabel}>Agendamentos</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="receipt" size={20} color="#ec4899" />
                    <Text style={styles.metricValue}>{metrics.totalComandas}</Text>
                    <Text style={styles.metricLabel}>Comandas</Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="file-invoice" size={20} color="#06b6d4" />
                    <Text style={styles.metricValue}>{metrics.totalOrcamentos}</Text>
                    <Text style={styles.metricLabel}>Orçamentos</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="calendar-check" size={20} color="#10b981" />
                    <Text style={styles.metricValue}>{metrics.agendamentosHoje}</Text>
                    <Text style={styles.metricLabel}>Hoje</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>💰 Financeiro</Text>
                <View style={styles.financialCard}>
                  <FontAwesome5 name="money-bill-wave" size={24} color="#10b981" />
                  <Text style={styles.financialValue}>R$ {metrics.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.financialLabel}>Receita Total</Text>
                </View>
                <View style={styles.financialCard}>
                  <FontAwesome5 name="chart-line" size={24} color="#3b82f6" />
                  <Text style={styles.financialValue}>R$ {metrics.receitaMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.financialLabel}>Mês Atual ({format(new Date(), 'MMMM/yyyy', { locale: ptBR })})</Text>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <FontAwesome5 name="folder-open" size={20} color="#f59e0b" />
                    <Text style={styles.metricValue}>{metrics.comandasAbertas}</Text>
                    <Text style={styles.metricLabel}>Comandas Abertas</Text>
                  </View>
                </View>
              </View>

              {metrics.ultimoAcesso && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>🕒 Último Acesso</Text>
                  <Text style={styles.lastAccessText}>
                    {format(new Date(metrics.ultimoAcesso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.metricLabel}>Carregando métricas...</Text>
            </View>
          )
        ) : tab === 'info' ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📋 Dados da Conta</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail Principal</Text>
                <Text style={styles.infoValue}>{emailPrincipal || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={styles.infoValue}>{telefone || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome do Estabelecimento</Text>
                <Text style={styles.infoValue}>{nomeEstabelecimento || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Segmento</Text>
                <Text style={styles.infoValue}>
                  {segmentos.find(s => s.value === segmento)?.label || segmento || '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tipo de Documento</Text>
                <Text style={styles.infoValue}>{tipoDocumento}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{tipoDocumento}</Text>
                <Text style={styles.infoValue}>{numeroDocumento || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(estab?.status), marginRight: 8 }]} />
                  <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
                    {estab?.status || '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Criado em</Text>
                <Text style={styles.infoValue}>
                  {estab?.created_at ? format(new Date(estab.created_at), "dd/MM/yyyy 'às' HH:mm") : '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total de Usuários</Text>
                <Text style={styles.infoValue}>{usuarios.length}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚙️ Ações Administrativas</Text>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#6366f1' }]} 
                onPress={() => {
                  if (!emailPrincipal) return Alert.alert('Erro', 'E-mail do usuário principal não encontrado.');
                  supabase.auth.resetPasswordForEmail(emailPrincipal)
                    .then(({ error }) => {
                      if (error) Alert.alert('Erro', 'Não foi possível enviar o e-mail de redefinição.');
                      else Alert.alert('Sucesso', 'E-mail de redefinição enviado!');
                    });
                }}
              >
                <FontAwesome5 name="key" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Redefinir senha do usuário principal</Text>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.adminBtn, { backgroundColor: '#22c55e', marginRight: 8 }]} 
                  onPress={() => alterarStatus('ativa')}
                >
                  <FontAwesome5 name="check" size={16} color="#fff" />
                  <Text style={[styles.adminBtnText, { color: '#fff' }]}>Ativar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.adminBtn, { backgroundColor: '#f59e0b', marginRight: 8 }]} 
                  onPress={() => alterarStatus('suspensa')}
                >
                  <FontAwesome5 name="pause" size={16} color="#fff" />
                  <Text style={[styles.adminBtnText, { color: '#fff' }]}>Suspender</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.adminBtn, { backgroundColor: '#ef4444' }]} 
                  onPress={excluirConta}
                >
                  <FontAwesome5 name="trash" size={16} color="#fff" />
                  <Text style={[styles.adminBtnText, { color: '#fff' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : tab === 'atividades' ? (
          metrics ? (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🕒 Último Acesso</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Data e Hora (horário local)</Text>
                  <Text style={styles.infoValue}>
                    {metrics.ultimoAcesso 
                      ? formatInTimeZone(
                          new Date(metrics.ultimoAcesso), 
                          'America/Sao_Paulo', 
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )
                      : 'Nunca acessou'}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🟢 Usuários Online Agora</Text>
                <Text style={styles.infoLabel}>Usuários ativos nos últimos 3 minutos (heartbeat a cada 1 min)</Text>

                <View style={styles.infoRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusDot, { 
                      backgroundColor: metrics.usuariosOnline > 0 ? '#22c55e' : '#6b7280',
                      marginRight: 8 
                    }]} />
                    <Text style={styles.infoValue}>
                      {metrics.usuariosOnline} {metrics.usuariosOnline === 1 ? 'usuário' : 'usuários'}
                    </Text>
                  </View>
                </View>

                {metrics.usuariosOnlineDetalhes && metrics.usuariosOnlineDetalhes.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    {metrics.usuariosOnlineDetalhes.map((user) => (
                      <View key={user.id} style={styles.onlineUserRow}>
                        <View style={[styles.statusDot, { backgroundColor: '#22c55e', marginRight: 10 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.onlineUserName}>{user.nome_completo || user.email}</Text>
                          <Text style={styles.onlineUserEmail}>{user.email}</Text>
                          <Text style={styles.onlineUserTime}>
                            Online há {Math.round((Date.now() - new Date(user.last_sign_in_at).getTime()) / 60000)} min
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {metrics.dispositivos && metrics.dispositivos.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>📱 Dispositivos (últimos 30 dias)</Text>
                  {metrics.dispositivos.map((disp, idx) => (
                    <View key={idx} style={styles.deviceRow}>
                      <FontAwesome5 
                        name={disp.dispositivo.toLowerCase().includes('iphone') || disp.dispositivo.toLowerCase().includes('ipad') 
                          ? 'apple' 
                          : disp.dispositivo.toLowerCase().includes('android') 
                          ? 'android' 
                          : 'mobile'} 
                        size={20} 
                        color="#a78bfa" 
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deviceName}>{disp.dispositivo}</Text>
                        <Text style={styles.deviceTime}>
                          Último acesso: {formatInTimeZone(
                            new Date(disp.ultimo_acesso), 
                            'America/Sao_Paulo', 
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.infoLabel}>Carregando atividades...</Text>
            </View>
          )
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
    backgroundColor: '#111827',
  },
  headerBar: {
    height: 60,
    backgroundColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    paddingBottom: 24,
    backgroundColor: '#111827',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
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
    borderBottomColor: '#374151',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#a78bfa',
  },
  tabText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  financialCard: {
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  financialValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 8,
  },
  financialLabel: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  lastAccessText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111827',
  },
  pickerContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  pickerOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickerOptionActive: {
    backgroundColor: '#a78bfa',
  },
  pickerText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  pickerTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#a78bfa',
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
    flexDirection: 'row',
  },
  adminBtnText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  infoLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 10,
  },
  onlineUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  onlineUserName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  onlineUserEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  onlineUserTime: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  deviceName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceTime: {
    fontSize: 13,
    color: '#9ca3af',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  userName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
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
    backgroundColor: '#111827',
  },
});