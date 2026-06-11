import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../../lib/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  tight?: boolean;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onPressAction,
  tight = false,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, tight && styles.rowTight]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable
          onPress={onPressAction}
          style={({ pressed }) => [styles.actionWrap, pressed && styles.actionPressed]}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowTight: {
    marginBottom: spacing.xs,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  actionWrap: {
    paddingBottom: 2,
  },
  actionPressed: {
    opacity: 0.7,
  },
  action: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
});
