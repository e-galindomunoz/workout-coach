import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { normalizeAdjustWorkoutResponse } from '../../lib/aiValidation';
import { requestWorkoutAdjustment } from '../../lib/coachApi';
import { getCoachContext } from '../../lib/coachContext';
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
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
import type { AdjustWorkoutResponse, WorkoutPatch } from '../../types/ai';
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

const ADJUST_EXAMPLES = [
  "I only have 35 minutes",
  "Make it easier",
  "I'm sore today",
  "Replace the last exercise",
  "Add more shoulders",
  "Lower back feels off",
];

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

  type AdjustStep = 'input' | 'loading' | 'result';
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustStep, setAdjustStep] = useState<AdjustStep>('input');
  const [adjustRequest, setAdjustRequest] = useState('');
  const [adjustResult, setAdjustResult] = useState<AdjustWorkoutResponse | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

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
      new Set(workout.exercises.map((e) => e.exerciseName.trim()).filter(Boolean)),
    );

    names.forEach((name) => {
      const key = normalizeExerciseName(name);
      if (historyByExercise[key] || historyLoading[key]) return;

      setHistoryLoading((current) => ({ ...current, [key]: true }));

      void getExerciseHistory(name, 40).then((result) => {
        setHistoryLoading((current) => ({ ...current, [key]: false }));
        if (result.error) return;
        setHistoryByExercise((current) => ({ ...current, [key]: result.data ?? [] }));
      });
    });
  }, [historyByExercise, historyLoading, workout.exercises]);

  const catalogSuggestions = useMemo(
    () => getExerciseSuggestions(exerciseSearch, catalog, workout.exercises).slice(0, 8),
    [catalog, exerciseSearch, workout.exercises],
  );

  const filteredPresets = useMemo(() => {
    const activeNames = new Set(workout.exercises.map((e) => e.exerciseName.trim().toLowerCase()));
    return searchPresets(exerciseSearch, exerciseFilter).filter(
      (p) => !activeNames.has(p.name.toLowerCase()),
    );
  }, [exerciseSearch, exerciseFilter, workout.exercises]);

  function updateWorkout<K extends keyof ActiveWorkout>(key: K, value: ActiveWorkout[K]) {
    setWorkout((current) => ({ ...current, [key]: value }));
  }

  function updateExercise(exerciseId: string, updater: (exercise: ActiveExercise) => ActiveExercise) {
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? updater(exercise) : exercise,
      ),
    }));
  }

  function updateSet(exerciseId: string, setId: string, updater: (set: ActiveSet) => ActiveSet) {
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
        createEmptyExercise({ exerciseName: name, muscleGroup: newExerciseMuscleGroup.trim() }),
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
        createEmptyExercise({ exerciseName: preset.name, muscleGroup: preset.muscleGroup }),
      ],
    }));
    setExerciseSearch('');
    setExerciseFilter(null);
    setError(null);
  }

  function applyRecommendation(exerciseId: string, recommendation: ProgressionRecommendation) {
    updateExercise(exerciseId, (current) => {
      const firstSet = current.sets[0];
      if (!firstSet) return current;
      const targetReps = recommendation.recommendedRepTarget.split('-')[0]?.trim() ?? '';
      return {
        ...current,
        sets: current.sets.map((set, index) =>
          index === 0
            ? {
                ...set,
                weight: recommendation.recommendedNextWeight !== null
                  ? String(recommendation.recommendedNextWeight)
                  : set.weight,
                reps: targetReps || set.reps,
              }
            : set,
        ),
      };
    });
  }

  function openAdjustModal() {
    setAdjustStep('input');
    setAdjustRequest('');
    setAdjustResult(null);
    setAdjustError(null);
    setAdjustModalVisible(true);
  }

  async function handleAskCoach() {
    const req = adjustRequest.trim();
    if (!req) return;
    setAdjustStep('loading');
    setAdjustError(null);

    try {
      const ctx = await getCoachContext();
      const result = await requestWorkoutAdjustment({
        request: req,
        currentWorkout: {
          title: workout.title || 'Untitled Workout',
          exercises: workout.exercises.map((e) => ({
            exerciseName: e.exerciseName,
            muscleGroup: e.muscleGroup || undefined,
            sets: e.sets.map((s, i) => ({
              setNumber: i + 1,
              weight: s.weight || null,
              reps: s.reps || null,
            })),
          })),
        },
        completedSetsSoFar: {},
        profile: ctx.profile,
        recentTraining: ctx.recentTraining,
        personalBests: ctx.personalBests,
        progressionRecommendations: ctx.progressionRecommendations,
      });

      if (result.error || !result.data) {
        setAdjustError(result.error?.message ?? 'Could not reach the coach. Check your connection.');
        setAdjustStep('result');
      } else {
        setAdjustResult(normalizeAdjustWorkoutResponse(result.data, req));
        setAdjustStep('result');
      }
    } catch {
      setAdjustError('Unexpected error. Please try again.');
      setAdjustStep('result');
    }
  }

  function applyWorkoutPatch(patch: WorkoutPatch | null) {
    if (!patch) return;

    setWorkout((current) => {
      let exercises = [...current.exercises];

      for (const change of patch.exercises ?? []) {
        if (change.action === 'remove') {
          exercises = exercises.filter(
            (e) => e.exerciseName.trim().toLowerCase() !== change.exerciseName.trim().toLowerCase(),
          );
        } else if (change.action === 'swap' && change.replacedByName) {
          exercises = exercises.map((e) =>
            e.exerciseName.trim().toLowerCase() === change.exerciseName.trim().toLowerCase()
              ? { ...e, exerciseName: change.replacedByName! }
              : e,
          );
        }
      }

      for (const add of patch.addExercises ?? []) {
        exercises.push(createEmptyExercise({ exerciseName: add.name, muscleGroup: add.muscleGroup ?? '' }));
      }

      return { ...current, exercises };
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
            setError(`RPE must be 0–10 for ${exercise.exerciseName}.`);
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
      <Stack.Screen options={{ title: 'New Workout', gestureEnabled: false }} />
      <AppScreen
        title="Workout"
        fillContent
        scrollEnabled={false}
        headerAccessory={
          <Button label="Discard" onPress={confirmDiscard} variant="ghost" size="sm" />
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>

            {/* Workout details */}
            <Card accent>
              <SectionHeader title="Session Details" />
              <Input
                label="Workout title"
                onChangeText={(value) => updateWorkout('title', value)}
                placeholder="Upper Body Strength"
                value={workout.title}
              />
              <Input
                label="Type (optional)"
                onChangeText={(value) => updateWorkout('workoutType', value)}
                placeholder="Strength, hypertrophy, conditioning..."
                value={workout.workoutType}
              />
              <Input
                label="Notes (optional)"
                multiline
                onChangeText={(value) => updateWorkout('notes', value)}
                placeholder="How you're feeling, focus for today..."
                value={workout.notes}
              />
            </Card>

            {/* Add exercise */}
            <Card>
              <SectionHeader title="Add Exercise" subtitle="Filter by muscle group or search." />
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
                <Text style={styles.emptyText}>No exercises match your search.</Text>
              ) : (
                <>
                  {(exerciseSearch || exerciseFilter ? filteredPresets : filteredPresets.slice(0, 12)).map((preset) => (
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
                        style={({ pressed }) => [styles.suggestionChip, pressed && styles.buttonPressed]}
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

            {/* Exercise list */}
            <Card>
              <SectionHeader
                title="Exercises"
                subtitle={`${workout.exercises.length} added`}
              />
              {workout.exercises.length === 0 ? (
                <Text style={styles.emptyText}>No exercises added yet. Use the library above.</Text>
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
                      {/* Insight / recommendation card */}
                      <Card
                        accent={Boolean(recommendation && recommendation.recommendationType !== 'not_enough_data')}
                        style={styles.exerciseInsightCard}
                      >
                        <View style={styles.exerciseTitleRow}>
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
                            style={({ pressed }) => [styles.removeButton, pressed && styles.buttonPressed]}
                            hitSlop={6}
                          >
                            <Ionicons name="close" size={16} color={colors.textSoft} />
                          </Pressable>
                        </View>

                        {loadingHistory ? (
                          <View style={styles.inlineLoadingRow}>
                            <ActivityIndicator color={colors.accent} size="small" />
                            <Text style={styles.exerciseInsightMuted}>Loading history...</Text>
                          </View>
                        ) : !exercise.exerciseName.trim() ? (
                          <Text style={styles.exerciseInsightMuted}>
                            Name this exercise to see previous bests.
                          </Text>
                        ) : history.length === 0 || !personalBest || !recommendation ? (
                          <>
                            {preset ? (
                              <>
                                <Text style={styles.exerciseInsightTarget}>
                                  Start: {preset.sets} × {preset.reps}
                                </Text>
                                <Text style={styles.exerciseInsightMuted}>
                                  Targets: {preset.primaryMuscles.join(', ')}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.exerciseInsightMuted}>
                                No history yet. Start conservatively to set a baseline.
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
                                label="Apply Target to First Set"
                                onPress={() => applyRecommendation(exercise.id, recommendation)}
                                variant="secondary"
                                size="sm"
                              />
                            ) : null}
                          </>
                        )}
                      </Card>

                      {/* Exercise fields */}
                      <View style={styles.exerciseFields}>
                        <Input
                          label="Exercise name"
                          onChangeText={(value) =>
                            updateExercise(exercise.id, (current) => ({ ...current, exerciseName: value }))
                          }
                          placeholder="Exercise name"
                          value={exercise.exerciseName}
                        />
                        <Input
                          label="Muscle group (optional)"
                          onChangeText={(value) =>
                            updateExercise(exercise.id, (current) => ({ ...current, muscleGroup: value }))
                          }
                          placeholder="Back"
                          value={exercise.muscleGroup}
                        />
                        <Input
                          label="Exercise notes (optional)"
                          multiline
                          onChangeText={(value) =>
                            updateExercise(exercise.id, (current) => ({ ...current, notes: value }))
                          }
                          placeholder="Tempo, setup, cues..."
                          value={exercise.notes}
                        />
                      </View>

                      {/* Set rows */}
                      {exercise.sets.map((set, setIndex) => (
                        <Card key={set.id} style={styles.setCard}>
                          <View style={styles.setHeader}>
                            <Text style={styles.setTitle}>Set {setIndex + 1}</Text>
                            <View style={styles.setHeaderActions}>
                              <Pressable
                                onPress={() =>
                                  updateExercise(exercise.id, (current) => {
                                    const currentSet = current.sets.find((item) => item.id === set.id);
                                    if (!currentSet) return current;
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
                                style={({ pressed }) => [styles.setActionChip, pressed && styles.buttonPressed]}
                              >
                                <Ionicons name="copy-outline" size={13} color={colors.accent} />
                                <Text style={styles.setActionChipText}>Dup</Text>
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
                                style={({ pressed }) => [styles.setActionChipDanger, pressed && styles.buttonPressed]}
                              >
                                <Ionicons name="trash-outline" size={13} color={colors.danger} />
                                <Text style={styles.setActionChipDangerText}>Del</Text>
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.twoColumnRow}>
                            <Input
                              keyboardType="decimal-pad"
                              label="Weight (lb)"
                              onChangeText={(value) =>
                                updateSet(exercise.id, set.id, (current) => ({ ...current, weight: value }))
                              }
                              placeholder="135"
                              value={set.weight}
                            />
                            <Input
                              keyboardType="number-pad"
                              label="Reps"
                              onChangeText={(value) =>
                                updateSet(exercise.id, set.id, (current) => ({ ...current, reps: value }))
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
                                updateSet(exercise.id, set.id, (current) => ({ ...current, rpe: value }))
                              }
                              placeholder="8.5"
                              value={set.rpe}
                            />
                            <View style={styles.switchCard}>
                              <Text style={styles.switchLabel}>Pain flag</Text>
                              <Switch
                                onValueChange={(value) =>
                                  updateSet(exercise.id, set.id, (current) => ({ ...current, painFlag: value }))
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
                              updateSet(exercise.id, set.id, (current) => ({ ...current, notes: value }))
                            }
                            placeholder="Last rep slow, switched grip..."
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
                        size="sm"
                      />
                    </View>
                  );
                })
              )}
            </Card>
          </ScrollView>

          {/* Footer action bar */}
          <View style={styles.footerBar}>
            {error ? <ErrorState message={error} /> : null}
            {workout.exercises.length > 0 ? (
              <Button
                label="Ask Coach to Adjust"
                onPress={openAdjustModal}
                variant="secondary"
                leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textMuted} />}
              />
            ) : null}
            <Button
              label={
                workout.exercises.length > 0
                  ? `Finish Workout · ${workout.exercises.length} exercise${workout.exercises.length !== 1 ? 's' : ''}`
                  : 'Finish Workout'
              }
              loading={saving}
              onPress={() => void handleFinishWorkout()}
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </AppScreen>

      {/* Coach adjustment modal */}
      <Modal
        animationType="slide"
        transparent
        visible={adjustModalVisible}
        onRequestClose={() => setAdjustModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAdjustModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {adjustStep === 'input' && (
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalTitle}>Ask Coach to Adjust</Text>
                <Text style={styles.modalSubtitle}>
                  Tell the coach what you need. It will propose changes — you decide whether to apply.
                </Text>
                <Text style={styles.modalContextNote}>
                  Using your recent logs + PRs + progression targets
                </Text>

                <TextInput
                  autoFocus
                  multiline
                  onChangeText={setAdjustRequest}
                  placeholder="e.g. I only have 35 minutes, replace leg press, make it easier..."
                  placeholderTextColor={colors.textSoft}
                  style={styles.adjustInput}
                  value={adjustRequest}
                />

                <View style={styles.exampleChips}>
                  {ADJUST_EXAMPLES.map((ex) => (
                    <Pressable
                      key={ex}
                      onPress={() => setAdjustRequest(ex)}
                      style={({ pressed }) => [styles.exampleChip, pressed && styles.chipPressed]}
                    >
                      <Text style={styles.exampleChipText}>{ex}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <Button label="Cancel" onPress={() => setAdjustModalVisible(false)} variant="ghost" />
                  <View style={styles.modalActionFlex}>
                    <Button label="Ask Coach" onPress={() => void handleAskCoach()} />
                  </View>
                </View>
              </ScrollView>
            )}

            {adjustStep === 'loading' && (
              <View style={styles.loadingStep}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={styles.loadingText}>Analyzing your workout...</Text>
              </View>
            )}

            {adjustStep === 'result' && (
              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Proposed Adjustments</Text>

                {adjustError ? (
                  <>
                    <Text style={styles.adjustError}>{adjustError}</Text>
                    <Button label="Try Again" onPress={() => void handleAskCoach()} variant="secondary" />
                  </>
                ) : adjustResult ? (
                  <>
                    {adjustResult.safetyNote ? (
                      <View style={styles.safetyBanner}>
                        <Ionicons name="warning-outline" size={16} color={colors.danger} />
                        <Text style={styles.safetyBannerText}>{adjustResult.safetyNote}</Text>
                      </View>
                    ) : null}

                    <View style={styles.coachNoteCard}>
                      <Text style={styles.coachNoteLabel}>COACH</Text>
                      <Text style={styles.coachNoteText}>{adjustResult.coachNote}</Text>
                    </View>

                    {adjustResult.changes.length > 0 ? (
                      <View style={styles.changesSection}>
                        <Text style={styles.changesSectionLabel}>PROPOSED CHANGES</Text>
                        {adjustResult.changes.map((change, i) => (
                          <View key={i} style={styles.changeRow}>
                            <View style={styles.changeTypeBadge}>
                              <Text style={styles.changeTypeText}>{change.type}</Text>
                            </View>
                            <View style={styles.changeDetail}>
                              <Text style={styles.changeOriginal}>{change.original}</Text>
                              <Text style={styles.changeArrow}>↓</Text>
                              <Text style={styles.changeUpdated}>{change.updated}</Text>
                              <Text style={styles.changeReason}>{change.reason}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.modalActions}>
                      <Button label="Cancel" onPress={() => setAdjustModalVisible(false)} variant="ghost" />
                      {adjustResult.updatedWorkoutPatch && !isStopSafetyNote(adjustResult.safetyNote) && (
                        <View style={styles.modalActionFlex}>
                          <Button
                            label={adjustResult.safetyNote ? 'Apply Conservatively' : 'Apply Changes'}
                            onPress={() => {
                              applyWorkoutPatch(adjustResult.updatedWorkoutPatch);
                              setAdjustModalVisible(false);
                            }}
                          />
                        </View>
                      )}
                    </View>
                  </>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function normalizeExerciseName(value: string) {
  return value.trim().toLowerCase();
}

function formatHeaviest(personalBest: PersonalBestSummary) {
  if (!personalBest.heaviestWeight.weight) return 'no load';
  if (personalBest.heaviestWeight.reps) return `${personalBest.heaviestWeight.weight} lb × ${personalBest.heaviestWeight.reps}`;
  return `${personalBest.heaviestWeight.weight} lb`;
}

function formatRecommendationTarget(recommendation: ProgressionRecommendation) {
  if (recommendation.recommendedNextWeight === null) return `Next: ${recommendation.recommendedRepTarget}`;
  return `Next: ${recommendation.recommendedNextWeight} lb × ${recommendation.recommendedRepTarget}`;
}

function isStopSafetyNote(note: string | null) {
  return Boolean(note && note.toLowerCase().startsWith('stop'));
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 180,
  },
  sectionHint: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.0,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
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
    fontWeight: fontWeights.heavy,
  },
  filterPillTextActive: {
    color: '#0B0F0A',
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
    fontWeight: fontWeights.bold,
  },
  presetMuscles: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  presetBadge: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  presetBadgeText: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
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
    fontWeight: fontWeights.bold,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  exerciseTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  exerciseTitle: {
    color: colors.text,
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.xs,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  exerciseInsightCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  exerciseInsightTarget: {
    color: colors.accent,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    lineHeight: 28,
  },
  exerciseInsightMuted: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
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
  exerciseFields: {
    gap: spacing.md,
  },

  // Set card
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
    fontWeight: fontWeights.heavy,
  },
  setHeaderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  setActionChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  setActionChipText: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
  },
  setActionChipDanger: {
    alignItems: 'center',
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.28)',
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  setActionChipDangerText: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
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
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
  },

  inlineLink: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
  },

  // Footer
  footerBar: {
    backgroundColor: colors.glassBar,
    borderTopColor: 'rgba(163, 190, 98, 0.14)',
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
    opacity: 0.78,
  },

  // Coach adjustment modal
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: spacing.md,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  modalContent: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  modalContextNote: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.4,
  },
  adjustInput: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.md,
    minHeight: 88,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exampleChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipPressed: {
    opacity: 0.72,
  },
  exampleChipText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionFlex: {
    flex: 1,
  },
  loadingStep: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  adjustError: {
    color: colors.danger,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  safetyBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.35)',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  safetyBannerText: {
    color: colors.danger,
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    lineHeight: 20,
  },
  coachNoteCard: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  coachNoteLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  coachNoteText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  changesSection: {
    gap: spacing.sm,
  },
  changesSectionLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  changeRow: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  changeTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  changeTypeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  changeDetail: {
    flex: 1,
    gap: 4,
  },
  changeOriginal: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    textDecorationLine: 'line-through',
  },
  changeArrow: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
  },
  changeUpdated: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  changeReason: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginTop: 2,
  },
});
