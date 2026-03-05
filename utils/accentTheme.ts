/**
 * # Sistema de Design Centralizado - BusinessApp
 * 
 * Consolidação única de TODOS os tokens de design do app:
 * - **Cores semânticas**: texto, fundos, bordas, status (fixas)
 * - **Cores de marca**: primary + variações (mudam com acento)
 * - **Spacing**: espaçamento padronizado
 * - **Typography**: tamanhos de fonte
 * - **Border Radius**: raios de borda
 * 
 * @example
 * import { getColorTheme, DESIGN_TOKENS } from '@utils/accentTheme'
 * 
 * // Obter tema completo de cores
 * const colors = getColorTheme('purple', false) // light mode + roxo
 * const colors = getColorTheme('blue', true)    // dark mode + azul
 * 
 * // Usar spacing global
 * <View style={{ padding: DESIGN_TOKENS.spacing.md }} />
 * 
 * @author BusinessApp Team
 * @version 2.0 - Centralizado com spacing, typography e radius
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
  textOnPrimary: string;          // Texto sobre fundos primary (ex: gradient)
  textOnPrimarySecondary: string; // Texto secundário sobre fundos primary
  
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

export type AccentTokens = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLighter: string;
  primaryBackground: string;
};

export type ColorTheme = SemanticTokens & AccentTokens;

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
  textOnPrimary: '#FFFFFF',
  textOnPrimarySecondary: 'rgba(255, 255, 255, 0.9)',
  
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
  textOnPrimary: '#FFFFFF',
  textOnPrimarySecondary: 'rgba(255, 255, 255, 0.9)',
  
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
// DESIGN TOKENS (Spacing, Typography, Border Radius)
// ============================================================================

/**
 * Tokens de espaçamento reutilizáveis
 * Use para padding, margin, gap, etc.
 * 
 * @example
 * <View style={{ padding: DESIGN_TOKENS.spacing.md, gap: DESIGN_TOKENS.spacing.xs }} />
 */
export const DESIGN_TOKENS = {
  /** Espaçamento em pixels */
  spacing: {
    xs: 4,    // Pequeno
    sm: 8,    // Pequeno-médio
    md: 12,   // Médio
    lg: 16,   // Grande
    xl: 20,   // Extra grande
    xxl: 24,  // Duplo extra grande
  },
  
  /** Tamanhos de fonte em pixels */
  typography: {
    xs: 12,   // Extra pequeno (labels, badges)
    sm: 14,   // Pequeno (descrições)
    base: 16, // Normal (padrão)
    lg: 18,   // Grande (subtítulos)
    xl: 20,   // Extra grande
    xxl: 24,  // Duplo extra grande
    xxxl: 28, // Títulos grandes
  },
  
  /** Raios de borda em pixels */
  radius: {
    sm: 4,    // Botões pequenos, inputs
    md: 8,    // Cards, inputs grandes
    lg: 12,   // Modals, sheets
    xl: 16,   // Grandes seções arredondadas
    full: 999, // Círculos
  },
} as const;

// ============================================================================
// COMPONENT TOKENS (Variantes de Componentes)
// ============================================================================

/**
 * Tokens de componentes reutilizáveis
 * 
 * Define variantes de tamanho para componentes comuns.
 * Estes tokens servem como FUNDAÇÃO para os componentes React.
 * 
 * ⚠️ NÃO use diretamente nas telas - use os componentes (Button, Card, Input, etc)
 * 
 * @example
 * // ❌ Não fazer (repetitivo):
 * <TouchableOpacity style={COMPONENT_TOKENS.button.large}>
 * 
 * // ✅ Fazer (componente):
 * import { Button } from '@/components/Button';
 * <Button size="large" variant="primary" onPress={handleSave}>Salvar</Button>
 */
export const COMPONENT_TOKENS = {
  /** Variantes de botão */
  button: {
    large: {
      paddingVertical: DESIGN_TOKENS.spacing.lg,
      paddingHorizontal: DESIGN_TOKENS.spacing.xl,
      borderRadius: DESIGN_TOKENS.radius.md,
      minHeight: 56,
      fontSize: DESIGN_TOKENS.typography.lg,
    },
    medium: {
      paddingVertical: DESIGN_TOKENS.spacing.md,
      paddingHorizontal: DESIGN_TOKENS.spacing.lg,
      borderRadius: DESIGN_TOKENS.radius.md,
      minHeight: 48,
      fontSize: DESIGN_TOKENS.typography.base,
    },
    small: {
      paddingVertical: DESIGN_TOKENS.spacing.sm,
      paddingHorizontal: DESIGN_TOKENS.spacing.md,
      borderRadius: DESIGN_TOKENS.radius.sm,
      minHeight: 40,
      fontSize: DESIGN_TOKENS.typography.sm,
    },
  },
  
  /** Variantes de card */
  card: {
    default: {
      borderRadius: DESIGN_TOKENS.radius.lg,
      padding: DESIGN_TOKENS.spacing.lg,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    elevated: {
      borderRadius: DESIGN_TOKENS.radius.lg,
      padding: DESIGN_TOKENS.spacing.xl,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    flat: {
      borderRadius: DESIGN_TOKENS.radius.md,
      padding: DESIGN_TOKENS.spacing.md,
      borderWidth: 1,
      shadowOpacity: 0,
      elevation: 0,
    },
  },
  
  /** Variantes de input */
  input: {
    default: {
      borderRadius: DESIGN_TOKENS.radius.md,
      paddingHorizontal: DESIGN_TOKENS.spacing.md,
      paddingVertical: DESIGN_TOKENS.spacing.md,
      fontSize: DESIGN_TOKENS.typography.base,
      minHeight: 48,
      borderWidth: 1,
    },
    large: {
      borderRadius: DESIGN_TOKENS.radius.lg,
      paddingHorizontal: DESIGN_TOKENS.spacing.lg,
      paddingVertical: DESIGN_TOKENS.spacing.lg,
      fontSize: DESIGN_TOKENS.typography.lg,
      minHeight: 56,
      borderWidth: 1,
    },
    small: {
      borderRadius: DESIGN_TOKENS.radius.sm,
      paddingHorizontal: DESIGN_TOKENS.spacing.sm,
      paddingVertical: DESIGN_TOKENS.spacing.sm,
      fontSize: DESIGN_TOKENS.typography.sm,
      minHeight: 40,
      borderWidth: 1,
    },
  },
  
  /** Variantes de badge */
  badge: {
    small: {
      paddingHorizontal: DESIGN_TOKENS.spacing.sm,
      paddingVertical: DESIGN_TOKENS.spacing.xs,
      borderRadius: DESIGN_TOKENS.radius.full,
      fontSize: DESIGN_TOKENS.typography.xs,
    },
    medium: {
      paddingHorizontal: DESIGN_TOKENS.spacing.md,
      paddingVertical: DESIGN_TOKENS.spacing.sm,
      borderRadius: DESIGN_TOKENS.radius.full,
      fontSize: DESIGN_TOKENS.typography.sm,
    },
  },
} as const;

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Valida se um valor é um ID de cor de acento válido
 * 
 * @param value - Valor a validar
 * @returns true se é um AccentColorId válido ('purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red')
 * 
 * @example
 * if (isAccentColorId('purple')) {
 *   const colors = getColorTheme('purple', false);
 * }
 */
export function isAccentColorId(value: string): value is AccentColorId {
  return ACCENT_COLORS.some((item) => item.id === value);
}

/**
 * Retorna apenas os tokens de marca (primary e variações)
 * Para compatibilidade com código que só precisa de cores primárias
 * 
 * @param accentColor - ID da cor de marca escolhida
 * @param isDark - Se é modo escuro
 * @returns Objeto com primary, primaryDark, primaryLight, primaryLighter, primaryBackground
 * 
 * @example
 * const brand = getAccentTokens('blue', false);
 * <View style={{ backgroundColor: brand.primaryBackground }} />
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
 * @example
 * const colors = getColorTheme('purple', false);
 * <View style={{ backgroundColor: colors.surface, color: colors.text }} />
 */
export function getColorTheme(accentColor: AccentColorId, isDark: boolean): ColorTheme {
  const semanticColors = isDark ? SEMANTIC_COLORS_DARK : SEMANTIC_COLORS_LIGHT;
  const accentTokens = getAccentTokens(accentColor, isDark);
  
  return {
    ...semanticColors,
    ...accentTokens,
  };
}

