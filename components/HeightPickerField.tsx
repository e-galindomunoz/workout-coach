import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatHeight, parseHeight } from '../lib/profile';
import { colors, fontSizes, fontWeights, radius, spacing } from '../lib/theme';

const FEET_OPTIONS = [3, 4, 5, 6, 7, 8];
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

type HeightPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function HeightPickerField({ label, value, onChange }: HeightPickerFieldProps) {
  const insets = useSafeAreaInsets();
  const parsedValue = parseHeight(value);
  const [open, setOpen] = useState(false);
  const [draftFeet, setDraftFeet] = useState(parsedValue.feet);
  const [draftInches, setDraftInches] = useState(parsedValue.inches);

  function handleOpen() {
    setDraftFeet(parsedValue.feet);
    setDraftInches(parsedValue.inches);
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleDone() {
    onChange(formatHeight(draftFeet, draftInches));
    setOpen(false);
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Text style={styles.triggerText}>
          {formatHeight(parsedValue.feet, parsedValue.inches)}
        </Text>
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={open}
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        {/* Outer Pressable = backdrop dismiss */}
        <Pressable
          style={styles.overlay}
          onPress={handleCancel}
        >
          {/* Inner Pressable = sheet; stops touch from reaching backdrop */}
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={() => { /* noop – prevents backdrop dismiss when tapping sheet */ }}
          >
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Pressable hitSlop={12} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Height</Text>
              <Pressable hitSlop={12} onPress={handleDone}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>

            <Text style={styles.preview}>{formatHeight(draftFeet, draftInches)}</Text>

            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.colLabel}>Feet</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.colScroll}
                  contentContainerStyle={styles.colContent}
                  bounces={Platform.OS !== 'web'}
                >
                  {FEET_OPTIONS.map((ft) => (
                    <Pressable
                      key={ft}
                      onPress={() => setDraftFeet(ft)}
                      style={[styles.optionRow, draftFeet === ft && styles.optionRowSelected]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          draftFeet === ft && styles.optionTextSelected,
                        ]}
                      >
                        {ft} ft
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.colDivider} />

              <View style={styles.column}>
                <Text style={styles.colLabel}>Inches</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.colScroll}
                  contentContainerStyle={styles.colContent}
                  bounces={Platform.OS !== 'web'}
                >
                  {INCH_OPTIONS.map((inch) => (
                    <Pressable
                      key={inch}
                      onPress={() => setDraftInches(inch)}
                      style={[styles.optionRow, draftInches === inch && styles.optionRowSelected]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          draftInches === inch && styles.optionTextSelected,
                        ]}
                      >
                        {inch} in
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.2,
  },
  trigger: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  triggerPressed: {
    opacity: 0.72,
  },
  triggerText: {
    color: colors.text,
    fontSize: fontSizes.lg,
  },

  // Modal overlay
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Bottom sheet
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  doneText: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
  preview: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Two-column option lists
  columns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  column: {
    flex: 1,
  },
  colLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  colScroll: {
    maxHeight: 264,
  },
  colContent: {
    gap: 4,
    paddingBottom: spacing.xs,
  },
  colDivider: {
    backgroundColor: colors.borderStrong,
    marginTop: 26,
    width: 1,
  },
  optionRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accentBorder,
    borderWidth: 1,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.accent,
  },
});
