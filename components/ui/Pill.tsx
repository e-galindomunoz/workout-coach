import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';

type PillProps = {
  label: string;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'pr';
  style?: StyleProp<ViewStyle>;
};

export function Pill({ label, tone = 'default', style }: PillProps) {
  return (
    <View
      style={[
        styles.base,
        tone === 'accent' && styles.accent,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
        tone === 'danger' && styles.danger,
        tone === 'pr' && styles.pr,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === 'accent' && styles.labelAccent,
          tone === 'success' && styles.labelSuccess,
          tone === 'warning' && styles.labelWarning,
          tone === 'danger' && styles.labelDanger,
          tone === 'pr' && styles.labelPr,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pillBg,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  accent: {
    backgroundColor: 'rgba(143, 175, 90, 0.14)',
    borderColor: 'rgba(143, 175, 90, 0.32)',
  },
  success: {
    backgroundColor: colors.successSurface,
    borderColor: 'rgba(183, 214, 106, 0.30)',
  },
  warning: {
    backgroundColor: colors.warningSurface,
    borderColor: 'rgba(217, 164, 65, 0.30)',
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.30)',
  },
  pr: {
    backgroundColor: 'rgba(199, 232, 107, 0.12)',
    borderColor: 'rgba(199, 232, 107, 0.40)',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  labelAccent: {
    color: colors.accent,
  },
  labelSuccess: {
    color: colors.success,
  },
  labelWarning: {
    color: colors.warning,
  },
  labelDanger: {
    color: colors.danger,
  },
  labelPr: {
    color: colors.accentPR,
  },
});
