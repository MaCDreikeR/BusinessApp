import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { salvarModeloMensagem, getModeloMensagem } from '../../services/whatsapp';
import { logger } from '../../utils/logger';
import { theme } from '@utils/theme';

export default function AutomacaoScreen() {
  const { estabelecimentoId } = useAuth();
  const [tab, setTab] = useState<'agendamentos'>('agendamentos');
  const [modelo, setModelo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const atual = await getModeloMensagem(estabelecimentoId || undefined);
        setModelo(atual);
      } catch (e) {
        logger.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [estabelecimentoId]);

  const onSalvar = async () => {
    try {
      await salvarModeloMensagem(modelo, estabelecimentoId || undefined);
      Alert.alert('Sucesso', 'Modelo de mensagem salvo.');
    } catch (e) {
      logger.error(e);
      Alert.alert('Erro', 'Não foi possível salvar o modelo.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs simples - por ora existe apenas Agendamentos */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'agendamentos' && styles.tabActive]} onPress={() => setTab('agendamentos')}>
          <Text style={[styles.tabText, tab === 'agendamentos' && styles.tabTextActive]}>Agendamentos</Text>
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
            value={modelo}
            onChangeText={setModelo}
            placeholder="Digite o modelo da mensagem..."
            style={styles.textarea}
            editable={!loading}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onSalvar} disabled={loading}>
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