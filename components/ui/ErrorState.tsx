import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';

type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
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
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.danger,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
});
