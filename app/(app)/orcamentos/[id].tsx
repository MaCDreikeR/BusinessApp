import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../../contexts/ThemeContext';
import { logger } from '../../../utils/logger';
import { theme } from '@utils/theme';
import { 
  Orcamento, 
  carregarOrcamentoPorId,
  carregarItensOrcamento,
  excluirOrcamento,
  atualizarOrcamento,
  formatarData, 
  formatarValor, 
  getStatusColor, 
  getStatusText 
} from './utils';

type ItemOrcamento = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  tipo: 'produto' | 'servico' | 'pacote';
};

export default function DetalhesOrcamentoScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      setLoading(true);
      logger.debug('Carregando orçamento:', id);
      const o = await carregarOrcamentoPorId(id as string);
      logger.debug('Orçamento carregado:', o);
      // Normaliza para o tipo Orcamento esperado, preenchendo campos ausentes
      setOrcamento({
        id: o.id,
        cliente: o.cliente,
        cliente_id: o.cliente_id,
        data: new Date(o.data),
        valor_total: Number(o.valor_total) || 0,
        forma_pagamento: o.forma_pagamento ?? 'dinheiro',
        parcelas: Number(o.parcelas) || 1,
        desconto: Number(o.desconto) || 0,
        status: (o.status as any) ?? 'pendente',
        observacoes: o.observacoes ?? '',
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      logger.debug('Carregando itens do orçamento');
      const itensData = await carregarItensOrcamento(id as string);
      logger.debug('Itens carregados:', itensData);
      setItens(itensData || []);
    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do orçamento');
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluir() {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este orçamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await excluirOrcamento(id as string);
              router.replace('/(app)/orcamentos');
            } catch (error) {
              logger.error('Erro ao excluir orçamento:', error);
              Alert.alert('Erro', 'Não foi possível excluir o orçamento');
            }
          }
        }
      ]
    );
  }

  async function handleImprimir() {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 40px; 
                color: #111827;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #E5E7EB;
                padding-bottom: 20px;
              }
              .title { 
                font-size: 24px; 
                font-weight: bold; 
                margin-bottom: 10px; 
                color: colors.primary;
              }
              .info { 
                margin-bottom: 20px;
                background-color: #F9FAFB;
                padding: 15px;
                border-radius: 8px;
              }
              .info-row { 
                margin: 8px 0;
                display: flex;
                align-items: center;
              }
              .label { 
                font-weight: bold;
                min-width: 150px;
                color: #4B5563;
              }
              .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                background-color: white;
              }
              .items-table th, .items-table td { 
                border: 1px solid #E5E7EB; 
                padding: 12px; 
                text-align: left; 
              }
              .items-table th { 
                background-color: #F3F4F6;
                color: #4B5563;
                font-weight: 600;
              }
              .items-table tr:nth-child(even) {
                background-color: #F9FAFB;
              }
              .total { 
                text-align: right; 
                margin-top: 20px; 
                font-size: 18px;
                font-weight: bold;
                color: colors.primary;
                padding: 15px;
                background-color: #F9FAFB;
                border-radius: 8px;
              }
              .footer { 
                margin-top: 50px; 
                text-align: center;
                padding-top: 30px;
                border-top: 1px solid #E5E7EB;
              }
              .signature-line {
                width: 250px;
                margin: 0 auto;
                border-top: 1px solid #9CA3AF;
                margin-bottom: 10px;
              }
              .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 16px;
                color: white;
                font-weight: 500;
                background-color: ${getStatusColor(orcamento?.status || 'pendente')};
              }
              .observacoes {
                margin-top: 30px;
                padding: 15px;
                background-color: #F9FAFB;
                border-radius: 8px;
              }
              .observacoes-title {
                font-weight: bold;
                color: #4B5563;
                margin-bottom: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Orçamento</div>
              <div>Data: ${formatarData(new Date(orcamento?.data || ''))}</div>
            </div>

            <div class="info">
              <div class="info-row">
                <span class="label">Cliente:</span> 
                <span>${orcamento?.cliente}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span> 
                <span class="status-badge">${getStatusText(orcamento?.status || 'pendente')}</span>
              </div>
              <div class="info-row">
                <span class="label">Forma de Pagamento:</span> 
                <span>${
                  (orcamento?.forma_pagamento ?? '').charAt(0).toUpperCase() + 
                  (orcamento?.forma_pagamento ?? '').slice(1)
                }${(orcamento?.parcelas ?? 1) > 1 ? ` - ${orcamento?.parcelas}x` : ''}</span>
              </div>
              ${orcamento?.desconto ? `
                <div class="info-row">
                  <span class="label">Desconto:</span>
                  <span>${orcamento.desconto}%</span>
                </div>
              ` : ''}
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Valor Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(item => `
                  <tr>
                    <td>${item.descricao}</td>
                    <td>${item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</td>
                    <td>${item.quantidade}</td>
                    <td>${formatarValor(item.valor_unitario)}</td>
                    <td>${formatarValor(item.quantidade * item.valor_unitario)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total">
              Valor Total: ${formatarValor(orcamento?.valor_total || 0)}
            </div>

            ${orcamento?.observacoes ? `
              <div class="observacoes">
                <div class="observacoes-title">Observações:</div>
                <div>${orcamento.observacoes}</div>
              </div>
            ` : ''}

            <div class="footer">
              <div class="signature-line"></div>
              <div>Assinatura do Cliente</div>
            </div>
          </body>
        </html>
      `;

      // Gera o PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Compartilha o PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Orçamento',
        UTI: 'com.adobe.pdf' // para iOS
      });
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF do orçamento');
    }
  }

  async function handleAlterarStatus(novoStatus: 'aprovado' | 'rejeitado' | 'pendente') {
    try {
      await atualizarOrcamento(id as string, { status: novoStatus });
      // Atualiza o estado local
      setOrcamento(prev => prev ? { ...prev, status: novoStatus } : null);
      Alert.alert('Sucesso', `Status alterado para ${getStatusText(novoStatus)}`);
    } catch (error) {
      logger.error('Erro ao alterar status:', error);
      Alert.alert('Erro', 'Não foi possível alterar o status do orçamento');
    }
  }

  const StatusModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={statusModalVisible}
      onRequestClose={() => setStatusModalVisible(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Alterar Status</Text>
          
          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#059669' }]}
            onPress={() => {
              handleAlterarStatus('aprovado');
              setStatusModalVisible(false);
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.white} />
            <Text style={styles.statusButtonText}>Aprovar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#DC2626' }]}
            onPress={() => {
              handleAlterarStatus('rejeitado');
              setStatusModalVisible(false);
            }}
          >
            <Ionicons name="close-circle" size={24} color={colors.white} />
            <Text style={styles.statusButtonText}>Rejeitar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#D97706' }]}
            onPress={() => {
              handleAlterarStatus('pendente');
              setStatusModalVisible(false);
            }}
          >
            <Ionicons name="time" size={24} color={colors.white} />
            <Text style={styles.statusButtonText}>Pendente</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#E5E7EB' }]}
            onPress={() => setStatusModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#4B5563" />
            <Text style={[styles.statusButtonText, { color: '#4B5563' }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!orcamento) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Orçamento não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(app)/orcamentos')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.clienteContainer}>
            <Text style={styles.cliente}>{orcamento?.cliente}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orcamento?.status || 'pendente') }]}>
              <Text style={styles.statusText}>{getStatusText(orcamento?.status || 'pendente')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleImprimir}
          >
            <Ionicons name="print-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleExcluir}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>{formatarData(new Date(orcamento.data))}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <Text style={styles.valor}>{formatarValor(orcamento.valor_total)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            {orcamento.forma_pagamento.charAt(0).toUpperCase() + orcamento.forma_pagamento.slice(1)}
            {orcamento.parcelas > 1 ? ` - ${orcamento.parcelas}x` : ''}
          </Text>
        </View>

        {orcamento.desconto > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Desconto: {orcamento.desconto}%</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itens do Orçamento</Text>
        {itens.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum item adicionado</Text>
        ) : (
          itens.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTipo}>
                  <Ionicons 
                    name={
                      item.tipo === 'produto' ? 'cube-outline' : 
                      item.tipo === 'servico' ? 'construct-outline' : 
                      'layers-outline'
                    } 
                    size={16} 
                    color={colors.primary} 
                  />
                  {' '}
                  {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                </Text>
              </View>
              <Text style={styles.itemDescricao}>{item.descricao}</Text>
              <View style={styles.itemDetails}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemQuantidade}>Qtd: {item.quantidade}</Text>
                  <Text style={styles.itemValorUnitario}>
                    Valor un.: {formatarValor(item.valor_unitario)}
                  </Text>
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalValor}>
                    {formatarValor(item.quantidade * item.valor_unitario)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {orcamento.observacoes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.observacoesText}>{orcamento.observacoes}</Text>
        </View>
      )}

      <StatusModal />
    </ScrollView>
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
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  clienteContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cliente: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  card: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  valor: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  itemCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  itemDescricao: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemInfo: {
    gap: 4,
  },
  itemQuantidade: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemValorUnitario: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalValor: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  observacoesText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});