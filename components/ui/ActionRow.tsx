import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../../lib/theme';

type ActionRowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  showChevron?: boolean;
};

export function ActionRow({
  title,
  subtitle,
  onPress,
  right,
  style,
  showChevron = false,
}: ActionRowProps) {
  const content = (
    <View style={[styles.row, style]}>
      <View style={styles.meta}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {showChevron && !right ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  chevron: {
    color: colors.textSoft,
    fontSize: 22,
    fontWeight: fontWeights.regular,
  },
  pressed: {
    opacity: 0.78,
  },
});
