/**
 * Button Component - Sistema de Design v2
 * 
 * Componente de botão reutilizável com suporte a variantes, tamanhos e estados.
 * Usa COMPONENT_TOKENS como fundação para garantir consistência.
 * 
 * @example
 * import { Button } from '@/components/Button2';
 * 
 * // Botão primário grande
 * <Button size="large" variant="primary" onPress={handleSave}>
 *   Salvar Cliente
 * </Button>
 * 
 * // Botão secundário com loading
 * <Button variant="secondary" loading={isLoading} onPress={handleSubmit}>
 *   Enviar
 * </Button>
 * 
 * // Botão outline com ícone
 * <Button size="small" variant="outline" icon="trash" onPress={handleDelete}>
 *   Excluir
 * </Button>
 */

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { COMPONENT_TOKENS, DESIGN_TOKENS, ColorTheme } from '../utils/accentTheme';

// ============================================================================
// TIPOS
// ============================================================================

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  /** Tamanho do botão - define padding e altura */
  size?: ButtonSize;
  
  /** Estilo visual do botão */
  variant?: ButtonVariant;
  
  /** Função executada ao clicar no botão */
  onPress: () => void;
  
  /** Texto exibido no botão */
  children: string;
  
  /** Desabilita interação com o botão */
  disabled?: boolean;
  
  /** Mostra spinner de loading e desabilita interação */
  loading?: boolean;
  
  /** Nome do ícone Ionicons a ser exibido à esquerda */
  icon?: keyof typeof Ionicons.glyphMap;
  
  /** Faz o botão ocupar 100% da largura do container */
  fullWidth?: boolean;
  
  /** Estilo customizado adicional para o container */
  style?: ViewStyle;
  
  /** ID para testes automatizados */
  testID?: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function Button({
  size = 'medium',
  variant = 'primary',
  onPress,
  children,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  
  // Determina se o botão está inativo
  const isInactive = disabled || loading;
  
  // Obtém tokens de tamanho do componente
  const sizeTokens = COMPONENT_TOKENS.button[size];
  
  // Determina estilos de variante (cores)
  const variantStyles = getVariantStyles(variant, colors);
  
  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          paddingVertical: sizeTokens.paddingVertical,
          paddingHorizontal: sizeTokens.paddingHorizontal,
          borderRadius: sizeTokens.borderRadius,
          minHeight: sizeTokens.minHeight,
        },
        variantStyles.container,
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator 
          color={variantStyles.text.color} 
          size="small" 
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={getIconSize(size)} 
              color={variantStyles.text.color}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { fontSize: sizeTokens.fontSize },
              variantStyles.text,
            ]}
            numberOfLines={1}
          >
            {children}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retorna estilos de cor baseado na variante
 */
function getVariantStyles(
  variant: ButtonVariant, 
  colors: ColorTheme
): { container: ViewStyle; text: TextStyle } {
  switch (variant) {
    case 'primary':
      return {
        container: { 
          backgroundColor: colors.primary,
        },
        text: { 
          color: colors.white,
        },
      };
      
    case 'secondary':
      return {
        container: { 
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: { 
          color: colors.text,
        },
      };
      
    case 'outline':
      return {
        container: { 
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        },
        text: { 
          color: colors.primary,
        },
      };
      
    case 'ghost':
      return {
        container: { 
          backgroundColor: 'transparent',
        },
        text: { 
          color: colors.primary,
        },
      };
      
    case 'danger':
      return {
        container: { 
          backgroundColor: colors.error,
        },
        text: { 
          color: colors.white,
        },
      };
      
    default:
      // Fallback para primary
      return {
        container: { backgroundColor: colors.primary },
        text: { color: colors.white },
      };
  }
}

/**
 * Retorna tamanho apropriado do ícone baseado no tamanho do botão
 */
function getIconSize(size: ButtonSize): number {
  switch (size) {
    case 'small': return 16;
    case 'medium': return 20;
    case 'large': return 24;
  }
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    // Gap é aplicado no content
  },
  fullWidth: {
    width: '100%',
  },
  inactive: {
    opacity: 0.5,
  },
});
