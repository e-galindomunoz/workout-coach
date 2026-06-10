import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';

type InputProps = TextInputProps & {
  label: string;
  helperText?: string | null;
};

export function Input({ label, helperText, multiline = false, style, ...props }: InputProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.textSoft}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 96,
  },
  helperText: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
