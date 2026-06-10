import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../lib/theme';

type ProgressBarProps = {
  value: number;
  accent?: boolean;
};

export function ProgressBar({ value, accent = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          accent && styles.fillAccent,
          { width: `${clamped}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(143, 175, 90, 0.10)',
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: '100%',
  },
  fillAccent: {
    backgroundColor: colors.accentPR,
  },
});
