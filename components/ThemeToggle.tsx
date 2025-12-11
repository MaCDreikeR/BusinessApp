import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  style?: any;
  showLabel?: boolean;
}

export default function ThemeToggle({ style, showLabel = false }: ThemeToggleProps) {
  const { isDark, mode, setTheme, colors, spacing } = useTheme();

  const handlePress = () => {
    // Ciclo: auto → light → dark → auto
    if (mode === 'auto') {
      setTheme('light');
    } else if (mode === 'light') {
      setTheme('dark');
    } else {
      setTheme('auto');
    }
  };

  const getIcon = () => {
    if (mode === 'auto') return 'phone-portrait-outline';
    return isDark ? 'moon' : 'sunny';
  };

  const getLabel = () => {
    if (mode === 'auto') return 'Auto';
    return isDark ? 'Escuro' : 'Claro';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={24} color={colors.primary} />
      {showLabel && (
        <Text style={[styles.label, { color: colors.text, marginLeft: spacing.sm }]}>
          {getLabel()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
