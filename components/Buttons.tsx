/**
 * Buttons - Componentes de Botões Especializados
 * 
 * Biblioteca de botões padronizados para ações comuns no aplicativo.
 * Garante consistência visual e comportamental em todas as telas.
 * 
 * @example
 * import { SelectionButton, ItemButton, ActionButton } from '@/components/Buttons';
 * 
 * // Botão para adicionar produtos/serviços
 * <SelectionButton 
 *   label="Adicionar Produtos" 
 *   icon="cube-outline"
 *   onPress={handleMostrarModalProdutos}
 * />
 * 
 * // Botão com contador de itens selecionados
 * <SelectionButton 
 *   label="Serviços" 
 *   icon="cut-outline"
 *   count={servicosSelecionados.length}
 *   selected={servicosSelecionados.length > 0}
 *   onPress={abrirModalServicos}
 * />
 * 
 * // Botão de item da lista (card clicável)
 * <ItemButton
 *   title={produto.nome}
 *   subtitle={`R$ ${produto.preco.toFixed(2)}`}
 *   onPress={() => selecionarProduto(produto)}
 *   selected={produtosSelecionados.includes(produto.id)}
 * />
 */

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DESIGN_TOKENS } from '../utils/accentTheme';

// ============================================================================
// SELECTION BUTTON - Botão para adicionar/selecionar itens
// ============================================================================

export interface SelectionButtonProps {
  /** Texto principal do botão */
  label: string;
  
  /** Nome do ícone Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  
  /** Função executada ao clicar */
  onPress: () => void;
  
  /** Número de itens selecionados (opcional) */
  count?: number;
  
  /** Se há itens selecionados */
  selected?: boolean;
  
  /** Valor monetário total (opcional) */
  value?: number;
  
  /** Desabilita o botão */
  disabled?: boolean;
  
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Estilos padrão para contenedores de botões de seleção
 * Use em View containers que envolvem SelectionButton
 */
export const SELECTION_BUTTON_CONTAINER_STYLE: ViewStyle = {
  flexDirection: 'row',
  gap: 8,
  marginTop: 12,
  paddingHorizontal: 16,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

/**
 * Botão para adicionar/selecionar itens (produtos, serviços, pacotes, clientes)
 * Usado em formulários de criação/edição
 */
export function SelectionButton({
  label,
  icon,
  onPress,
  count,
  selected = false,
  value,
  disabled = false,
  style,
}: SelectionButtonProps) {
  const { colors } = useTheme();
  
  const displayLabel = count && count > 0 ? `${label} (${count})` : label;
  
  return (
    <TouchableOpacity
      style={[
        styles.selectionButton,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        disabled && styles.selectionButtonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.selectionButtonContent}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={selected ? colors.white : colors.primary}
        />
        <Text          numberOfLines={1}          style={[
            styles.selectionButtonText,
            { color: selected ? colors.white : colors.text },
            disabled && { color: colors.textTertiary },
          ]}
        >
          {displayLabel}
        </Text>
      </View>
      {value !== undefined && value > 0 && (
        <Text
          style={[
            styles.selectionButtonValue,
            { color: selected ? colors.white : colors.primary },
          ]}
        >
          R$ {value.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// ITEM BUTTON - Botão de item em lista/modal
// ============================================================================

export interface ItemButtonProps {
  /** Título principal */
  title: string;
  
  /** Subtítulo/descrição */
  subtitle?: string;
  
  /** Valor/preço */
  value?: string;
  
  /** Função executada ao clicar */
  onPress: () => void;
  
  /** Se o item está selecionado */
  selected?: boolean;
  
  /** Ícone customizado (opcional) */
  icon?: keyof typeof Ionicons.glyphMap;
  
  /** Cor do ícone (opcional) */
  iconColor?: string;
  
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão representando um item clicável em lista ou modal
 * Usado para selecionar produtos, serviços, clientes, etc.
 */
export function ItemButton({
  title,
  subtitle,
  value,
  onPress,
  selected = false,
  icon,
  iconColor,
  style,
}: ItemButtonProps) {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.itemButton,
        {
          backgroundColor: selected ? colors.primaryBackground : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={[styles.itemIcon, { backgroundColor: iconColor || colors.primary + '20' }]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={iconColor || colors.primary}
          />
        </View>
      )}
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            { color: selected ? colors.primaryContrast : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.itemSubtitle,
              { color: selected ? colors.primaryContrast : colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text
          style={[
            styles.itemValue,
            { color: selected ? colors.primaryContrast : colors.primary },
          ]}
        >
          {value}
        </Text>
      )}
      {selected && (
        <View style={styles.itemCheckmark}>
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={colors.primary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// ACTION BUTTON - Botão de ação rápida
// ============================================================================

export interface ActionButtonProps {
  /** Texto do botão */
  label: string;
  
  /** Nome do ícone */
  icon: keyof typeof Ionicons.glyphMap;
  
  /** Função ao clicar */
  onPress: () => void;
  
  /** Cor customizada (opcional) */
  color?: string;
  
  /** Variante visual */
  variant?: 'primary' | 'secondary' | 'outline';
  
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão compacto para ações rápidas
 * Usado em cabeçalhos, toolbars, etc.
 */
export function ActionButton({
  label,
  icon,
  onPress,
  color,
  variant = 'primary',
  style,
}: ActionButtonProps) {
  const { colors } = useTheme();
  
  const getVariantStyles = () => {
    const customColor = color || colors.primary;
    
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: customColor },
          text: { color: colors.white },
        };
      case 'secondary':
        return {
          container: { 
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.text },
        };
      case 'outline':
        return {
          container: { 
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: customColor,
          },
          text: { color: customColor },
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variantStyles.container,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={variantStyles.text.color}
      />
      <Text style={[styles.actionButtonText, variantStyles.text]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// ADD ITEM BUTTON - Botão para adicionar novo item
// ============================================================================

export interface AddItemButtonProps {
  /** Texto do botão */
  label: string;
  
  /** Função ao clicar */
  onPress: () => void;
  
  /** Variante visual */
  variant?: 'default' | 'inline' | 'full';
  
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão padronizado para adicionar novos itens
 * Usado em listas, formulários, etc.
 */
export function AddItemButton({
  label,
  onPress,
  variant = 'default',
  style,
}: AddItemButtonProps) {
  const { colors } = useTheme();
  
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'inline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
        };
      case 'full':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          width: '100%',
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.addItemButton,
        getVariantStyle(),
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="add-circle-outline" 
        size={20} 
        color={colors.primary}
      />
      <Text style={[styles.addItemButtonText, { color: colors.primary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  // Selection Button
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
    flex: 1,
    minWidth: 85,
  },
  selectionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectionButtonValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: DESIGN_TOKENS.spacing.sm,
  },
  selectionButtonDisabled: {
    opacity: 0.5,
  },
  
  // Item Button
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 60,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DESIGN_TOKENS.spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  itemValue: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: DESIGN_TOKENS.spacing.sm,
  },
  itemCheckmark: {
    marginLeft: DESIGN_TOKENS.spacing.sm,
  },
  
  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DESIGN_TOKENS.spacing.xs,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 52,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Add Item Button
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addItemButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
