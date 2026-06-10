import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatHeight, parseHeight } from '../lib/profile';

const FEET_OPTIONS = [3, 4, 5, 6, 7, 8];
const INCH_OPTIONS = Array.from({ length: 12 }, (_, index) => index);

type HeightPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function HeightPickerField({
  label,
  value,
  onChange,
}: HeightPickerFieldProps) {
  const parsedValue = parseHeight(value);
  const [open, setOpen] = useState(false);
  const [draftFeet, setDraftFeet] = useState(parsedValue.feet);
  const [draftInches, setDraftInches] = useState(parsedValue.inches);

  useEffect(() => {
    if (!open) {
      setDraftFeet(parsedValue.feet);
      setDraftInches(parsedValue.inches);
    }
  }, [open, parsedValue.feet, parsedValue.inches]);

  function handleCancel() {
    setDraftFeet(parsedValue.feet);
    setDraftInches(parsedValue.inches);
    setOpen(false);
  }

  function handleDone() {
    onChange(formatHeight(draftFeet, draftInches));
    setOpen(false);
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>

      <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText}>{formatHeight(parsedValue.feet, parsedValue.inches)}</Text>
      </Pressable>

      <Modal
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        transparent={false}
        visible={open}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Pressable hitSlop={8} onPress={handleCancel}>
              <Text style={styles.headerAction}>Cancel</Text>
            </Pressable>

            <Text style={styles.modalTitle}>Select height</Text>

            <Pressable hitSlop={8} onPress={handleDone}>
              <Text style={styles.headerAction}>Done</Text>
            </Pressable>
          </View>

          <Text style={styles.summaryText}>{formatHeight(draftFeet, draftInches)}</Text>

          <View style={styles.wheelsRow}>
            <View style={styles.wheelCard}>
              <Text style={styles.wheelLabel}>Feet</Text>
              <Picker
                itemStyle={styles.pickerItem}
                onValueChange={(value) => setDraftFeet(Number(value))}
                selectedValue={draftFeet}
              >
                {FEET_OPTIONS.map((option) => (
                  <Picker.Item key={option} label={`${option} ft`} value={option} />
                ))}
              </Picker>
            </View>

            <View style={styles.wheelCard}>
              <Text style={styles.wheelLabel}>Inches</Text>
              <Picker
                itemStyle={styles.pickerItem}
                onValueChange={(value) => setDraftInches(Number(value))}
                selectedValue={draftInches}
              >
                {INCH_OPTIONS.map((option) => (
                  <Picker.Item key={option} label={`${option} in`} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  trigger: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  modalScreen: {
    backgroundColor: '#0f172a',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerAction: {
    color: '#38bdf8',
    fontSize: 17,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  wheelsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  wheelCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    paddingTop: 12,
  },
  wheelLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  pickerItem: {
    color: '#f8fafc',
    fontSize: 22,
  },
});
