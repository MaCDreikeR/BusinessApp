import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as themeConfig } from '@utils/theme';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof themeConfig.colors;
  spacing: typeof themeConfig.spacing;
  typography: typeof themeConfig.typography;
  borders: typeof themeConfig.borders;
  shadows: typeof themeConfig.shadows;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [isReady, setIsReady] = useState(false);

  // Determina se deve usar dark mode
  const isDark = mode === 'auto' 
    ? deviceColorScheme === 'dark' 
    : mode === 'dark';

  // Carrega preferência salva
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        setMode(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de tema:', error);
    } finally {
      setIsReady(true);
    }
  };

  const setTheme = async (newMode: ThemeMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
  };

  // Monta cores baseado no tema atual
  const colors = isDark ? {
    ...themeConfig.colors,
    // Sobrescreve com cores dark
    background: themeConfig.colors.dark.background,
    backgroundSecondary: themeConfig.colors.dark.backgroundSecondary,
    surface: themeConfig.colors.dark.surface,
    surfaceHighlight: themeConfig.colors.dark.surfaceHighlight,
    text: themeConfig.colors.dark.text,
    textSecondary: themeConfig.colors.dark.textSecondary,
    textTertiary: themeConfig.colors.dark.textTertiary,
    textDisabled: themeConfig.colors.dark.textDisabled,
    border: themeConfig.colors.dark.border,
    borderLight: themeConfig.colors.dark.borderLight,
    separator: themeConfig.colors.dark.separator,
  } : themeConfig.colors;

  if (!isReady) {
    return null; // Ou um splash screen
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        spacing: themeConfig.spacing,
        typography: themeConfig.typography,
        borders: themeConfig.borders,
        shadows: themeConfig.shadows,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
