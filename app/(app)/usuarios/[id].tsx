import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { Card } from '../../../components/Card';
import { logger } from '../../../utils/logger';
import { Usuario as UsuarioBase } from '@types';
import { theme } from '@utils/theme';

type UsuarioDetalhes = Pick<UsuarioBase, 'id' | 'nome_completo' | 'email' | 'telefone' | 'is_principal'>;

export default function DetalhesUsuarioScreen() {
  const { id } = useLocalSearchParams();
  const [usuario, setUsuario] = useState<UsuarioDetalhes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUsuario();
  }, [id]);

  async function carregarUsuario() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setUsuario(data);
    } catch (error) {
      logger.error('Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText>Carregando...</ThemedText>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.container}>
        <ThemedText>Usuário não encontrado</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <ThemedText style={styles.nome}>{usuario.nome_completo}</ThemedText>
        <ThemedText style={styles.info}>{usuario.email}</ThemedText>
        {usuario.telefone && (
          <ThemedText style={styles.info}>{usuario.telefone}</ThemedText>
        )}
        {usuario.is_principal && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>Principal</ThemedText>
          </View>
        )}
      </Card>
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 