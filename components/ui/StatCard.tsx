import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Card } from './Card';
import { colors, fontSizes, fontWeights, spacing } from '../../lib/theme';

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatCard({ label, value, caption, accent = false, style }: StatCardProps) {
  return (
    <Card accent={accent} style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
  },
  label: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  valueAccent: {
    color: colors.accent,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginTop: 2,
  },
});
