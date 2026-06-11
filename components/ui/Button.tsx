import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'glass';

type ButtonProps = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  style,
  fullWidth,
}: ButtonProps) {
  const busy = disabled || loading;

  const resolvedSize = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        resolvedSize,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        variant === 'success' && styles.success,
        variant === 'glass' && styles.glass,
        variant === 'primary' && shadows.glow,
        variant === 'success' && shadows.glow,
        (pressed || busy) && styles.pressed,
        busy && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'success'
              ? colors.background
              : colors.text
          }
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          {label ? (
            <Text
              style={[
                styles.label,
                size === 'sm' && styles.labelSm,
                size === 'lg' && styles.labelLg,
                variant === 'primary' && styles.labelPrimary,
                variant === 'secondary' && styles.labelSecondary,
                variant === 'ghost' && styles.labelGhost,
                variant === 'danger' && styles.labelDanger,
                variant === 'success' && styles.labelSuccess,
                variant === 'glass' && styles.labelGlass,
                busy && styles.labelDisabled,
              ]}
            >
              {label}
            </Text>
          ) : null}
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  sizeSm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sizeMd: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sizeLg: {
    minHeight: 60,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  // Variants
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.35)',
    borderWidth: 1,
  },
  success: {
    backgroundColor: colors.success,
  },
  glass: {
    backgroundColor: colors.glassCard,
    borderColor: colors.accentBorder,
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.55,
  },

  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  iconLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  labelSm: {
    fontSize: fontSizes.sm,
  },
  labelLg: {
    fontSize: fontSizes.xl,
    letterSpacing: -0.3,
  },

  // Label colors per variant
  labelPrimary: {
    color: '#0B0F0A',
  },
  labelSecondary: {
    color: colors.text,
  },
  labelGhost: {
    color: colors.textMuted,
  },
  labelDanger: {
    color: colors.danger,
  },
  labelSuccess: {
    color: '#0B0F0A',
  },
  labelGlass: {
    color: colors.text,
  },
  labelDisabled: {
    opacity: 0.6,
  },
});
