import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import {
  addExerciseLogs,
  createWorkoutSession,
  finishWorkoutSession,
  getExerciseCatalog,
  upsertExerciseToCatalog,
} from '../../lib/supabase';
import {
  calculateDurationMinutes,
  createEmptyExercise,
  createEmptySet,
  createEmptyWorkout,
  getExerciseSuggestions,
} from '../../lib/workouts';
import type { ActiveExercise, ActiveSet, ActiveWorkout, ExerciseCatalogItem } from '../../types/supabase';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [workout, setWorkout] = useState<ActiveWorkout>(createEmptyWorkout());
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      setCatalogLoading(true);
      const result = await getExerciseCatalog();
      setCatalogLoading(false);

      if (result.error) {
        setCatalogError(result.error.message);
        setCatalog([]);
        return;
      }

      setCatalogError(null);
      setCatalog(result.data ?? []);
    }

    void loadCatalog();
  }, []);

  const suggestions = useMemo(
    () => getExerciseSuggestions(newExerciseName, catalog, workout.exercises).slice(0, 8),
    [catalog, newExerciseName, workout.exercises],
  );

  function updateWorkout<K extends keyof ActiveWorkout>(key: K, value: ActiveWorkout[K]) {
    setWorkout((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateExercise(exerciseId: string, updater: (exercise: ActiveExercise) => ActiveExercise) {
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? updater(exercise) : exercise,
      ),
    }));
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    updater: (set: ActiveSet) => ActiveSet,
  ) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? updater(set) : set)),
    }));
  }

  function addExerciseFromInput() {
    const name = newExerciseName.trim();
    if (!name) {
      setError('Exercise name is required.');
      return;
    }

    setWorkout((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        createEmptyExercise({
          exerciseName: name,
          muscleGroup: newExerciseMuscleGroup.trim(),
        }),
      ],
    }));

    setNewExerciseName('');
    setNewExerciseMuscleGroup('');
    setError(null);
  }

  function addExerciseFromCatalog(item: ExerciseCatalogItem) {
    setWorkout((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        createEmptyExercise({
          exerciseName: item.name,
          muscleGroup: item.muscle_group ?? '',
          notes: item.notes ?? '',
        }),
      ],
    }));
    setNewExerciseName('');
    setNewExerciseMuscleGroup('');
    setError(null);
  }

  function confirmDiscard() {
    Alert.alert('Discard workout?', 'Your unsaved workout will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function handleFinishWorkout() {
    setError(null);

    if (!workout.title.trim()) {
      setError('Workout title is required.');
      return;
    }

    if (workout.exercises.length === 0) {
      setError('Add at least one exercise before finishing.');
      return;
    }

    for (const exercise of workout.exercises) {
      if (!exercise.exerciseName.trim()) {
        setError('Each exercise needs a name.');
        return;
      }

      if (exercise.sets.length === 0) {
        setError(`Add at least one set for ${exercise.exerciseName}.`);
        return;
      }

      for (const set of exercise.sets) {
        if (!set.weight.trim() && !set.reps.trim() && !set.rpe.trim() && !set.notes.trim()) {
          setError(`Fill in something for each set in ${exercise.exerciseName}, or remove the empty set.`);
          return;
        }

        if (set.weight.trim() && !(Number(set.weight) >= 0)) {
          setError(`Weight must be zero or more for ${exercise.exerciseName}.`);
          return;
        }

        if (set.reps.trim() && !(Number(set.reps) > 0)) {
          setError(`Reps must be a positive number for ${exercise.exerciseName}.`);
          return;
        }

        if (set.rpe.trim()) {
          const rpe = Number(set.rpe);
          if (!(rpe >= 0 && rpe <= 10)) {
            setError(`RPE must be between 0 and 10 for ${exercise.exerciseName}.`);
            return;
          }
        }
      }
    }

    setSaving(true);

    const createdSession = await createWorkoutSession({
      title: workout.title.trim(),
      workoutType: workout.workoutType.trim() || null,
      startedAt: workout.startedAt,
      notes: workout.notes.trim() || null,
    });

    if (createdSession.error || !createdSession.data) {
      setSaving(false);
      setError(createdSession.error?.message ?? 'Could not create workout session.');
      return;
    }

    const completedAt = new Date().toISOString();
    const durationMinutes = calculateDurationMinutes(workout.startedAt, completedAt);

    const logPayload = workout.exercises.flatMap((exercise) =>
      exercise.sets.map((set, index) => ({
        exerciseName: exercise.exerciseName.trim(),
        muscleGroup: exercise.muscleGroup.trim() || null,
        setNumber: index + 1,
        weight: set.weight.trim() ? Number(set.weight) : null,
        reps: set.reps.trim() ? Number(set.reps) : null,
        rpe: set.rpe.trim() ? Number(set.rpe) : null,
        notes: [exercise.notes.trim(), set.notes.trim()].filter(Boolean).join(' | ') || null,
        painFlag: set.painFlag,
      })),
    );

    const logsResult = await addExerciseLogs(createdSession.data.id, logPayload);

    if (logsResult.error) {
      setSaving(false);
      setError(logsResult.error.message);
      return;
    }

    for (const exercise of workout.exercises) {
      await upsertExerciseToCatalog({
        name: exercise.exerciseName.trim(),
        muscleGroup: exercise.muscleGroup.trim() || null,
        notes: exercise.notes.trim() || null,
      });
    }

    const finishedSession = await finishWorkoutSession({
      id: createdSession.data.id,
      completedAt,
      durationMinutes,
      notes: workout.notes.trim() || null,
    });

    setSaving(false);

    if (finishedSession.error) {
      setError(finishedSession.error.message);
      return;
    }

    router.replace(`/workout/${createdSession.data.id}`);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Start Workout',
          gestureEnabled: false,
          headerLeft: () => (
            <Pressable onPress={confirmDiscard}>
              <Text style={styles.headerLink}>Discard</Text>
            </Pressable>
          ),
        }}
      />
      <AppScreen
        title="Start Workout"
        description="Build a workout, log each set, then save everything at the end."
        fillContent
        scrollEnabled={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Card title="Workout details">
              <InputField
                label="Workout title"
                onChangeText={(value) => updateWorkout('title', value)}
                placeholder="Upper Body Strength"
                value={workout.title}
              />
              <InputField
                label="Workout type (optional)"
                onChangeText={(value) => updateWorkout('workoutType', value)}
                placeholder="Strength, hypertrophy, conditioning"
                value={workout.workoutType}
              />
              <InputField
                label="Workout notes (optional)"
                multiline
                onChangeText={(value) => updateWorkout('notes', value)}
                placeholder="How you felt, training focus, constraints"
                value={workout.notes}
              />
            </Card>

            <Card title="Add exercise">
              <InputField
                label="Exercise name"
                onChangeText={setNewExerciseName}
                placeholder="Bench Press"
                value={newExerciseName}
              />
              <InputField
                label="Muscle group (optional)"
                onChangeText={setNewExerciseMuscleGroup}
                placeholder="Chest"
                value={newExerciseMuscleGroup}
              />
              <Pressable
                accessibilityRole="button"
                onPress={addExerciseFromInput}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Add Exercise</Text>
              </Pressable>

              <Text style={styles.sectionHint}>Previous exercises</Text>
              {catalogLoading ? (
                <ActivityIndicator color="#38bdf8" />
              ) : catalogError ? (
                <Text style={styles.errorText}>{catalogError}</Text>
              ) : suggestions.length === 0 ? (
                <Text style={styles.emptyText}>No matching exercises yet.</Text>
              ) : (
                <View style={styles.suggestionWrap}>
                  {suggestions.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => addExerciseFromCatalog(item)}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>

            <Card title="Exercises">
              {workout.exercises.length === 0 ? (
                <Text style={styles.emptyText}>No exercises added yet.</Text>
              ) : (
                workout.exercises.map((exercise, exerciseIndex) => (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseTitle}>
                        {exercise.exerciseName || `Exercise ${exerciseIndex + 1}`}
                      </Text>
                      <Pressable
                        onPress={() =>
                          updateWorkout(
                            'exercises',
                            workout.exercises.filter((item) => item.id !== exercise.id),
                          )
                        }
                      >
                        <Text style={styles.removeLink}>Remove</Text>
                      </Pressable>
                    </View>

                    <InputField
                      label="Exercise name"
                      onChangeText={(value) =>
                        updateExercise(exercise.id, (current) => ({
                          ...current,
                          exerciseName: value,
                        }))
                      }
                      placeholder="Exercise name"
                      value={exercise.exerciseName}
                    />
                    <InputField
                      label="Muscle group (optional)"
                      onChangeText={(value) =>
                        updateExercise(exercise.id, (current) => ({
                          ...current,
                          muscleGroup: value,
                        }))
                      }
                      placeholder="Back"
                      value={exercise.muscleGroup}
                    />
                    <InputField
                      label="Exercise notes (optional)"
                      multiline
                      onChangeText={(value) =>
                        updateExercise(exercise.id, (current) => ({
                          ...current,
                          notes: value,
                        }))
                      }
                      placeholder="Tempo, setup, attachments"
                      value={exercise.notes}
                    />

                    {exercise.sets.map((set, setIndex) => (
                      <View key={set.id} style={styles.setCard}>
                        <View style={styles.setHeader}>
                          <Text style={styles.setTitle}>Set {setIndex + 1}</Text>
                          <View style={styles.rowActions}>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, (current) => {
                                  const currentSet = current.sets.find((item) => item.id === set.id);
                                  if (!currentSet) {
                                    return current;
                                  }

                                  return {
                                    ...current,
                                    sets: [
                                      ...current.sets,
                                      {
                                        ...currentSet,
                                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                      },
                                    ],
                                  };
                                })
                              }
                            >
                              <Text style={styles.inlineLink}>Duplicate</Text>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, (current) => ({
                                  ...current,
                                  sets:
                                    current.sets.length === 1
                                      ? current.sets
                                      : current.sets.filter((item) => item.id !== set.id),
                                }))
                              }
                            >
                              <Text style={styles.inlineDangerLink}>Remove</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.twoColumnRow}>
                          <InputField
                            keyboardType="decimal-pad"
                            label="Weight"
                            onChangeText={(value) =>
                              updateSet(exercise.id, set.id, (current) => ({
                                ...current,
                                weight: value,
                              }))
                            }
                            placeholder="135"
                            value={set.weight}
                          />
                          <InputField
                            keyboardType="number-pad"
                            label="Reps"
                            onChangeText={(value) =>
                              updateSet(exercise.id, set.id, (current) => ({
                                ...current,
                                reps: value,
                              }))
                            }
                            placeholder="8"
                            value={set.reps}
                          />
                        </View>

                        <View style={styles.twoColumnRow}>
                          <InputField
                            keyboardType="decimal-pad"
                            label="RPE (optional)"
                            onChangeText={(value) =>
                              updateSet(exercise.id, set.id, (current) => ({
                                ...current,
                                rpe: value,
                              }))
                            }
                            placeholder="8.5"
                            value={set.rpe}
                          />
                          <View style={styles.switchCard}>
                            <Text style={styles.label}>Pain / discomfort</Text>
                            <Switch
                              onValueChange={(value) =>
                                updateSet(exercise.id, set.id, (current) => ({
                                  ...current,
                                  painFlag: value,
                                }))
                              }
                              value={set.painFlag}
                            />
                          </View>
                        </View>

                        <InputField
                          label="Set notes (optional)"
                          multiline
                          onChangeText={(value) =>
                            updateSet(exercise.id, set.id, (current) => ({
                              ...current,
                              notes: value,
                            }))
                          }
                          placeholder="Last rep slowed, switched grip, etc."
                          value={set.notes}
                        />
                      </View>
                    ))}

                    <Pressable
                      onPress={() =>
                        updateExercise(exercise.id, (current) => ({
                          ...current,
                          sets: [...current.sets, createEmptySet()],
                        }))
                      }
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.secondaryButtonText}>Add Set</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void handleFinishWorkout()}
              style={({ pressed }) => [
                styles.finishButton,
                (saving || pressed) && styles.buttonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.finishButtonText}>Finish Workout</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppScreen>
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: import('react').ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardContent}>{children}</View>
    </View>
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
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerLink: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  cardContent: {
    gap: 14,
  },
  fieldGroup: {
    flex: 1,
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
    minHeight: 90,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  finishButtonText: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHint: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: '#0b1220',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  removeLink: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '700',
  },
  setCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  setHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineLink: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineDangerLink: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchCard: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
});
