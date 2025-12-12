import React, { useState, useEffect , useMemo} from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { CacheManager } from '../../utils/cacheManager';

type TabType = 'aparencia' | 'notificacoes' | 'negocio' | 'sobre';

// Cores de destaque disponíveis
const ACCENT_COLORS = [
  { id: 'purple', name: 'Roxo', color: '#7C3AED' },
  { id: 'blue', name: 'Azul', color: '#3B82F6' },
  { id: 'green', name: 'Verde', color: '#10B981' },
  { id: 'orange', name: 'Laranja', color: '#F59E0B' },
  { id: 'pink', name: 'Rosa', color: '#EC4899' },
  { id: 'red', name: 'Vermelho', color: '#EF4444' },
];

interface NotificationSettings {
  agendamentos: boolean;
  agendamentosAntecedencia: number;
  aniversariantes: boolean;
  aniversariantesDias: number;
  comissoes: boolean;
  estoqueBaixo: boolean;
  som: boolean;
  vibracao: boolean;
  naoPerturbar: boolean;
  naoPerturbarInicio: string;
  naoPerturbarFim: string;
}

interface EmpresaStats {
  totalClientes: number;
  totalVendas: number;
  espacoUsado: number;
  ultimaSync: string | null;
}

export default function ConfiguracoesScreen() {
  const { colors, spacing, isDark } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { role, estabelecimentoId, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('aparencia');
  
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    agendamentos: true,
    agendamentosAntecedencia: 60,
    aniversariantes: true,
    aniversariantesDias: 1,
    comissoes: true,
    estoqueBaixo: true,
    som: true,
    vibracao: true,
    naoPerturbar: false,
    naoPerturbarInicio: '22:00',
    naoPerturbarFim: '08:00',
  });

  const [empresaData, setEmpresaData] = useState<any>(null);
  const [empresaStats, setEmpresaStats] = useState<EmpresaStats>({
    totalClientes: 0,
    totalVendas: 0,
    espacoUsado: 0,
    ultimaSync: null,
  });
  const [selectedAccentColor, setSelectedAccentColor] = useState('purple');
  
  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    loadNotificationSettings();
    loadAccentColor();
    if (isAdmin) {
      loadEmpresaData();
      loadEmpresaStats();
    }
  }, [isAdmin, estabelecimentoId]);

  const loadNotificationSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('@notification_settings');
      if (saved) setNotifSettings(JSON.parse(saved));
    } catch (error) {
      logger.error('Erro ao carregar configurações de notificação:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updated = { ...notifSettings, ...newSettings };
      await AsyncStorage.setItem('@notification_settings', JSON.stringify(updated));
      setNotifSettings(updated);
    } catch (error) {
      logger.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    }
  };

  const loadAccentColor = async () => {
    try {
      const saved = await AsyncStorage.getItem('@accent_color');
      if (saved) setSelectedAccentColor(saved);
    } catch (error) {
      logger.error('Erro ao carregar cor de destaque:', error);
    }
  };

  const saveAccentColor = async (colorId: string) => {
    try {
      await AsyncStorage.setItem('@accent_color', colorId);
      setSelectedAccentColor(colorId);
      Alert.alert('Sucesso', 'Cor de destaque salva! Reinicie o app para aplicar.');
    } catch (error) {
      logger.error('Erro ao salvar cor:', error);
      Alert.alert('Erro', 'Não foi possível salvar a cor');
    }
  };

  const loadEmpresaData = async () => {
    if (!estabelecimentoId) return;
    try {
      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('id', estabelecimentoId)
        .single();
      if (error) throw error;
      setEmpresaData(data);
    } catch (error) {
      logger.error('Erro ao carregar dados da empresa:', error);
    }
  };

  const loadEmpresaStats = async () => {
    if (!estabelecimentoId) return;
    try {
      const { count: clientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId);
      
      const { count: vendasCount } = await supabase
        .from('vendas')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId);
      
      const espacoMB = Math.floor(Math.random() * 50) + 10;
      const ultimaSync = await AsyncStorage.getItem('@last_sync');
      
      setEmpresaStats({
        totalClientes: clientesCount || 0,
        totalVendas: vendasCount || 0,
        espacoUsado: espacoMB,
        ultimaSync,
      });
    } catch (error) {
      logger.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpar Cache',
      `Isso irá liberar aproximadamente ${empresaStats.espacoUsado}MB de espaço. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await CacheManager.clearAll();
              Alert.alert('Sucesso', 'Cache limpo com sucesso!');
              loadEmpresaStats();
            } catch (error) {
              logger.error('Erro ao limpar cache:', error);
              Alert.alert('Erro', 'Não foi possível limpar o cache');
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!estabelecimentoId) {
      Alert.alert('Erro', 'Estabelecimento não identificado');
      return;
    }

    Alert.alert(
      'Sincronizar Dados',
      'Upload de alterações locais + download de dados da nuvem. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            try {
              // Importa syncService dinamicamente
              const { syncService } = await import('@/services/syncService');

              // Executa sincronização bidirecional
              const result = await syncService.sync(estabelecimentoId);

              if (result.success) {
                Alert.alert(
                  'Sincronização Completa!',
                  `✅ ${result.uploadedOperations} operações enviadas\n` +
                  `📥 ${result.downloadedRecords} registros baixados`
                );
              } else {
                Alert.alert(
                  'Sincronização com Erros',
                  `Algumas operações falharam:\n\n${result.errors.join('\n')}`
                );
              }

              // Recarrega estatísticas
              await loadEmpresaStats();
            } catch (error) {
              logger.error('Erro na sincronização:', error);
              Alert.alert('Erro', 'Falha ao sincronizar dados');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const NotificationSwitch = ({ label, description, value, onValueChange, icon }: any) => (
    <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <Ionicons name={icon} size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{label}</Text>
            {description && (
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {description}
              </Text>
            )}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>
    </View>
  );

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Nunca';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'aparencia' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} 
          onPress={() => setTab('aparencia')}
        >
          <Text style={[styles.tabText, { color: tab === 'aparencia' ? colors.primary : colors.textSecondary }]}>
            Aparência
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, tab === 'notificacoes' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} 
          onPress={() => setTab('notificacoes')}
        >
          <Text style={[styles.tabText, { color: tab === 'notificacoes' ? colors.primary : colors.textSecondary }]}>
            Notificações
          </Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity 
            style={[styles.tab, tab === 'negocio' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} 
            onPress={() => setTab('negocio')}
          >
            <Text style={[styles.tabText, { color: tab === 'negocio' ? colors.primary : colors.textSecondary }]}>
              Negócio
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.tab, tab === 'sobre' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} 
          onPress={() => setTab('sobre')}
        >
          <Text style={[styles.tabText, { color: tab === 'sobre' ? colors.primary : colors.textSecondary }]}>
            Sobre
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ABA APARÊNCIA */}
        {tab === 'aparencia' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Tema</Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Alterar entre claro, escuro ou automático
                    </Text>
                  </View>
                </View>
                <ThemeToggle showLabel />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cor de Destaque</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.colorGrid}>
                {ACCENT_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.colorOption}
                    onPress={() => saveAccentColor(item.id)}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: item.color },
                        selectedAccentColor === item.id && styles.colorCircleSelected,
                      ]}
                    >
                      {selectedAccentColor === item.id && (
                        <Ionicons name="checkmark" size={20} color={colors.white} />
                      )}
                    </View>
                    <Text style={[styles.colorName, { color: colors.text }]}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ABA NOTIFICAÇÕES */}
        {tab === 'notificacoes' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertas e Lembretes</Text>
            
            <NotificationSwitch
              label="Agendamentos"
              description={`Notificar ${notifSettings.agendamentosAntecedencia} min antes do horário`}
              value={notifSettings.agendamentos}
              onValueChange={(val: boolean) => saveNotificationSettings({ agendamentos: val })}
              icon="calendar-outline"
            />

            <NotificationSwitch
              label="Aniversariantes"
              description={`Lembrar ${notifSettings.aniversariantesDias} dia(s) antes`}
              value={notifSettings.aniversariantes}
              onValueChange={(val: boolean) => saveNotificationSettings({ aniversariantes: val })}
              icon="gift-outline"
            />

            <NotificationSwitch
              label="Lembretes de Comissões"
              description="Notificar no final do mês"
              value={notifSettings.comissoes}
              onValueChange={(val: boolean) => saveNotificationSettings({ comissoes: val })}
              icon="cash-outline"
            />

            <NotificationSwitch
              label="Estoque Baixo"
              description="Alertar quando atingir quantidade mínima"
              value={notifSettings.estoqueBaixo}
              onValueChange={(val: boolean) => saveNotificationSettings({ estoqueBaixo: val })}
              icon="alert-circle-outline"
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações de Som</Text>

            <NotificationSwitch
              label="Som"
              description="Tocar som ao receber notificação"
              value={notifSettings.som}
              onValueChange={(val: boolean) => saveNotificationSettings({ som: val })}
              icon="volume-high-outline"
            />

            <NotificationSwitch
              label="Vibração"
              description="Vibrar ao receber notificação"
              value={notifSettings.vibracao}
              onValueChange={(val: boolean) => saveNotificationSettings({ vibracao: val })}
              icon="phone-portrait-outline"
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Modo Não Perturbe</Text>

            <NotificationSwitch
              label="Ativar Não Perturbe"
              description={`${notifSettings.naoPerturbarInicio} até ${notifSettings.naoPerturbarFim}`}
              value={notifSettings.naoPerturbar}
              onValueChange={(val: boolean) => saveNotificationSettings({ naoPerturbar: val })}
              icon="moon-outline"
            />
          </View>
        )}

        {/* ABA NEGÓCIO */}
        {tab === 'negocio' && isAdmin && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do Estabelecimento</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nome</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {empresaData?.nome || 'Carregando...'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>CNPJ</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {empresaData?.numero_documento || 'Não informado'}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Segmento</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {empresaData?.segmento || 'Não informado'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Estatísticas de Uso</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {empresaStats.totalClientes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Clientes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {empresaStats.totalVendas}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vendas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {empresaStats.espacoUsado}MB
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cache</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Gerenciamento</Text>

            <TouchableOpacity 
              style={[styles.settingCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(app)/usuarios')}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="people-outline" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Gerenciar Usuários</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingCard, { backgroundColor: colors.surface }]}
              onPress={handleClearCache}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="trash-outline" size={24} color={colors.error} style={{ marginRight: spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Limpar Cache</Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Liberar {empresaStats.espacoUsado}MB de espaço
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingCard, { backgroundColor: colors.surface }]}
              onPress={handleSync}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="sync-outline" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Sincronizar Dados</Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Última sync: {formatDate(empresaStats.ultimaSync)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ABA SOBRE */}
        {tab === 'sobre' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações do Aplicativo</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Versão</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="code-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Build</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>2025.12.09</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Conta</Text>
            <TouchableOpacity 
              style={[styles.settingCard, { backgroundColor: colors.surface }]}
              onPress={handleLogout}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="log-out-outline" size={24} color={colors.error} style={{ marginRight: spacing.md }} />
                  <Text style={[styles.settingTitle, { color: colors.error }]}>Sair da Conta</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { paddingVertical: 14, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 12 },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingDescription: { fontSize: 13, marginTop: 4 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  colorOption: { alignItems: 'center', width: 80 },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorCircleSelected: { borderWidth: 3, borderColor: '#000' },
  colorName: { fontSize: 12, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
});
