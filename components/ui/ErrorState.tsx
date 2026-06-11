import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Error</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.28)',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.danger,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  retryButton: {
    borderColor: 'rgba(224, 108, 117, 0.40)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  retryPressed: {
    opacity: 0.72,
  },
  retryLabel: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
  },
});
