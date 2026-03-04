export type AccentColorId = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red';

export interface AccentColorOption {
  id: AccentColorId;
  name: string;
  color: string;
}

export const DEFAULT_ACCENT_COLOR: AccentColorId = 'purple';
export const ACCENT_STORAGE_KEY = '@accent_color';

export const ACCENT_COLORS: AccentColorOption[] = [
  { id: 'purple', name: 'Roxo', color: '#7C3AED' },
  { id: 'blue', name: 'Azul', color: '#3B82F6' },
  { id: 'green', name: 'Verde', color: '#10B981' },
  { id: 'orange', name: 'Laranja', color: '#F59E0B' },
  { id: 'pink', name: 'Rosa', color: '#EC4899' },
  { id: 'red', name: 'Vermelho', color: '#EF4444' },
];

type AccentTokens = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLighter: string;
  primaryBackground: string;
};

type AccentPalette = {
  light: AccentTokens;
  dark: AccentTokens;
};

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

export function isAccentColorId(value: string): value is AccentColorId {
  return ACCENT_COLORS.some((item) => item.id === value);
}

export function getAccentTokens(accentColor: AccentColorId, isDark: boolean): AccentTokens {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES[DEFAULT_ACCENT_COLOR];
  return isDark ? palette.dark : palette.light;
}
