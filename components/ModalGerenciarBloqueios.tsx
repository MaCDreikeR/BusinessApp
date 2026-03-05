import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaskInput from 'react-native-mask-input';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { formatarDataInput } from '../utils/validators';

interface ModalGerenciarBloqueiosProps {
  visible: boolean;
  onClose: () => void;
  estabelecimentoId: string | null;
  colors: any;
  onSave?: () => void;
}

export const ModalGerenciarBloqueios: React.FC<ModalGerenciarBloqueiosProps> = ({
  visible,
  onClose,
  estabelecimentoId,
  colors,
  onSave
}) => {
  const [diasSemanaBloqueadosPendentes, setDiasSemanaBloqueadosPendentes] = useState<number[]>([]);
  const [datasBloqueadasPendentes, setDatasBloqueadasPendentes] = useState<string[]>([]);
  const [novaDataBloqueada, setNovaDataBloqueada] = useState('');

  // Carregar bloqueios ao abrir o modal
  useEffect(() => {
    if (visible && estabelecimentoId) {
      carregarBloqueios();
    }
  }, [visible, estabelecimentoId]);

  const carregarBloqueios = async () => {
    try {
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['dias_semana_bloqueados', 'datas_bloqueadas'])
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      data?.forEach((config) => {
        if (config.chave === 'dias_semana_bloqueados') {
          setDiasSemanaBloqueadosPendentes(JSON.parse(config.valor || '[]'));
        } else if (config.chave === 'datas_bloqueadas') {
          setDatasBloqueadasPendentes(JSON.parse(config.valor || '[]'));
        }
      });
    } catch (error) {
      logger.error('Erro ao carregar bloqueios:', error);
    }
  };

  const toggleDiaSemana = (diaSemana: number) => {
    setDiasSemanaBloqueadosPendentes(prev => 
      prev.includes(diaSemana)
        ? prev.filter(d => d !== diaSemana)
        : [...prev, diaSemana].sort()
    );
  };

  const removerDataBloqueada = (data: string) => {
    setDatasBloqueadasPendentes(prev => prev.filter(d => d !== data));
  };

  const validarData = (dataStr: string): boolean => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dataStr.match(regex);
    
    if (!match) return false;
    
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const ano = parseInt(match[3], 10);
    
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (ano < 2000 || ano > 2100) return false;
    
    const data = new Date(ano, mes - 1, dia);
    return data.getDate() === dia && data.getMonth() === mes - 1 && data.getFullYear() === ano;
  };

  const adicionarDataBloqueada = () => {
    if (!novaDataBloqueada.trim()) {
      Alert.alert('Aviso', 'Digite uma data válida (DD/MM/AAAA)');
      return;
    }

    if (!validarData(novaDataBloqueada)) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA');
      return;
    }

    if (datasBloqueadasPendentes.includes(novaDataBloqueada)) {
      Alert.alert('Aviso', 'Esta data já está bloqueada');
      return;
    }

    setDatasBloqueadasPendentes([...datasBloqueadasPendentes, novaDataBloqueada].sort());
    setNovaDataBloqueada('');
  };

  const salvarBloqueios = async () => {
    try {
      if (!estabelecimentoId) return;

      const diasUpdate = await supabase
        .from('configuracoes')
        .upsert(
          { 
            estabelecimento_id: estabelecimentoId, 
            chave: 'dias_semana_bloqueados', 
            valor: JSON.stringify(diasSemanaBloqueadosPendentes) 
          },
          { onConflict: 'estabelecimento_id,chave' }
        );

      if (diasUpdate.error) throw diasUpdate.error;

      const datasUpdate = await supabase
        .from('configuracoes')
        .upsert(
          { 
            estabelecimento_id: estabelecimentoId, 
            chave: 'datas_bloqueadas', 
            valor: JSON.stringify(datasBloqueadasPendentes) 
          },
          { onConflict: 'estabelecimento_id,chave' }
        );

      if (datasUpdate.error) throw datasUpdate.error;

      Alert.alert('Sucesso', 'Bloqueios atualizados com sucesso');
      
      if (onSave) onSave();
      onClose();
    } catch (error) {
      logger.error('Erro ao salvar bloqueios:', error);
      Alert.alert('Erro', 'Falha ao salvar bloqueios');
    }
  };

  const styles = StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      maxWidth: 500,
      width: '100%',
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    modalScrollView: {
      maxHeight: 450,
      paddingHorizontal: 24,
    },
    modalSubtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    diasSemanaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    diaSemanaItem: {
      flex: 1,
      minWidth: 45,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    diaSemanaSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    diaSemanaText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    diaSemanaTextSelected: {
      color: colors.white,
    },
    datasBloqueadasList: {
      marginBottom: 16,
    },
    dataBloqueadaItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },
    dataBloqueadaText: {
      fontSize: 16,
      color: colors.text,
    },
    removerDataButton: {
      padding: 4,
    },
    addDataContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    dataInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addDataButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nenhumaDataText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 12,
    },
    modalButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    botaoCancelar: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoCancelarText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    botaoSalvar: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoSalvarText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerenciar Bloqueios</Text>
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={true}
          >
            <View>
              <Text style={styles.modalSubtitle}>Dias da Semana Bloqueados</Text>
              <View style={styles.diasSemanaContainer}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.diaSemanaItem,
                      diasSemanaBloqueadosPendentes.includes(index) && styles.diaSemanaSelected
                    ]}
                    onPress={() => toggleDiaSemana(index)}
                  >
                    <Text style={[
                      styles.diaSemanaText,
                      diasSemanaBloqueadosPendentes.includes(index) && styles.diaSemanaTextSelected
                    ]}>
                      {dia}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.modalSubtitle}>Datas Específicas Bloqueadas</Text>
              
              {datasBloqueadasPendentes.length > 0 ? (
                <View style={styles.datasBloqueadasList}>
                  {datasBloqueadasPendentes.map((data) => (
                    <View key={data} style={styles.dataBloqueadaItem}>
                      <Text style={styles.dataBloqueadaText}>{data}</Text>
                      <TouchableOpacity
                        onPress={() => removerDataBloqueada(data)}
                        style={styles.removerDataButton}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.nenhumaDataText}>Nenhuma data bloqueada</Text>
              )}

              <View style={styles.addDataContainer}>
                <TextInput
                  style={styles.dataInput}
                  value={novaDataBloqueada}
                  onChangeText={(text) => setNovaDataBloqueada(formatarDataInput(text))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.addDataButton}
                  onPress={adicionarDataBloqueada}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity
              style={styles.botaoCancelar}
              onPress={onClose}
            >
              <Text style={styles.botaoCancelarText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoSalvar}
              onPress={salvarBloqueios}
            >
              <Ionicons name="checkmark" size={20} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.botaoSalvarText}>Salvar Bloqueios</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
