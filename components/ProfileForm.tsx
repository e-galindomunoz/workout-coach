import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  EMPTY_PROFILE_FORM,
  EXPERIENCE_LEVEL_OPTIONS,
  MAIN_GOAL_OPTIONS,
  PREFERRED_SPLIT_OPTIONS,
  formValuesToProfileInsert,
  profileToFormValues,
  validateProfileForm,
} from '../lib/profile';
import { HeightPickerField } from './HeightPickerField';
import { createProfile, updateProfile } from '../lib/supabase';
import type { Profile, ProfileFormValues } from '../types/supabase';

const PROFILE_SAVE_TIMEOUT_MS = 8000;

type ProfileFormProps = {
  initialProfile: Profile | null;
  mode: 'onboarding' | 'edit';
  onSaved: (profile: Profile) => Promise<void> | void;
};

const STEPS = [
  {
    title: 'Basics',
    description: 'Start with the core stats needed to personalize your plan.',
  },
  {
    title: 'Training',
    description: 'Tell the app how you like to train and how often.',
  },
  {
    title: 'Environment',
    description: 'Capture equipment, injuries, and cardio preferences.',
  },
  {
    title: 'Preferences',
    description: 'Add likes, dislikes, and any extra context.',
  },
] as const;

export function ProfileForm({
  initialProfile,
  mode,
  onSaved,
}: ProfileFormProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(profileToFormValues(initialProfile));
  }, [initialProfile]);

  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];
  const primaryButtonLabel = isLastStep
    ? mode === 'onboarding'
      ? 'Complete onboarding'
      : 'Save profile'
    : 'Continue';

  function updateField<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Profile save timed out. Please try again.')), timeoutMs);
      }),
    ]);
  }

  async function handleContinue() {
    setError(null);

    const validationError = validateProfileForm(values, step);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isLastStep) {
      setStep((current) => current + 1);
      return;
    }

    setSaving(true);
    try {
      const payload = formValuesToProfileInsert(values);

      const result = await withTimeout(
        initialProfile ? updateProfile(payload) : createProfile(payload),
        PROFILE_SAVE_TIMEOUT_MS,
      );

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setError('Profile save did not return any data. Please try again.');
        return;
      }

      await onSaved(result.data);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Something went wrong while saving your profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  const stepContent = useMemo(() => {
    switch (step) {
      case 0:
        return (
          <>
            <InputField
              label="Name"
              onChangeText={(value) => updateField('name', value)}
              placeholder="Your name"
              value={values.name}
            />
            <InputField
              keyboardType="number-pad"
              label="Age"
              onChangeText={(value) => updateField('age', value)}
              placeholder="28"
              value={values.age}
            />
            <HeightPickerField
              label="Height"
              onChange={(value) => updateField('height', value)}
              value={values.height}
            />
            <TwoColumnRow>
              <InputField
                keyboardType="decimal-pad"
                label="Current weight"
                onChangeText={(value) => updateField('currentWeight', value)}
                placeholder="185"
                value={values.currentWeight}
              />
              <InputField
                keyboardType="decimal-pad"
                label="Goal weight"
                onChangeText={(value) => updateField('goalWeight', value)}
                placeholder="170"
                value={values.goalWeight}
              />
            </TwoColumnRow>
          </>
        );
      case 1:
        return (
          <>
            <ChoiceGroup
              label="Main goal"
              onSelect={(value) => updateField('mainGoal', value)}
              options={MAIN_GOAL_OPTIONS}
              selectedValue={values.mainGoal}
            />
            <ChoiceGroup
              label="Experience level"
              onSelect={(value) => updateField('experienceLevel', value)}
              options={EXPERIENCE_LEVEL_OPTIONS}
              selectedValue={values.experienceLevel}
            />
            <TwoColumnRow>
              <InputField
                keyboardType="number-pad"
                label="Days per week"
                onChangeText={(value) => updateField('daysPerWeek', value)}
                placeholder="4"
                value={values.daysPerWeek}
              />
              <InputField
                keyboardType="number-pad"
                label="Workout length"
                onChangeText={(value) => updateField('workoutLength', value)}
                placeholder="60"
                value={values.workoutLength}
              />
            </TwoColumnRow>
            <ChoiceGroup
              label="Preferred split"
              onSelect={(value) => updateField('preferredSplit', value)}
              options={PREFERRED_SPLIT_OPTIONS}
              selectedValue={values.preferredSplit}
            />
          </>
        );
      case 2:
        return (
          <>
            <InputField
              label="Equipment available"
              onChangeText={(value) => updateField('equipment', value)}
              placeholder="Barbell, dumbbells, cables, treadmill"
              value={values.equipment}
            />
            <InputField
              label="Injuries or limitations"
              multiline
              onChangeText={(value) => updateField('injuries', value)}
              placeholder="Lower back sensitivity, limited overhead mobility"
              value={values.injuries}
            />
            <InputField
              label="Cardio preference"
              onChangeText={(value) => updateField('cardioPreference', value)}
              placeholder="Walking, cycling, rowing"
              value={values.cardioPreference}
            />
          </>
        );
      default:
        return (
          <>
            <InputField
              label="Exercises you like"
              multiline
              onChangeText={(value) => updateField('likedExercises', value)}
              placeholder="Squats, incline press, pull-ups"
              value={values.likedExercises}
            />
            <InputField
              label="Exercises you dislike"
              multiline
              onChangeText={(value) => updateField('dislikedExercises', value)}
              placeholder="Burpees, high-rep lunges"
              value={values.dislikedExercises}
            />
            <InputField
              label="Notes"
              multiline
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Anything else that should shape your training plan"
              value={values.notes}
            />
          </>
        );
    }
  }, [step, values]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressRow}>
          {STEPS.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.progressSegment,
                index <= step && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.stepEyebrow}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>

          <View style={styles.fields}>{stepContent}</View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setStep((current) => current - 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (saving || pressed) && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.primaryButton,
                (saving || pressed) && styles.buttonPressed,
                step === 0 && styles.primaryButtonFullWidth,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  label,
  multiline = false,
  ...props
}: {
  label: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor="#64748b"
        style={[styles.input, multiline && styles.inputMultiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

function ChoiceGroup({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map((option) => {
          const selected = option === selectedValue;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.choiceChip,
                selected && styles.choiceChipSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  selected && styles.choiceChipTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TwoColumnRow({ children }: { children: ReactNode }) {
  return <View style={styles.twoColumnRow}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  progressSegment: {
    backgroundColor: '#1e293b',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  progressSegmentActive: {
    backgroundColor: '#38bdf8',
  },
  panel: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 20,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  stepEyebrow: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  stepTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
  },
  stepDescription: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  fields: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 110,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipSelected: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  choiceChipText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  choiceChipTextSelected: {
    color: '#0f172a',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonFullWidth: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
