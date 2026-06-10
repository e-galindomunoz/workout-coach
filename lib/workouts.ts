import type {
  ActiveExercise,
  ActiveSet,
  ActiveWorkout,
  ExerciseCatalogItem,
  ExerciseLog,
  WorkoutSession,
} from '../types/supabase';

export function createEmptySet(): ActiveSet {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    weight: '',
    reps: '',
    rpe: '',
    notes: '',
    painFlag: false,
  };
}

export function createEmptyExercise(
  partial?: Partial<Pick<ActiveExercise, 'exerciseName' | 'muscleGroup' | 'notes'>>,
): ActiveExercise {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseName: partial?.exerciseName ?? '',
    muscleGroup: partial?.muscleGroup ?? '',
    notes: partial?.notes ?? '',
    sets: [createEmptySet()],
  };
}

export function createEmptyWorkout(): ActiveWorkout {
  return {
    title: '',
    workoutType: '',
    notes: '',
    startedAt: new Date().toISOString(),
    exercises: [],
  };
}

export function calculateDurationMinutes(startedAt: string, completedAt: string) {
  const started = new Date(startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  return Math.max(1, Math.round((completed - started) / 60000));
}

export function countWorkoutSets(exercises: Array<{ sets: unknown[] }>) {
  return exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

export function calculateTotalVolume(logs: ExerciseLog[]) {
  return logs.reduce((total, log) => {
    if (typeof log.weight !== 'number' || typeof log.reps !== 'number') {
      return total;
    }

    return total + log.weight * log.reps;
  }, 0);
}

export function groupExerciseLogs(logs: ExerciseLog[]) {
  const groups = new Map<string, ExerciseLog[]>();

  for (const log of logs) {
    const current = groups.get(log.exercise_name) ?? [];
    current.push(log);
    groups.set(log.exercise_name, current);
  }

  return Array.from(groups.entries()).map(([exerciseName, items]) => ({
    exerciseName,
    logs: items.sort((left, right) => left.set_number - right.set_number),
  }));
}

export function getWorkoutsThisWeekCount(sessions: WorkoutSession[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());

  return sessions.filter((session) => {
    const startedAt = new Date(session.started_at);
    return startedAt >= startOfWeek;
  }).length;
}

export function getLatestWorkout(sessions: WorkoutSession[]) {
  return sessions[0] ?? null;
}

export function getExerciseSuggestions(
  query: string,
  catalog: ExerciseCatalogItem[],
  activeExercises: ActiveExercise[],
) {
  const normalized = query.trim().toLowerCase();
  const activeNames = new Set(
    activeExercises
      .map((exercise) => exercise.exerciseName.trim().toLowerCase())
      .filter(Boolean),
  );

  return catalog.filter((item) => {
    const lower = item.name.toLowerCase();
    if (activeNames.has(lower)) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return lower.includes(normalized);
  });
}
