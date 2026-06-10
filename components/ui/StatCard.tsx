import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Card } from './Card';
import { colors, fontSizes, spacing } from '../../lib/theme';

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
    gap: spacing.sm,
  },
  label: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  valueAccent: {
    color: colors.accent,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
