import { StyleSheet } from 'react-native';

export const SCREEN_BOTTOM_PADDING = 32;

export const colors = {
  // Backgrounds
  background: '#090B08',
  backgroundElevated: '#0C0F0A',
  surface: '#11160F',
  surfaceAlt: '#151A12',
  surfaceAccent: '#1A2214',
  surfaceCard: '#0E1209',
  surfaceInput: '#0A0E08',

  // Borders
  border: 'rgba(180, 200, 140, 0.14)',
  borderStrong: 'rgba(180, 200, 140, 0.24)',
  borderAccent: 'rgba(163, 190, 98, 0.30)',

  // Text
  text: '#F4F1E8',
  textMuted: '#A8AA9B',
  textSoft: '#6F7467',

  // Olive / lime accents
  accent: '#A3BE62',
  accentStrong: '#B5D165',
  accentPR: '#C7E86B',
  accentDim: 'rgba(163, 190, 98, 0.14)',
  accentBorder: 'rgba(163, 190, 98, 0.28)',

  // Semantic
  success: '#B7D66A',
  successSurface: '#141C0A',
  warning: '#D9A441',
  warningSurface: '#1C1508',
  danger: '#E06C75',
  dangerSurface: '#1F0C0E',

  // Chrome
  pillBg: '#0F1409',
  glassBar: 'rgba(9, 11, 8, 0.97)',
  glassCard: 'rgba(30, 38, 24, 0.72)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 38,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: '#A3BE62',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 4,
  },
  glowStrong: {
    shadowColor: '#A3BE62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 6,
  },
});

export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.surfaceAlt,
  },
  accent: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
  },
  glass: {
    backgroundColor: colors.glassCard,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
});
