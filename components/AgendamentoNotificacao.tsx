import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Image } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { theme } from '@utils/theme';

interface AgendamentoNotificacaoProps {
  visible: boolean;
  cliente: string;
  cliente_foto?: string | null;
  servico: string;
  horario: string;
  onOcultar: () => void;
  onVerAgendamento: () => void;
}

export default function AgendamentoNotificacao({
  visible,
  cliente,
  cliente_foto,
  servico,
  horario,
  onOcultar,
  onVerAgendamento
}: AgendamentoNotificacaoProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.androidBlur} />
        )}
        
        <View style={styles.notificacaoContainer}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={32} color="theme.colors.primary" />
            </View>
          </View>

          <Text style={styles.titulo}>Agendamento Iniciando!</Text>
          
          <View style={styles.infoContainer}>
            {/* Info do Cliente com Foto */}
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Cliente:</Text>
              {cliente_foto ? (
                <Image 
                  source={{ uri: cliente_foto }} 
                  style={styles.clienteFoto}
                />
              ) : (
                <View style={styles.clienteFotoPlaceholder}>
                  <FontAwesome5 name="user" size={12} color="theme.colors.primary" />
                </View>
              )}
              <Text style={styles.infoValue}>{cliente}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="cut" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Serviço:</Text>
              <Text style={styles.infoValue}>{servico}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Horário:</Text>
              <Text style={styles.infoValue}>{horario}</Text>
            </View>
          </View>

          <View style={styles.botoesContainer}>
            <TouchableOpacity 
              style={[styles.botao, styles.botaoOcultar]}
              onPress={onOcultar}
            >
              <Ionicons name="close-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.botaoOcultarTexto}>Ocultar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.botao, styles.botaoVerAgendamento]}
              onPress={onVerAgendamento}
            >
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.botaoVerAgendamentoTexto}>Ver Agendamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  androidBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  notificacaoContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clienteFoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clienteFotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  botoesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  botao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  botaoOcultar: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  botaoOcultarTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  botaoVerAgendamento: {
    backgroundColor: 'theme.colors.primary',
  },
  botaoVerAgendamentoTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
