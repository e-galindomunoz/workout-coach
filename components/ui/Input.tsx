import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';

type InputProps = TextInputProps & {
  label: string;
  helperText?: string | null;
  error?: boolean;
};

export function Input({ label, helperText, multiline = false, style, error = false, ...props }: InputProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.textSoft}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
          style,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {helperText ? (
        <Text style={[styles.helperText, error && styles.helperError]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 96,
  },
  inputError: {
    borderColor: 'rgba(224, 108, 117, 0.55)',
  },
  helperText: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  helperError: {
    color: colors.danger,
  },
});
