import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function AgendamentosOnlineScreen() {
  const { colors } = useTheme();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
  }), [colors]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Agendamentos Online</ThemedText>
    </ThemedView>
  );
}