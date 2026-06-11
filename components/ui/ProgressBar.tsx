import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../../lib/theme';

type ProgressBarProps = {
  value: number;
  tone?: 'accent' | 'pr' | 'success' | 'warning' | 'danger';
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({ value, tone = 'accent', height = 6, style }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const fillColor =
    tone === 'pr'
      ? colors.accentPR
      : tone === 'success'
      ? colors.success
      : tone === 'warning'
      ? colors.warning
      : tone === 'danger'
      ? colors.danger
      : colors.accent;

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            height,
            width: `${clampedValue}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(163, 190, 98, 0.10)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
