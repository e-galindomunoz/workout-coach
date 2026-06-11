import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadows } from '../../lib/theme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  variant = 'secondary',
  size = 40,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height: size, width: size, borderRadius: size / 2 },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        variant === 'primary' && shadows.glow,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  pressed: {
    opacity: 0.72,
  },
});
