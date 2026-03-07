/**
 * Card Component - Sistema de Design v2
 * 
 * Componente de card reutilizável com suporte a variantes e estilos.
 * Usa COMPONENT_TOKENS como fundação para garantir consistência.
 * 
 * @example
 * import { Card } from '@/components/Card';
 * 
 * // Card padrão
 * <Card>
 *   <Text>Conteúdo do card</Text>
 * </Card>
 * 
 * // Card elevado (mais destaque)
 * <Card variant="elevated">
 *   <Text>Card com sombra maior</Text>
 * </Card>
 * 
 * // Card plano (sem sombra)
 * <Card variant="flat">
 *   <Text>Card simples com borda</Text>
 * </Card>
 * 
 * // Card com onPress (clicável)
 * <Card variant="default" onPress={() => navigation.navigate('Details')}>
 *   <Text>Clique aqui</Text>
 * </Card>
 */

import React from 'react';
import { 
  View, 
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { COMPONENT_TOKENS, ColorTheme } from '../utils/accentTheme';

// ============================================================================
// TIPOS
// ============================================================================

export type CardVariant = 'default' | 'elevated' | 'flat';

export interface CardProps {
  /** Variante visual do card */
  variant?: CardVariant;
  
  /** Conteúdo do card */
  children: React.ReactNode;
  
  /** Função executada ao clicar no card (torna card clicável) */
  onPress?: () => void;
  
  /** Estilo customizado adicional */
  style?: ViewStyle;
  
  /** ID para testes automatizados */
  testID?: string;
  
  /** Cor de fundo customizada (sobrescreve padrão) */
  backgroundColor?: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function Card({
  variant = 'default',
  children,
  onPress,
  style,
  testID,
  backgroundColor,
}: CardProps) {
  const { colors } = useTheme();
  
  // Obtém tokens da variante
  const variantTokens = COMPONENT_TOKENS.card[variant];
  
  // Estilos base do card
  const cardStyle: ViewStyle = {
    backgroundColor: backgroundColor || colors.surface,
    borderRadius: variantTokens.borderRadius,
    padding: variantTokens.padding,
    ...getShadowStyle(variant, colors, variantTokens),
    ...(variant === 'flat' && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
  };
  
  // Se tem onPress, renderiza como TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  // Caso contrário, renderiza como View simples
  return (
    <View style={[cardStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retorna estilos de sombra baseado na variante
 */
function getShadowStyle(
  variant: CardVariant,
  colors: ColorTheme,
  tokens: typeof COMPONENT_TOKENS.card[CardVariant]
): ViewStyle {
  // Card flat não tem sombra
  if (variant === 'flat') {
    return {};
  }
  
  // Type guard para garantir que tokens tem shadowOffset
  const hasShadow = 'shadowOffset' in tokens && 
                     'shadowOpacity' in tokens && 
                     'shadowRadius' in tokens && 
                     'elevation' in tokens;
  
  if (!hasShadow) {
    return {};
  }
  
  return {
    shadowColor: colors.shadow,
    shadowOffset: tokens.shadowOffset as { width: number; height: number },
    shadowOpacity: tokens.shadowOpacity as number,
    shadowRadius: tokens.shadowRadius as number,
    elevation: tokens.elevation as number,
  };
}
