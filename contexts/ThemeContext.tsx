import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as themeConfig } from '@utils/theme';
import {
  ACCENT_STORAGE_KEY,
  AccentColorId,
  DEFAULT_ACCENT_COLOR,
  getColorTheme,
  isAccentColorId,
} from '@utils/accentTheme';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: AccentColorId;
  isDark: boolean;
  colors: typeof themeConfig.colors & { primaryContrast: string };
  spacing: typeof themeConfig.spacing;
  typography: typeof themeConfig.typography;
  borders: typeof themeConfig.borders;
  shadows: typeof themeConfig.shadows;
  setTheme: (mode: ThemeMode) => void;
  setAccentColor: (accentColor: AccentColorId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [accentColor, setAccentColorState] = useState<AccentColorId>(DEFAULT_ACCENT_COLOR);
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

      const savedAccent = await AsyncStorage.getItem(ACCENT_STORAGE_KEY);
      if (savedAccent && isAccentColorId(savedAccent)) {
        setAccentColorState(savedAccent);
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

  const setAccentColor = async (newAccentColor: AccentColorId) => {
    try {
      setAccentColorState(newAccentColor);
      await AsyncStorage.setItem(ACCENT_STORAGE_KEY, newAccentColor);
    } catch (error) {
      console.error('Erro ao salvar cor de destaque:', error);
    }
  };

  // Monta cores baseado no tema e cor de destaque atual
  // getColorTheme() retorna TODAS as cores (semânticas + marca)
  const colorTheme = getColorTheme(accentColor, isDark);
  
  const colors = {
    ...colorTheme,
    primaryContrast: isDark ? '#FFFFFF' : colorTheme.primary,
  };

  if (!isReady) {
    return null; // Ou um splash screen
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accentColor,
        isDark,
        colors,
        spacing: themeConfig.spacing,
        typography: themeConfig.typography,
        borders: themeConfig.borders,
        shadows: themeConfig.shadows,
        setTheme,
        setAccentColor,
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
