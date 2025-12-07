import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '@utils/theme';

interface ButtonProps {
  onPress: () => void;
  label: string;
  icon?: string;
  variant?: 'primary' | 'filter' | 'header';
  active?: boolean;
}

export const Button = ({ 
  onPress, 
  label, 
  icon, 
  variant = 'primary',
  active = false 
}: ButtonProps) => {
  const getStyles = () => {
    switch (variant) {
      case 'filter':
        return {
          button: [
            styles.button,
            styles.filterButton,
            active && styles.filterButtonActive
          ],
          text: [
            styles.text,
            styles.filterText,
            active && styles.filterTextActive
          ],
          icon: active ? 'theme.colors.primary' : '#666'
        };
      case 'header':
        return {
          button: [styles.button, styles.headerButton],
          text: styles.text,
          icon: 'theme.colors.primary'
        };
      default:
        return {
          button: [styles.button, styles.primaryButton],
          text: [styles.text, styles.primaryText],
          icon: '#FFFFFF'
        };
    }
  };

  const buttonStyles = getStyles();

  return (
    <TouchableOpacity 
      style={buttonStyles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={[styles.iconContainer, variant === 'filter' && styles.filterIconContainer]}>
          <FontAwesome5 
            name={icon} 
            size={variant === 'header' ? 20 : 16} 
            color={buttonStyles.icon}
          />
        </View>
      )}
      <Text style={buttonStyles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  // Botão primário (padrão)
  primaryButton: {
    backgroundColor: 'theme.colors.primary',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 120,
  },
  // Botão de filtro
  filterButton: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 95,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#EDE9FE',
  },
  // Botão do header
  headerButton: {
    backgroundColor: '#EDE9FE',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  // Estilos de texto
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  filterText: {
    color: '#666666',
  },
  filterTextActive: {
    color: 'theme.colors.primary',
  },
  // Container do ícone
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
});

// Adicionar exportação padrão para resolver o aviso do Expo Router
export default Button; 