import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';

type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'pr';

type BadgeProps = {
  label: string | number;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'default' }: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        tone === 'accent' && styles.accent,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
        tone === 'danger' && styles.danger,
        tone === 'pr' && styles.pr,
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
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 22,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  accent: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accentBorder,
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
    backgroundColor: 'rgba(199, 232, 107, 0.10)',
    borderColor: 'rgba(199, 232, 107, 0.42)',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    textAlign: 'center',
  },
  labelAccent: { color: colors.accent },
  labelSuccess: { color: colors.success },
  labelWarning: { color: colors.warning },
  labelDanger: { color: colors.danger },
  labelPr: { color: colors.accentPR },
});
