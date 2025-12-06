import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@utils/theme';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface ErrorScreenProps {
  error: Error;
  onReset: () => void;
}

/**
 * ErrorScreen Component
 * 
 * Tela de erro amigável mostrada quando ErrorBoundary captura um erro.
 * 
 * Features:
 * - UI amigável para o usuário
 * - Botão "Tentar Novamente" para resetar
 * - Detalhes técnicos expansíveis (dev mode)
 * - Ícone de erro visual
 * - Sugestões de resolução
 * 
 * @example
 * ```tsx
 * <ErrorScreen 
 *   error={new Error('Algo deu errado')} 
 *   onReset={() => console.log('Reset')} 
 * />
 * ```
 */
export default function ErrorScreen({ error, onReset }: ErrorScreenProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de Erro */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name="alert-circle" 
            size={80} 
            color={theme.colors.error} 
          />
        </View>

        {/* Título */}
        <ThemedText style={styles.title}>
          Ops! Algo deu errado
        </ThemedText>

        {/* Descrição */}
        <ThemedText style={styles.description}>
          Ocorreu um erro inesperado. Não se preocupe, seus dados estão seguros.
        </ThemedText>

        {/* Mensagem de Erro (simplificada) */}
        <View style={styles.errorMessageContainer}>
          <ThemedText style={styles.errorMessage}>
            {error.message || 'Erro desconhecido'}
          </ThemedText>
        </View>

        {/* Sugestões */}
        <View style={styles.suggestionsContainer}>
          <ThemedText style={styles.suggestionsTitle}>
            O que você pode fazer:
          </ThemedText>
          <View style={styles.suggestion}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <ThemedText style={styles.suggestionText}>
              Tente novamente usando o botão abaixo
            </ThemedText>
          </View>
          <View style={styles.suggestion}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <ThemedText style={styles.suggestionText}>
              Verifique sua conexão com a internet
            </ThemedText>
          </View>
          <View style={styles.suggestion}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <ThemedText style={styles.suggestionText}>
              Se o problema persistir, entre em contato com o suporte
            </ThemedText>
          </View>
        </View>

        {/* Detalhes Técnicos (Toggle) */}
        {__DEV__ && (
          <>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <ThemedText style={styles.detailsToggleText}>
                {showDetails ? 'Ocultar' : 'Mostrar'} detalhes técnicos
              </ThemedText>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Stack Trace:</Text>
                <Text style={styles.detailsText}>
                  {error.stack || 'Sem stack trace disponível'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Botão Tentar Novamente */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={onReset}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.resetButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  errorMessageContainer: {
    backgroundColor: theme.colors.errorLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borders.radius.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.errorDark,
    fontFamily: 'monospace',
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  suggestionsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  detailsToggleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: theme.spacing.md,
    borderRadius: theme.borders.radius.md,
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  detailsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: '#333',
  },
  detailsText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: 'monospace',
    color: '#666',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borders.radius.full,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
