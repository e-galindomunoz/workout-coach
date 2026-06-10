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
  View,
} from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { MuscleGroup, PresetExercise } from '../../lib/exerciseLibrary';
import { MUSCLE_GROUPS, PRESET_BY_NAME, searchPresets } from '../../lib/exerciseLibrary';
import { getExercisePersonalBest, getProgressionRecommendation } from '../../lib/progression';
import {
  addExerciseLogs,
  createWorkoutSession,
  finishWorkoutSession,
  getExerciseCatalog,
  getExerciseHistory,
  upsertExerciseToCatalog,
} from '../../lib/supabase';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';
import {
  calculateDurationMinutes,
  createEmptyExercise,
  createEmptySet,
  createEmptyWorkout,
  getExerciseSuggestions,
} from '../../lib/workouts';
import type {
  ActiveExercise,
  ActiveSet,
  ActiveWorkout,
  ExerciseCatalogItem,
  ExerciseLog,
  PersonalBestSummary,
  ProgressionRecommendation,
} from '../../types/supabase';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [workout, setWorkout] = useState<ActiveWorkout>(createEmptyWorkout());
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [historyByExercise, setHistoryByExercise] = useState<Record<string, ExerciseLog[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState<MuscleGroup | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
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

  useEffect(() => {
    const names = Array.from(
      new Set(
        workout.exercises
          .map((exercise) => exercise.exerciseName.trim())
          .filter(Boolean),
      ),
    );

    names.forEach((name) => {
      const key = normalizeExerciseName(name);

      if (historyByExercise[key] || historyLoading[key]) {
        return;
      }

      setHistoryLoading((current) => ({
        ...current,
        [key]: true,
      }));

      void getExerciseHistory(name, 40).then((result) => {
        setHistoryLoading((current) => ({
          ...current,
          [key]: false,
        }));

        if (result.error) {
          return;
        }

        setHistoryByExercise((current) => ({
          ...current,
          [key]: result.data ?? [],
        }));
      });
    });
  }, [historyByExercise, historyLoading, workout.exercises]);

  const catalogSuggestions = useMemo(
    () => getExerciseSuggestions(exerciseSearch, catalog, workout.exercises).slice(0, 8),
    [catalog, exerciseSearch, workout.exercises],
  );

  const filteredPresets = useMemo(() => {
    const activeNames = new Set(
      workout.exercises.map((e) => e.exerciseName.trim().toLowerCase()),
    );
    return searchPresets(exerciseSearch, exerciseFilter).filter(
      (p) => !activeNames.has(p.name.toLowerCase()),
    );
  }, [exerciseSearch, exerciseFilter, workout.exercises]);

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
    setShowCustomInput(false);
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
    setExerciseSearch('');
    setError(null);
  }

  function addExerciseFromPreset(preset: PresetExercise) {
    setWorkout((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        createEmptyExercise({
          exerciseName: preset.name,
          muscleGroup: preset.muscleGroup,
        }),
      ],
    }));
    setExerciseSearch('');
    setExerciseFilter(null);
    setError(null);
  }

  function applyRecommendation(
    exerciseId: string,
    recommendation: ProgressionRecommendation,
  ) {
    updateExercise(exerciseId, (current) => {
      const firstSet = current.sets[0];

      if (!firstSet) {
        return current;
      }

      const targetReps = recommendation.recommendedRepTarget.split('-')[0]?.trim() ?? '';

      return {
        ...current,
        sets: current.sets.map((set, index) =>
          index === 0
            ? {
                ...set,
                weight:
                  recommendation.recommendedNextWeight !== null
                    ? String(recommendation.recommendedNextWeight)
                    : set.weight,
                reps: targetReps || set.reps,
              }
            : set,
        ),
      };
    });
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
          setError(`Fill in at least one field for each set in ${exercise.exerciseName}, or remove the empty set.`);
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
        }}
      />
      <AppScreen
        title="Start Workout"
        description="Log your session, use history to guide your sets, then save when done."
        fillContent
        scrollEnabled={false}
        headerAccessory={<Button label="Discard" onPress={confirmDiscard} variant="ghost" />}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Card accent>
              <SectionHeader title="Workout details" subtitle="Name and context for today's session." />
              <Input
                label="Workout title"
                onChangeText={(value) => updateWorkout('title', value)}
                placeholder="Upper Body Strength"
                value={workout.title}
              />
              <Input
                label="Type (optional)"
                onChangeText={(value) => updateWorkout('workoutType', value)}
                placeholder="Strength, hypertrophy, conditioning"
                value={workout.workoutType}
              />
              <Input
                label="Notes (optional)"
                multiline
                onChangeText={(value) => updateWorkout('notes', value)}
                placeholder="How you're feeling, focus for today"
                value={workout.notes}
              />
            </Card>

            <Card>
              <SectionHeader title="Add exercise" subtitle="Filter by muscle group or search." />

              <Input
                label="Search exercises"
                onChangeText={setExerciseSearch}
                placeholder="Bench press, deadlift, curls..."
                value={exerciseSearch}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {(['All', ...MUSCLE_GROUPS] as const).map((group) => {
                  const active = group === 'All' ? exerciseFilter === null : exerciseFilter === group;
                  return (
                    <Pressable
                      key={group}
                      onPress={() => setExerciseFilter(group === 'All' ? null : (group as MuscleGroup))}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                        {group}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionHint}>Exercise library</Text>
              {filteredPresets.length === 0 ? (
                <Text style={styles.emptyText}>No exercises match.</Text>
              ) : (
                <>
                  {(exerciseSearch || exerciseFilter
                    ? filteredPresets
                    : filteredPresets.slice(0, 12)
                  ).map((preset) => (
                    <Pressable
                      key={preset.name}
                      onPress={() => addExerciseFromPreset(preset)}
                      style={({ pressed }) => [styles.presetRow, pressed && styles.buttonPressed]}
                    >
                      <View style={styles.presetRowInfo}>
                        <Text style={styles.presetName}>{preset.name}</Text>
                        <Text style={styles.presetMuscles}>{preset.primaryMuscles.join(' · ')}</Text>
                      </View>
                      <View style={styles.presetBadge}>
                        <Text style={styles.presetBadgeText}>{preset.sets} × {preset.reps}</Text>
                      </View>
                    </Pressable>
                  ))}
                  {!exerciseSearch && !exerciseFilter && filteredPresets.length > 12 && (
                    <Text style={styles.presetMuscles}>
                      Filter by muscle group to see all {filteredPresets.length} exercises.
                    </Text>
                  )}
                </>
              )}

              {!catalogLoading && !catalogError && catalogSuggestions.length > 0 && (
                <>
                  <Text style={styles.sectionHint}>Your exercises</Text>
                  <View style={styles.suggestionWrap}>
                    {catalogSuggestions.map((item) => (
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
                </>
              )}
              {catalogLoading && <LoadingState message="Loading your catalog..." />}
              {catalogError && <ErrorState message={catalogError} />}

              <Pressable
                onPress={() => setShowCustomInput((v) => !v)}
                style={styles.customToggle}
              >
                <Text style={styles.inlineLink}>
                  {showCustomInput ? 'Hide custom form' : '+ Add custom exercise'}
                </Text>
              </Pressable>
              {showCustomInput && (
                <>
                  <Input
                    label="Exercise name"
                    onChangeText={setNewExerciseName}
                    placeholder="My custom movement"
                    value={newExerciseName}
                  />
                  <Input
                    label="Muscle group (optional)"
                    onChangeText={setNewExerciseMuscleGroup}
                    placeholder="Back"
                    value={newExerciseMuscleGroup}
                  />
                  <Button label="Add Custom Exercise" onPress={addExerciseFromInput} />
                </>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Exercises"
                subtitle={`${workout.exercises.length} added · history and targets shown per lift`}
              />
              {workout.exercises.length === 0 ? (
                <Text style={styles.emptyText}>No exercises added yet.</Text>
              ) : (
                workout.exercises.map((exercise, exerciseIndex) => {
                  const historyKey = normalizeExerciseName(exercise.exerciseName);
                  const history = historyByExercise[historyKey] ?? [];
                  const loadingHistory = historyLoading[historyKey];
                  const personalBest = history.length > 0 ? getExercisePersonalBest(history) : null;
                  const recommendation =
                    exercise.exerciseName.trim().length > 0
                      ? getProgressionRecommendation(exercise.exerciseName.trim(), history)
                      : null;

                  const preset = PRESET_BY_NAME.get(exercise.exerciseName.trim().toLowerCase());

                  return (
                    <View key={exercise.id} style={styles.exerciseCard}>
                      <Card accent={Boolean(recommendation && recommendation.recommendationType !== 'not_enough_data')} style={styles.exerciseInsightCard}>
                        <SectionHeader
                          title={exercise.exerciseName || `Exercise ${exerciseIndex + 1}`}
                          subtitle="Previous best and next target"
                        />
                        {loadingHistory ? (
                          <View style={styles.inlineLoadingRow}>
                            <ActivityIndicator color={colors.accent} size="small" />
                            <Text style={styles.exerciseInsightText}>Loading history...</Text>
                          </View>
                        ) : !exercise.exerciseName.trim() ? (
                          <Text style={styles.exerciseInsightText}>
                            Name this exercise to see previous bests and a next target.
                          </Text>
                        ) : history.length === 0 || !personalBest || !recommendation ? (
                          <>
                            <Text style={styles.exerciseInsightText}>No history yet.</Text>
                            {preset ? (
                              <>
                                <Text style={styles.exerciseInsightTarget}>
                                  Recommended: {preset.sets} × {preset.reps}
                                </Text>
                                <Text style={styles.exerciseInsightMuted}>
                                  Targets: {preset.primaryMuscles.join(', ')}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.exerciseInsightMuted}>
                                Start conservatively and use this session to set a baseline.
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            <View style={styles.insightPills}>
                              <Pill label={`Best ${formatHeaviest(personalBest)}`} tone="accent" />
                              <Pill label={`Last ${recommendation.lastPerformance}`} />
                            </View>
                            <Text style={styles.exerciseInsightTarget}>
                              {formatRecommendationTarget(recommendation)}
                            </Text>
                            <Text style={styles.exerciseInsightMuted}>{recommendation.reason}</Text>
                            {recommendation.recommendationType !== 'not_enough_data' ? (
                              <Button
                                label="Apply to first set"
                                onPress={() => applyRecommendation(exercise.id, recommendation)}
                                variant="secondary"
                              />
                            ) : null}
                          </>
                        )}
                      </Card>

                      <View style={styles.exerciseRow}>
                        <Text style={styles.exerciseLabel}>Exercise setup</Text>
                        <Button
                          label="Remove"
                          onPress={() =>
                            updateWorkout(
                              'exercises',
                              workout.exercises.filter((item) => item.id !== exercise.id),
                            )
                          }
                          variant="ghost"
                        />
                      </View>

                      <Input
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
                      <Input
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
                      <Input
                        label="Exercise notes (optional)"
                        multiline
                        onChangeText={(value) =>
                          updateExercise(exercise.id, (current) => ({
                            ...current,
                            notes: value,
                          }))
                        }
                        placeholder="Tempo, setup, cues"
                        value={exercise.notes}
                      />

                      {exercise.sets.map((set, setIndex) => (
                        <Card key={set.id} style={styles.setCard}>
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
                            <Input
                              keyboardType="decimal-pad"
                              label="Weight (lb)"
                              onChangeText={(value) =>
                                updateSet(exercise.id, set.id, (current) => ({
                                  ...current,
                                  weight: value,
                                }))
                              }
                              placeholder="135"
                              value={set.weight}
                            />
                            <Input
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
                            <Input
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
                              <Text style={styles.switchLabel}>Pain flag</Text>
                              <Switch
                                onValueChange={(value) =>
                                  updateSet(exercise.id, set.id, (current) => ({
                                    ...current,
                                    painFlag: value,
                                  }))
                                }
                                thumbColor={set.painFlag ? colors.danger : colors.textSoft}
                                trackColor={{ false: colors.surfaceAlt, true: colors.dangerSurface }}
                                value={set.painFlag}
                              />
                            </View>
                          </View>

                          <Input
                            label="Set notes (optional)"
                            multiline
                            onChangeText={(value) =>
                              updateSet(exercise.id, set.id, (current) => ({
                                ...current,
                                notes: value,
                              }))
                            }
                            placeholder="Last rep slow, switched grip, etc."
                            value={set.notes}
                          />
                        </Card>
                      ))}

                      <Button
                        label="+ Add Set"
                        onPress={() =>
                          updateExercise(exercise.id, (current) => ({
                            ...current,
                            sets: [...current.sets, createEmptySet()],
                          }))
                        }
                        variant="secondary"
                      />
                    </View>
                  );
                })
              )}
            </Card>
          </ScrollView>

          <View style={styles.footerBar}>
            {error ? <ErrorState message={error} /> : null}
            <Button
              label={`Finish Workout${workout.exercises.length > 0 ? ` · ${workout.exercises.length} exercise${workout.exercises.length !== 1 ? 's' : ''}` : ''}`}
              loading={saving}
              onPress={() => void handleFinishWorkout()}
            />
          </View>
        </KeyboardAvoidingView>
      </AppScreen>
    </>
  );
}

function normalizeExerciseName(value: string) {
  return value.trim().toLowerCase();
}

function formatHeaviest(personalBest: PersonalBestSummary) {
  if (!personalBest.heaviestWeight.weight) {
    return 'no load';
  }

  if (personalBest.heaviestWeight.reps) {
    return `${personalBest.heaviestWeight.weight} lb × ${personalBest.heaviestWeight.reps}`;
  }

  return `${personalBest.heaviestWeight.weight} lb`;
}

function formatRecommendationTarget(recommendation: ProgressionRecommendation) {
  if (recommendation.recommendedNextWeight === null) {
    return `Next: ${recommendation.recommendedRepTarget}`;
  }

  return `Next: ${recommendation.recommendedNextWeight} lb × ${recommendation.recommendedRepTarget}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 160,
  },
  sectionHint: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: colors.background,
  },
  presetRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  presetRowInfo: {
    flex: 1,
    gap: 3,
  },
  presetName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  presetMuscles: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  presetBadge: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  presetBadgeText: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
  },
  customToggle: {
    paddingVertical: spacing.sm,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  suggestionText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  exerciseInsightCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseInsightText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  exerciseInsightMuted: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  exerciseInsightTarget: {
    color: colors.accent,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    lineHeight: 28,
  },
  inlineLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseLabel: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  setCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  setHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineLink: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  inlineDangerLink: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  switchCard: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  footerBar: {
    backgroundColor: colors.glassBar,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: spacing.sm,
    left: 0,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
