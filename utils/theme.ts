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
    // Cores Primárias Ajustadas para Dark Mode
    primary: '#A78BFA',            // Violeta mais claro para melhor contraste
    primaryDark: '#8B5CF6',        // Violeta médio
    primaryLight: '#C4B5FD',       // Violeta suave
    primaryLighter: '#DDD6FE',     // Violeta muito claro
    
    // Cores Secundárias Ajustadas
    secondary: '#34D399',          // Verde esmeralda mais claro
    secondaryDark: '#10B981',
    secondaryLight: '#6EE7B7',
    
    // Cores de Status Ajustadas (mais vibrantes para contraste no escuro)
    success: '#4ADE80',            // Verde mais claro e vibrante
    successLight: '#86EFAC',
    successDark: '#22C55E',
    
    error: '#F87171',              // Vermelho mais claro
    errorLight: '#FCA5A5',
    errorDark: '#EF4444',
    
    warning: '#FBBF24',            // Amarelo/laranja mais claro
    warningLight: '#FCD34D',
    warningDark: '#F59E0B',
    
    info: '#60A5FA',               // Azul mais claro
    infoLight: '#93C5FD',
    infoDark: '#3B82F6',
    
    // Fundos - Material Design Dark Theme otimizado
    background: '#121212',         // Fundo principal (mais confortável que preto puro)
    backgroundSecondary: '#1E1E1E', // Cards e seções (melhor separação visual)
    surface: '#2A2A2C',            // Inputs, modais (contraste adequado)
    surfaceHighlight: '#3E3E40',   // Hover, selecionado (mais visível)
    
    // Textos - Otimizados para legibilidade no escuro
    text: '#F5F5F5',               // Texto principal (menos cansativo que branco puro)
    textSecondary: '#B3B3B3',      // Texto secundário (suavizado)
    textTertiary: '#8A8A8F',       // Texto terciário (contraste mantido)
    textDisabled: '#5A5A5F',       // Desabilitado (mais sutil)
    
    // Bordas e Separadores - Melhor visibilidade
    border: '#404040',             // Bordas principais (mais neutro)
    borderLight: '#2A2A2A',        // Bordas sutis (refinado)
    separator: '#3A3A3A',          // Separadores (entre border e borderLight)
    
    // Backgrounds de Status - Sutis para dark mode
    successBackground: 'rgba(74, 222, 128, 0.18)',    // Verde translúcido
    errorBackground: 'rgba(248, 113, 113, 0.18)',     // Vermelho translúcido
    warningBackground: 'rgba(251, 191, 36, 0.18)',    // Amarelo translúcido
    infoBackground: 'rgba(96, 165, 250, 0.18)',       // Azul translúcido
    primaryBackground: 'rgba(167, 139, 250, 0.18)',   // Roxo translúcido
    
    // Cores especiais
    white: '#FFFFFF',
    online: '#4ADE80',
    offline: '#6B7280',
    busy: '#FBBF24',
  },
  
  // Backgrounds de Status - Tema Claro
  successBackground: '#D1FAE5',    // Verde claro
  errorBackground: '#FEE2E2',      // Vermelho claro
  warningBackground: '#FEF3C7',    // Amarelo claro
  infoBackground: '#DBEAFE',       // Azul claro
  primaryBackground: '#F3E8FF',    // Roxo claro
  
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
