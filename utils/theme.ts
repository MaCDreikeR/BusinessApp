/**
 * Sistema de Design - BusinessApp
 * 
 * Centraliza cores, espaçamentos, tamanhos de fonte e outros tokens de design.
 * Facilita manutenção e garante consistência visual.
 * 
 * Uso:
 * import { theme } from '@utils/theme';
 * <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.primary }} />
 */

// ============================================================================
// CORES
// ============================================================================

export const colors = {
  // Cores Primárias - Roxo/Violeta (marca BusinessApp)
  primary: '#7C3AED',           // Violeta 600
  primaryDark: '#6D28D9',       // Violeta 700
  primaryLight: '#A855F7',      // Violeta 500
  primaryLighter: '#C084FC',    // Violeta 400
  
  // Cores Secundárias
  secondary: '#10B981',         // Verde Esmeralda
  secondaryDark: '#059669',
  secondaryLight: '#34D399',
  
  // Cores de Sucesso/Erro/Aviso
  success: '#34C759',
  successLight: '#8AFFB0',
  successDark: '#248A3D',
  
  error: '#FF3B30',
  errorLight: '#FF6961',
  errorDark: '#C41E17',
  
  warning: '#FF9500',
  warningLight: '#FFB340',
  warningDark: '#C77700',
  
  info: '#5AC8FA',
  infoLight: '#8FD9FF',
  infoDark: '#2B9BD6',
  
  // Cores Neutras (Tema Claro)
  white: '#FFFFFF',
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Textos
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textDisabled: '#C7C7CC',
  
  // Bordas e Separadores
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  separator: '#D1D1D6',
  
  // Cores Neutras (Tema Escuro)
  dark: {
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    surface: '#2C2C2E',
    
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
    textDisabled: '#545458',
    
    border: '#38383A',
    borderLight: '#48484A',
    separator: '#545458',
  },
  
  // Cores de Status
  online: '#34C759',
  offline: '#8E8E93',
  busy: '#FF9500',
  
  // Cores Especiais
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
  
  // Cores de Destaque
  highlight: '#FFCC00',
  highlightLight: '#FFEB3B',
  
  // Cores de Link
  link: '#007AFF',
  linkVisited: '#5856D6',
};

// ============================================================================
// ESPAÇAMENTOS
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Espaçamentos específicos
  screenPadding: 16,
  cardPadding: 16,
  sectionSpacing: 24,
  buttonPadding: 12,
  inputPadding: 12,
};

// ============================================================================
// TIPOGRAFIA
// ============================================================================

export const typography = {
  // Tamanhos de Fonte
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 28,
    hero: 40,
  },
  
  // Pesos de Fonte
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  
  // Alturas de Linha
  lineHeight: {
    tight: 1.2,
    base: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  
  // Famílias de Fonte (iOS padrão)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
};

// ============================================================================
// BORDAS E RAIOS
// ============================================================================

export const borders = {
  // Raios de Borda
  radius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  // Larguras de Borda
  width: {
    thin: 0.5,
    base: 1,
    thick: 2,
    thicker: 3,
  },
};

// ============================================================================
// SOMBRAS
// ============================================================================

export const shadows = {
  // Sombras para iOS
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  base: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  xl: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.43,
    shadowRadius: 11.14,
    elevation: 16,
  },
};

// ============================================================================
// DIMENSÕES
// ============================================================================

export const dimensions = {
  // Tamanhos de Ícones
  icon: {
    xs: 12,
    sm: 16,
    base: 20,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },
  
  // Tamanhos de Avatar
  avatar: {
    sm: 32,
    base: 40,
    md: 48,
    lg: 64,
    xl: 80,
  },
  
  // Tamanhos de Botão
  button: {
    sm: 32,
    base: 44,
    lg: 56,
  },
  
  // Tamanhos de Input
  input: {
    sm: 36,
    base: 44,
    lg: 52,
  },
  
  // Larguras de Cartão
  card: {
    sm: 150,
    base: 200,
    lg: 300,
  },
  
  // Alturas Fixas
  header: 56,
  tabBar: 60,
  statusBar: 44,
};

// ============================================================================
// ANIMAÇÕES
// ============================================================================

export const animations = {
  // Durações
  duration: {
    fast: 150,
    base: 250,
    slow: 350,
    slower: 500,
  },
  
  // Curvas de Easing
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================================================
// OPACIDADES
// ============================================================================

export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  pressed: 0.6,
  overlay: 0.5,
  subtle: 0.7,
};

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
};

// ============================================================================
// COMPONENTES PRÉ-DEFINIDOS
// ============================================================================

export const components = {
  // Estilos de Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borders.radius.md,
    padding: spacing.cardPadding,
    ...shadows.base,
  },
  
  // Estilos de Botão
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borders.radius.base,
      paddingVertical: spacing.buttonPadding,
      paddingHorizontal: spacing.md,
      height: dimensions.button.base,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderRadius: borders.radius.base,
      paddingVertical: spacing.buttonPadding,
      paddingHorizontal: spacing.md,
      height: dimensions.button.base,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: borders.width.base,
      borderColor: colors.primary,
      borderRadius: borders.radius.base,
      paddingVertical: spacing.buttonPadding,
      paddingHorizontal: spacing.md,
      height: dimensions.button.base,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: borders.radius.base,
      paddingVertical: spacing.buttonPadding,
      paddingHorizontal: spacing.md,
      height: dimensions.button.base,
    },
  },
  
  // Estilos de Input
  input: {
    base: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: borders.width.base,
      borderColor: colors.border,
      borderRadius: borders.radius.base,
      paddingHorizontal: spacing.inputPadding,
      height: dimensions.input.base,
      fontSize: typography.fontSize.base,
      color: colors.text,
    },
    focused: {
      borderColor: colors.primary,
      borderWidth: borders.width.thick,
    },
    error: {
      borderColor: colors.error,
      borderWidth: borders.width.thick,
    },
  },
  
  // Estilos de Badge
  badge: {
    base: {
      backgroundColor: colors.primary,
      borderRadius: borders.radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minWidth: 20,
      height: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    success: {
      backgroundColor: colors.success,
    },
    error: {
      backgroundColor: colors.error,
    },
    warning: {
      backgroundColor: colors.warning,
    },
  },
};

// ============================================================================
// TEMA COMPLETO (Export Principal)
// ============================================================================

export const theme = {
  colors,
  spacing,
  typography,
  borders,
  shadows,
  dimensions,
  animations,
  opacity,
  zIndex,
  components,
};

// Export default para facilitar import
export default theme;
