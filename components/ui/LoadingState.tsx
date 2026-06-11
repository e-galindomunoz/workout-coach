import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '../../lib/theme';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="small" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMed]} />
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonLine: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    height: 12,
    opacity: 0.7,
  },
  skeletonLineLong: {
    width: '80%',
  },
  skeletonLineMed: {
    width: '55%',
  },
  skeletonLineShort: {
    width: '35%',
  },
});
