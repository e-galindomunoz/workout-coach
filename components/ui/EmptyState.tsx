import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: string;
  onPressAction?: () => void;
  icon?: string;
};

export function EmptyState({ title, description, action, onPressAction, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && onPressAction ? (
        <Pressable
          onPress={onPressAction}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionLabel}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing.xs,
    opacity: 0.6,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
  },
});
