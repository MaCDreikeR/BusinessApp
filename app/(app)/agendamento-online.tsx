import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard, Linking, Share, Platform, DeviceEventEmitter, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Switch } from 'react-native';

export default function AgendamentoOnlineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { estabelecimentoId } = useAuth();
  
  const [agendamentoOnlineAtivo, setAgendamentoOnlineAtivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [antecedenciaMinima, setAntecedenciaMinima] = useState(2); // Em horas
  
  // Estado para o slug e URL base
  const [slug, setSlug] = useState<string>('');
  const [urlBase, setUrlBase] = useState<string>('https://businessapp-web.vercel.app');
  
  // Gerar o link de agendamento baseado no slug do estabelecimento e URL das configurações globais
  const linkAgendamento = slug 
    ? `${urlBase}/${slug}` 
    : 'Carregando...';
  
  useEffect(() => {
    carregarConfiguracao();
    carregarSlug();
    carregarUrlBase();
    carregarAntecedencia();
    
    // Escutar mudanças do toggle no header
    const subscription = DeviceEventEmitter.addListener(
      'agendamentoOnlineAtualizado',
      (novoValor: boolean) => {
        setAgendamentoOnlineAtivo(novoValor);
      }
    );
    
    return () => subscription.remove();
  }, []);
  
  const carregarSlug = async () => {
    try {
      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('slug')
        .eq('id', estabelecimentoId)
        .single();
      
      if (error) throw error;
      
      setSlug(data?.slug || '');
    } catch (error) {
      logger.error('Erro ao carregar slug:', error);
    }
  };
  
  const carregarUrlBase = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_globais')
        .select('valor')
        .eq('chave', 'url_agendamento_online')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data?.valor) {
        setUrlBase(data.valor);
      }
    } catch (error) {
      logger.error('Erro ao carregar URL base:', error);
      // Usa URL padrão se não conseguir carregar
    }
  };
  
  const carregarConfiguracao = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'agendamento_online_ativo')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignora erro de "não encontrado"
        throw error;
      }
      
      setAgendamentoOnlineAtivo(data?.valor === 'true');
    } catch (error) {
      logger.error('Erro ao carregar configuração:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações');
    } finally {
      setLoading(false);
    }
  };
  
  const carregarAntecedencia = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'agendamento_online_antecedencia_horas')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data?.valor) {
        setAntecedenciaMinima(parseInt(data.valor));
      }
    } catch (error) {
      logger.error('Erro ao carregar antecedência:', error);
    }
  };
  
  const salvarAntecedencia = async (novoValor: number) => {
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          estabelecimento_id: estabelecimentoId,
          chave: 'agendamento_online_antecedencia_horas',
          valor: String(novoValor),
        }, {
          onConflict: 'estabelecimento_id,chave'
        });
      
      if (error) throw error;
      
      setAntecedenciaMinima(novoValor);
      Alert.alert('Sucesso', 'Antecedência mínima atualizada!');
    } catch (error) {
      logger.error('Erro ao salvar antecedência:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração');
    }
  };
  
  const copiarLink = () => {
    Clipboard.setString(linkAgendamento);
    Alert.alert('Sucesso', 'Link copiado para a área de transferência!');
  };
  
  const compartilharWhatsApp = async () => {
    const mensagem = `📅 Agende seu horário comigo!\n\nAcesse o link e escolha o melhor horário:\n${linkAgendamento}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(mensagem)}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Erro', 'WhatsApp não está instalado neste dispositivo');
      }
    } catch (error) {
      logger.error('Erro ao abrir WhatsApp:', error);
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    }
  };
  
  const compartilharLink = async () => {
    try {
      await Share.share({
        message: `📅 Agende seu horário comigo!\n\nAcesse o link e escolha o melhor horário:\n${linkAgendamento}`,
        title: 'Link de Agendamento',
      });
    } catch (error) {
      logger.error('Erro ao compartilhar:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Content */}
      <View style={styles.content}>
        {/* Mensagem quando desativado */}
        {!agendamentoOnlineAtivo && (
          <Animated.View 
            entering={FadeIn.delay(100).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.infoHeader}>
              <FontAwesome5 name="info-circle" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Agendamento Online Desativado</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Ative o agendamento online no botão acima para permitir que seus clientes agendem horários pela internet.
            </Text>
          </Animated.View>
        )}
        
        {/* Card do Link */}
        {agendamentoOnlineAtivo && (
          <Animated.View 
            entering={FadeIn.delay(200).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.linkHeader}>
              <FontAwesome5 name="link" size={18} color={colors.primary} />
              <Text style={[styles.linkTitle, { color: colors.text }]}>Seu Link de Agendamento</Text>
            </View>
            
            <View style={[styles.linkContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
                {linkAgendamento}
              </Text>
            </View>
            
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={copiarLink}
              >
                <FontAwesome5 name="copy" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Copiar Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                onPress={compartilharWhatsApp}
              >
                <FontAwesome5 name="whatsapp" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
            
            {/* Configuração de Antecedência */}
            <View style={[styles.configSection, { borderTopColor: colors.border }]}>
              <View style={styles.configHeader}>
                <FontAwesome5 name="clock" size={16} color={colors.textSecondary} />
                <Text style={[styles.configTitle, { color: colors.text }]}>Antecedência Mínima</Text>
              </View>
              <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
                Tempo mínimo necessário antes do horário para permitir agendamento online
              </Text>
              <View style={styles.antecedenciaContainer}>
                <TextInput
                  style={[styles.antecedenciaInput, { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.text 
                  }]}
                  value={String(antecedenciaMinima)}
                  onChangeText={(text) => {
                    const numero = parseInt(text) || 0;
                    if (numero >= 0 && numero <= 72) {
                      setAntecedenciaMinima(numero);
                    }
                  }}
                  onBlur={() => salvarAntecedencia(antecedenciaMinima)}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.antecedenciaLabel, { color: colors.text }]}>horas</Text>
              </View>
              <Text style={[styles.antecedenciaExample, { color: colors.textTertiary }]}>
                Exemplo: Se agora são 08:00 e você configurou 2h, o próximo horário disponível será às 10:00
              </Text>
            </View>
          </Animated.View>
        )}
        
        {/* Card de Informações */}
        {agendamentoOnlineAtivo && (
          <Animated.View 
            entering={FadeIn.delay(300).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.infoHeader}>
              <FontAwesome5 name="info-circle" size={18} color={colors.primary} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Como Funciona</Text>
            </View>
            
            <View style={styles.infoItem}>
              <FontAwesome5 name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Clientes acessam o link e escolhem data e horário
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <FontAwesome5 name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Você recebe notificação de novos agendamentos
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <FontAwesome5 name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Horários ocupados são automaticamente bloqueados
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  configSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  configDescription: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  antecedenciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  antecedenciaInput: {
    width: 60,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  antecedenciaLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  antecedenciaExample: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
