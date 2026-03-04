/**
 * Sistema de Cores Centralizado - BusinessApp
 * 
 * Consolidação única de TODAS as cores do app.
 * - Cores semânticas (texto, fundos, bordas, status) que não mudam
 * - Cores de marca (primary + variações) que mudam com acento escolhido
 * 
 * Uso: import { getColorTheme, ACCENT_COLORS } from '@utils/accentTheme'
 * const colors = getColorTheme('purple', false) // light mode com roxo
 * const colors = getColorTheme('blue', true)    // dark mode com azul
 */

export type AccentColorId = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red';

export interface AccentColorOption {
  id: AccentColorId;
  name: string;
  color: string;
}

export const DEFAULT_ACCENT_COLOR: AccentColorId = 'purple';
export const ACCENT_STORAGE_KEY = '@accent_color';

// Opções de cores que o usuário pode escolher (marca)
export const ACCENT_COLORS: AccentColorOption[] = [
  { id: 'purple', name: 'Roxo', color: '#7C3AED' },
  { id: 'blue', name: 'Azul', color: '#3B82F6' },
  { id: 'green', name: 'Verde', color: '#10B981' },
  { id: 'orange', name: 'Laranja', color: '#F59E0B' },
  { id: 'pink', name: 'Rosa', color: '#EC4899' },
  { id: 'red', name: 'Vermelho', color: '#EF4444' },
];

// ============================================================================
// TIPOS DE CORES
// ============================================================================

type SemanticTokens = {
  // Fundos
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHighlight: string;
  
  // Textos
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  
  // Bordas e separadores
  border: string;
  borderLight: string;
  separator: string;
  
  // Status colors (não mudam com acento)
  success: string;
  successLight: string;
  successDark: string;
  successBackground: string;
  
  error: string;
  errorLight: string;
  errorDark: string;
  errorBackground: string;
  
  warning: string;
  warningLight: string;
  warningDark: string;
  warningBackground: string;
  
  info: string;
  infoLight: string;
  infoDark: string;
  infoBackground: string;
  
  // Especiais
  white: string;
  online: string;
  offline: string;
  busy: string;
  overlay: string;
  overlayLight: string;
  overlayDark: string;
  shadow: string;
  shadowDark: string;
};

type AccentTokens = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLighter: string;
  primaryBackground: string;
};

type ColorTheme = SemanticTokens & AccentTokens;

type AccentPalette = {
  light: AccentTokens;
  dark: AccentTokens;
};

// ============================================================================
// CORES SEMÂNTICAS (NÃO MUDAM COM ACENTO)
// ============================================================================

const SEMANTIC_COLORS_LIGHT: SemanticTokens = {
  // Fundos - Tema Claro
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHighlight: '#F5F5F5',
  
  // Textos - Tema Claro
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textDisabled: '#C7C7CC',
  
  // Bordas e Separadores
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  separator: '#D1D1D6',
  
  // Status Colors - Tema Claro (fixos, não mudam)
  success: '#34C759',
  successLight: '#8AFFB0',
  successDark: '#248A3D',
  successBackground: '#D1FAE5',
  
  error: '#FF3B30',
  errorLight: '#FF6961',
  errorDark: '#C41E17',
  errorBackground: '#FEE2E2',
  
  warning: '#FF9500',
  warningLight: '#FFB340',
  warningDark: '#C77700',
  warningBackground: '#FEF3C7',
  
  info: '#5AC8FA',
  infoLight: '#8FD9FF',
  infoDark: '#2B9BD6',
  infoBackground: '#DBEAFE',
  
  // Especiais
  white: '#FFFFFF',
  online: '#34C759',
  offline: '#8E8E93',
  busy: '#FF9500',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
};

const SEMANTIC_COLORS_DARK: SemanticTokens = {
  // Fundos - Material Design Dark Theme otimizado
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  surface: '#2A2A2C',
  surfaceHighlight: '#3E3E40',
  
  // Textos - Otimizados para legibilidade no escuro
  text: '#F5F5F5',
  textSecondary: '#B3B3B3',
  textTertiary: '#8A8A8F',
  textDisabled: '#5A5A5F',
  
  // Bordas e Separadores
  border: '#404040',
  borderLight: '#2A2A2A',
  separator: '#3A3A3A',
  
  // Status Colors - Tema Escuro (fixos, vibrantes para contraste)
  success: '#4ADE80',
  successLight: '#86EFAC',
  successDark: '#22C55E',
  successBackground: 'rgba(74, 222, 128, 0.18)',
  
  error: '#F87171',
  errorLight: '#FCA5A5',
  errorDark: '#EF4444',
  errorBackground: 'rgba(248, 113, 113, 0.18)',
  
  warning: '#FBBF24',
  warningLight: '#FCD34D',
  warningDark: '#F59E0B',
  warningBackground: 'rgba(251, 191, 36, 0.18)',
  
  info: '#60A5FA',
  infoLight: '#93C5FD',
  infoDark: '#3B82F6',
  infoBackground: 'rgba(96, 165, 250, 0.18)',
  
  // Especiais
  white: '#FFFFFF',
  online: '#4ADE80',
  offline: '#6B7280',
  busy: '#FBBF24',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
};

// ============================================================================
// CORES DE MARCA (VARIAM COM ACENTO)
// ============================================================================

const ACCENT_PALETTES: Record<AccentColorId, AccentPalette> = {
  purple: {
    light: {
      primary: '#7C3AED',
      primaryDark: '#6D28D9',
      primaryLight: '#A855F7',
      primaryLighter: '#C084FC',
      primaryBackground: '#F3E8FF',
    },
    dark: {
      primary: '#A78BFA',
      primaryDark: '#8B5CF6',
      primaryLight: '#C4B5FD',
      primaryLighter: '#DDD6FE',
      primaryBackground: 'rgba(167, 139, 250, 0.18)',
    },
  },
  blue: {
    light: {
      primary: '#3B82F6',
      primaryDark: '#2563EB',
      primaryLight: '#60A5FA',
      primaryLighter: '#93C5FD',
      primaryBackground: '#DBEAFE',
    },
    dark: {
      primary: '#60A5FA',
      primaryDark: '#3B82F6',
      primaryLight: '#93C5FD',
      primaryLighter: '#BFDBFE',
      primaryBackground: 'rgba(96, 165, 250, 0.18)',
    },
  },
  green: {
    light: {
      primary: '#10B981',
      primaryDark: '#059669',
      primaryLight: '#34D399',
      primaryLighter: '#6EE7B7',
      primaryBackground: '#D1FAE5',
    },
    dark: {
      primary: '#34D399',
      primaryDark: '#10B981',
      primaryLight: '#6EE7B7',
      primaryLighter: '#A7F3D0',
      primaryBackground: 'rgba(52, 211, 153, 0.18)',
    },
  },
  orange: {
    light: {
      primary: '#F59E0B',
      primaryDark: '#D97706',
      primaryLight: '#FBBF24',
      primaryLighter: '#FCD34D',
      primaryBackground: '#FEF3C7',
    },
    dark: {
      primary: '#FBBF24',
      primaryDark: '#F59E0B',
      primaryLight: '#FCD34D',
      primaryLighter: '#FDE68A',
      primaryBackground: 'rgba(251, 191, 36, 0.18)',
    },
  },
  pink: {
    light: {
      primary: '#EC4899',
      primaryDark: '#DB2777',
      primaryLight: '#F472B6',
      primaryLighter: '#F9A8D4',
      primaryBackground: '#FCE7F3',
    },
    dark: {
      primary: '#F472B6',
      primaryDark: '#EC4899',
      primaryLight: '#F9A8D4',
      primaryLighter: '#FBCFE8',
      primaryBackground: 'rgba(244, 114, 182, 0.18)',
    },
  },
  red: {
    light: {
      primary: '#EF4444',
      primaryDark: '#DC2626',
      primaryLight: '#F87171',
      primaryLighter: '#FCA5A5',
      primaryBackground: '#FEE2E2',
    },
    dark: {
      primary: '#F87171',
      primaryDark: '#EF4444',
      primaryLight: '#FCA5A5',
      primaryLighter: '#FECACA',
      primaryBackground: 'rgba(248, 113, 113, 0.18)',
    },
  },
};

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Valida se um valor é um ID de cor de acento válido
 */
export function isAccentColorId(value: string): value is AccentColorId {
  return ACCENT_COLORS.some((item) => item.id === value);
}

/**
 * Retorna apenas os tokens de marca (primary e variações)
 * para fins de compatibilidade com código antigo
 */
export function getAccentTokens(accentColor: AccentColorId, isDark: boolean): AccentTokens {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES[DEFAULT_ACCENT_COLOR];
  return isDark ? palette.dark : palette.light;
}

/**
 * Função principal: retorna tema completo (semântico + marca)
 * 
 * @param accentColor - ID da cor de marca escolhida
 * @param isDark - modo escuro (true) ou modo claro (false)
 * @returns Objeto com TODAS as cores para usar no app
 * 
 * Exemplo:
 *   const colors = getColorTheme('purple', false);
 *   <View style={{ backgroundColor: colors.surface, color: colors.text }} />
 */
export function getColorTheme(accentColor: AccentColorId, isDark: boolean): ColorTheme {
  const semanticColors = isDark ? SEMANTIC_COLORS_DARK : SEMANTIC_COLORS_LIGHT;
  const accentTokens = getAccentTokens(accentColor, isDark);
  
  return {
    ...semanticColors,
    ...accentTokens,
  };
}
