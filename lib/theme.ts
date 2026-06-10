import { StyleSheet } from 'react-native';

export const SCREEN_BOTTOM_PADDING = 32;

export const colors = {
  background: '#090B08',
  backgroundElevated: '#0C0F0A',
  surface: '#11160F',
  surfaceAlt: '#151A12',
  surfaceAccent: '#1A2214',
  surfaceCard: '#0E1209',
  surfaceInput: '#0A0E08',
  border: 'rgba(180, 200, 140, 0.14)',
  borderStrong: 'rgba(180, 200, 140, 0.24)',
  borderAccent: 'rgba(143, 175, 90, 0.30)',
  text: '#F4F1E8',
  textMuted: '#A8AA9B',
  textSoft: '#6F7467',
  accent: '#8FAF5A',
  accentStrong: '#A3BE62',
  accentPR: '#C7E86B',
  success: '#B7D66A',
  successSurface: '#141C0A',
  warning: '#D9A441',
  warningSurface: '#1C1508',
  danger: '#E06C75',
  dangerSurface: '#1F0C0E',
  pillBg: '#0F1409',
  glassBar: 'rgba(11, 14, 9, 0.96)',
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

export const shadows = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: '#8FAF5A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
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
});
