import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  salvarModeloMensagem, 
  getModeloMensagem,
  salvarModeloAniversariante,
  getModeloAniversariante 
} from '../../services/whatsapp';
import { logger } from '../../utils/logger';
import { theme } from '@utils/theme';

type TabType = 'agendamentos' | 'aniversariantes';

export default function AutomacaoScreen() {
  const { estabelecimentoId } = useAuth();
  const [tab, setTab] = useState<TabType>('agendamentos');
  const [modeloAgendamento, setModeloAgendamento] = useState('');
  const [modeloAniversariante, setModeloAniversariante] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [agendamento, aniversariante] = await Promise.all([
          getModeloMensagem(estabelecimentoId || undefined),
          getModeloAniversariante(estabelecimentoId || undefined)
        ]);
        setModeloAgendamento(agendamento);
        setModeloAniversariante(aniversariante);
      } catch (e) {
        logger.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [estabelecimentoId]);

  const onSalvarAgendamento = async () => {
    try {
      await salvarModeloMensagem(modeloAgendamento, estabelecimentoId || undefined);
      Alert.alert('Sucesso', 'Modelo de mensagem de agendamento salvo.');
    } catch (e) {
      logger.error(e);
      Alert.alert('Erro', 'Não foi possível salvar o modelo.');
    }
  };

  const onSalvarAniversariante = async () => {
    try {
      await salvarModeloAniversariante(modeloAniversariante, estabelecimentoId || undefined);
      Alert.alert('Sucesso', 'Modelo de mensagem de aniversário salvo.');
    } catch (e) {
      logger.error(e);
      Alert.alert('Erro', 'Não foi possível salvar o modelo.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'agendamentos' && styles.tabActive]} 
          onPress={() => setTab('agendamentos')}
        >
          <Text style={[styles.tabText, tab === 'agendamentos' && styles.tabTextActive]}>
            Agendamentos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, tab === 'aniversariantes' && styles.tabActive]} 
          onPress={() => setTab('aniversariantes')}
        >
          <Text style={[styles.tabText, tab === 'aniversariantes' && styles.tabTextActive]}>
            Aniversariantes
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'agendamentos' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Mensagem de agendamento</Text>
          <Text style={styles.help}>
            Use os placeholders:
            {'\n'}• {`{cliente}`} • {`{data}`} • {`{hora}`} • {`{dia}`} {'\n'}• {`{servico}`} • {`{empresa}`} • {`{valor}`}
          </Text>
          <TextInput
            multiline
            value={modeloAgendamento}
            onChangeText={setModeloAgendamento}
            placeholder="Digite o modelo da mensagem..."
            style={styles.textarea}
            editable={!loading}
          />
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]} 
              onPress={onSalvarAgendamento} 
              disabled={loading}
            >
              <Text style={styles.buttonPrimaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === 'aniversariantes' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Mensagem de aniversário</Text>
          <Text style={styles.help}>
            Use os placeholders:
            {'\n'}• {`{cliente}`} • {`{idade}`} • {`{data_nascimento}`} • {`{empresa}`}
          </Text>
          <TextInput
            multiline
            value={modeloAniversariante}
            onChangeText={setModeloAniversariante}
            placeholder="Digite o modelo da mensagem de aniversário..."
            style={styles.textarea}
            editable={!loading}
          />
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]} 
              onPress={onSalvarAniversariante} 
              disabled={loading}
            >
              <Text style={styles.buttonPrimaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { paddingVertical: 12, paddingHorizontal: 16 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: 'theme.colors.primary' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: 'theme.colors.primary' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  help: { color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  textarea: { minHeight: 160, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, textAlignVertical: 'top', fontSize: 16 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981' },
  buttonPrimaryText: { color: '#065F46', fontWeight: '700' },
});