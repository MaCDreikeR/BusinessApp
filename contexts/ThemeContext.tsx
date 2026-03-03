import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as themeConfig } from '@utils/theme';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof themeConfig.colors & { primaryContrast: string };
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
    // Sobrescreve TODAS as cores com versões dark
    // Cores primárias
    primary: themeConfig.colors.dark.primary,
    primaryDark: themeConfig.colors.dark.primaryDark,
    primaryLight: themeConfig.colors.dark.primaryLight,
    primaryLighter: themeConfig.colors.dark.primaryLighter,
    primaryContrast: themeConfig.colors.dark.white, // Branco para contrastar com fundos roxos
    // Cores secundárias
    secondary: themeConfig.colors.dark.secondary,
    secondaryDark: themeConfig.colors.dark.secondaryDark,
    secondaryLight: themeConfig.colors.dark.secondaryLight,
    // Cores de status
    success: themeConfig.colors.dark.success,
    successLight: themeConfig.colors.dark.successLight,
    successDark: themeConfig.colors.dark.successDark,
    error: themeConfig.colors.dark.error,
    errorLight: themeConfig.colors.dark.errorLight,
    errorDark: themeConfig.colors.dark.errorDark,
    warning: themeConfig.colors.dark.warning,
    warningLight: themeConfig.colors.dark.warningLight,
    warningDark: themeConfig.colors.dark.warningDark,
    info: themeConfig.colors.dark.info,
    infoLight: themeConfig.colors.dark.infoLight,
    infoDark: themeConfig.colors.dark.infoDark,
    // Fundos
    background: themeConfig.colors.dark.background,
    backgroundSecondary: themeConfig.colors.dark.backgroundSecondary,
    surface: themeConfig.colors.dark.surface,
    surfaceHighlight: themeConfig.colors.dark.surfaceHighlight,
    // Textos
    text: themeConfig.colors.dark.text,
    textSecondary: themeConfig.colors.dark.textSecondary,
    textTertiary: themeConfig.colors.dark.textTertiary,
    textDisabled: themeConfig.colors.dark.textDisabled,
    // Bordas
    border: themeConfig.colors.dark.border,
    borderLight: themeConfig.colors.dark.borderLight,
    separator: themeConfig.colors.dark.separator,
    // Backgrounds de status
    successBackground: themeConfig.colors.dark.successBackground,
    errorBackground: themeConfig.colors.dark.errorBackground,
    warningBackground: themeConfig.colors.dark.warningBackground,
    infoBackground: themeConfig.colors.dark.infoBackground,
    primaryBackground: themeConfig.colors.dark.primaryBackground,
    // Cores especiais
    white: themeConfig.colors.dark.white,
    online: themeConfig.colors.dark.online,
    offline: themeConfig.colors.dark.offline,
    busy: themeConfig.colors.dark.busy,
  } : {
    ...themeConfig.colors,
    primaryContrast: themeConfig.colors.primary, // Roxo sobre fundos claros no light mode
  };

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
