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
  ColorTheme,
} from '@utils/accentTheme';

/**
 * Modo de tema do aplicativo
 * 
 * @type {'light'} - Força modo claro
 * @type {'dark'} - Força modo escuro
 * @type {'auto'} - Segue preferência do dispositivo (padrão)
 */
type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Interface do contexto de tema
 * 
 * Fornece:
 * - **colors**: Todos os tokens de cor (semânticas + marca)
 * - **accentColor**: Cor de marca atual
 * - **isDark**: Indicador de modo escuro
 * - **mode**: Modo de tema (light/dark/auto)
 * - **setTheme()**: Muda modo de tema
 * - **setAccentColor()**: Muda cor de marca
 * - **toggleTheme()**: Alterna light/dark
 */
interface ThemeContextType {
  mode: ThemeMode;
  accentColor: AccentColorId;
  isDark: boolean;
  colors: ColorTheme & { primaryContrast: string };
  spacing: typeof themeConfig.spacing;
  typography: typeof themeConfig.typography;
  borders: typeof themeConfig.borders;
  shadows: typeof themeConfig.shadows;
  /** Muda o modo de tema: 'light' | 'dark' | 'auto' (padrão: auto) */
  setTheme: (mode: ThemeMode) => void;
  /** Muda a cor de marca do app (roxo, azul, verde, etc.) */
  setAccentColor: (accentColor: AccentColorId) => void;
  /** Alterna entre light e dark mode */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';

/**
 * Provedor de tema do aplicativo
 * 
 * Gerencia:
 * - **Modo de tema**: light/dark/auto (com persistência em AsyncStorage)
 * - **Cor de marca**: Escolhida pelo usuário (com persistência em AsyncStorage)
 * - **Cores dinâmicas**: Recomputa toda vez que tema/acento muda
 * 
 * ## Melhoria #5: Override de tema
 * Use `setTheme('light')` ou `setTheme('dark')` para forçar modo específico.
 * Voltará a 'auto' se desejar seguir sistema novamente.
 * 
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [accentColor, setAccentColorState] = useState<AccentColorId>(DEFAULT_ACCENT_COLOR);
  const [isReady, setIsReady] = useState(false);

  // Determina se deve usar dark mode baseado em:
  // 1. Se modo for 'auto' → segue preferência do dispositivo
  // 2. Caso contrário → usa o modo explícito
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

/**
 * Hook para acessar o tema do aplicativo
 * 
 * Retorna objeto com:
 * - `colors` - Todos os tokens de cor (semânticos + marca)
 * - `accentColor` - Cor de marca atual
 * - `isDark` - Se está em dark mode
 * - `mode` - Modo ('light' | 'dark' | 'auto')
 * - `setTheme()` - Mudar modo
 * - `setAccentColor()` - Mudar cor de marca
 * - `toggleTheme()` - Alternar light/dark
 * - `spacing`, `typography`, `borders`, `shadows` - Tokens de design
 * 
 * ## Melhoria #2: useCreateStyles hook
 * Em vez de usar useTheme + useMemo em toda tela, use:
 * 
 * ```tsx
 * import { useCreateStyles } from '@utils/accentTheme';
 * 
 * const styles = useCreateStyles(({ colors, design }) => StyleSheet.create({
 *   container: { backgroundColor: colors.surface, padding: design.spacing.md },
 *   text: { color: colors.text, fontSize: design.typography.base },
 * }));
 * ```
 * 
 * @throws Erro se usado fora de ThemeProvider
 * @example
 * function MyComponent() {
 *   const { colors, isDark, setTheme } = useTheme();
 *   return <View style={{ backgroundColor: colors.surface }} />;
 * }
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
