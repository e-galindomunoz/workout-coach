import type {
  ExerciseLog,
  ExerciseSessionPerformance,
  PersonalBestSummary,
  ProgressionRecommendation,
} from '../types/supabase';

const BIG_COMPOUND_KEYWORDS = ['deadlift', 'squat', 'bench', 'row', 'press'];
const DUMBBELL_KEYWORDS = ['dumbbell', 'db'];
const MACHINE_KEYWORDS = ['machine', 'press', 'row', 'curl', 'extension'];
const LOWER_BODY_MACHINE_KEYWORDS = ['leg press', 'leg curl', 'leg extension', 'hack squat', 'calf'];
const BODYWEIGHT_KEYWORDS = ['pull-up', 'pull up', 'chin-up', 'chin up', 'dip', 'push-up', 'push up', 'bodyweight'];

export function calculateEstimatedOneRepMax(weight: number | null, reps: number | null) {
  if (typeof weight !== 'number' || typeof reps !== 'number' || weight <= 0 || reps <= 0) {
    return null;
  }

  return weight * (1 + reps / 30);
}

export function calculateSetVolume(weight: number | null, reps: number | null) {
  if (typeof weight !== 'number' || typeof reps !== 'number' || weight < 0 || reps <= 0) {
    return 0;
  }

  return weight * reps;
}

export function getExerciseSessionVolume(logs: ExerciseLog[]) {
  return logs.reduce(
    (total, log) => total + calculateSetVolume(log.weight, log.reps),
    0,
  );
}

export function groupExerciseLogsByExercise(logs: ExerciseLog[]) {
  const grouped = new Map<string, ExerciseLog[]>();

  for (const log of logs) {
    const key = log.exercise_name.trim().toLowerCase();
    const current = grouped.get(key) ?? [];
    current.push(log);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    exerciseName: items[0]?.exercise_name ?? key,
    logs: items.sort(
      (left, right) =>
        new Date(right.logged_at).getTime() - new Date(left.logged_at).getTime() ||
        left.set_number - right.set_number,
    ),
  }));
}

export function getGroupedExerciseSessions(logs: ExerciseLog[]): ExerciseSessionPerformance[] {
  const grouped = new Map<string, ExerciseLog[]>();

  for (const log of logs) {
    const current = grouped.get(log.workout_session_id) ?? [];
    current.push(log);
    grouped.set(log.workout_session_id, current);
  }

  return Array.from(grouped.entries())
    .map(([sessionId, items]) => ({
      sessionId,
      loggedAt: items[0]?.logged_at ?? '',
      muscleGroup: items.find((item) => item.muscle_group)?.muscle_group ?? null,
      sets: items.sort((left, right) => left.set_number - right.set_number),
      totalVolume: getExerciseSessionVolume(items),
      topWeight: items.reduce<number | null>(
        (best, item) =>
          typeof item.weight === 'number' && (best === null || item.weight > best)
            ? item.weight
            : best,
        null,
      ),
      bestEstimatedOneRepMax: items.reduce<number | null>((best, item) => {
        const estimated = calculateEstimatedOneRepMax(item.weight, item.reps);
        if (estimated === null) {
          return best;
        }

        return best === null || estimated > best ? estimated : best;
      }, null),
    }))
    .sort(
      (left, right) =>
        new Date(right.loggedAt).getTime() - new Date(left.loggedAt).getTime(),
    );
}

export function getBestSetForExercise(logs: ExerciseLog[]) {
  return logs.reduce<ExerciseLog | null>((best, log) => {
    const current = calculateEstimatedOneRepMax(log.weight, log.reps);
    const previous = best
      ? calculateEstimatedOneRepMax(best.weight, best.reps)
      : null;

    if (current === null) {
      return best;
    }

    if (previous === null || current > previous) {
      return log;
    }

    return best;
  }, null);
}

export function getRecentPerformanceForExercise(logs: ExerciseLog[]) {
  const sessions = getGroupedExerciseSessions(logs);
  return sessions[0] ?? null;
}

function getRecentTrend(logs: ExerciseLog[]): PersonalBestSummary['recentTrend'] {
  const sessions = getGroupedExerciseSessions(logs);
  if (sessions.length < 2) {
    return 'insufficient_data';
  }

  const [latest, previous] = sessions;
  const latestVolume = latest.totalVolume;
  const previousVolume = previous.totalVolume;

  if (latestVolume > previousVolume * 1.03) {
    return 'up';
  }

  if (latestVolume < previousVolume * 0.97) {
    return 'down';
  }

  return 'flat';
}

export function getExercisePersonalBest(logs: ExerciseLog[]): PersonalBestSummary {
  const sortedLogs = [...logs].sort(
    (left, right) =>
      new Date(right.logged_at).getTime() - new Date(left.logged_at).getTime() ||
      right.set_number - left.set_number,
  );

  const bestSet = getBestSetForExercise(sortedLogs);
  const sessions = getGroupedExerciseSessions(sortedLogs);
  const latestSession = sessions[0] ?? null;

  const heaviest = sortedLogs.reduce<ExerciseLog | null>((best, log) => {
    if (typeof log.weight !== 'number') {
      return best;
    }

    if (!best || (best.weight ?? -Infinity) < log.weight) {
      return log;
    }

    return best;
  }, null);

  const bestRepAtWeight = sortedLogs.reduce<ExerciseLog | null>((best, log) => {
    if (typeof log.weight !== 'number' || typeof log.reps !== 'number') {
      return best;
    }

    if (!best) {
      return log;
    }

    if ((best.weight ?? -Infinity) < log.weight) {
      return best;
    }

    if (best.weight === log.weight && (best.reps ?? -Infinity) < log.reps) {
      return log;
    }

    return best;
  }, null);

  const topSession = sessions.reduce<ExerciseSessionPerformance | null>((best, session) => {
    if (!best || session.totalVolume > best.totalVolume) {
      return session;
    }
    return best;
  }, null);

  return {
    exerciseName: sortedLogs[0]?.exercise_name ?? '',
    muscleGroup: sortedLogs.find((item) => item.muscle_group)?.muscle_group ?? null,
    heaviestWeight: {
      weight: heaviest?.weight ?? null,
      reps: heaviest?.reps ?? null,
      loggedAt: heaviest?.logged_at ?? null,
      sessionId: heaviest?.workout_session_id ?? null,
    },
    bestEstimatedOneRepMax: {
      value: bestSet ? calculateEstimatedOneRepMax(bestSet.weight, bestSet.reps) : null,
      weight: bestSet?.weight ?? null,
      reps: bestSet?.reps ?? null,
      loggedAt: bestSet?.logged_at ?? null,
      sessionId: bestSet?.workout_session_id ?? null,
    },
    bestRepAtWeight: {
      weight: bestRepAtWeight?.weight ?? null,
      reps: bestRepAtWeight?.reps ?? null,
      loggedAt: bestRepAtWeight?.logged_at ?? null,
      sessionId: bestRepAtWeight?.workout_session_id ?? null,
    },
    highestSessionVolume: {
      volume: topSession?.totalVolume ?? null,
      sessionId: topSession?.sessionId ?? null,
      loggedAt: topSession?.loggedAt ?? null,
    },
    mostRecentWorkingWeight: latestSession?.sets.find((set) => typeof set.weight === 'number')?.weight ?? null,
    mostRecentSets:
      latestSession?.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe,
        painFlag: set.pain_flag,
        notes: set.notes,
      })) ?? [],
    lastPerformedDate: latestSession?.loggedAt ?? null,
    recentTrend: getRecentTrend(sortedLogs),
  };
}

function isBodyweightExercise(exerciseName: string, logs: ExerciseLog[]) {
  const lower = exerciseName.toLowerCase();
  return (
    BODYWEIGHT_KEYWORDS.some((keyword) => lower.includes(keyword)) ||
    logs.every((log) => log.weight === null)
  );
}

function getRecommendedJump(exerciseName: string) {
  const lower = exerciseName.toLowerCase();

  if (DUMBBELL_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 5;
  }

  if (LOWER_BODY_MACHINE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 10;
  }

  if (BIG_COMPOUND_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return lower.includes('deadlift') || lower.includes('squat') ? 10 : 5;
  }

  if (MACHINE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 5;
  }

  return 5;
}

function formatPerformanceSummary(session: ExerciseSessionPerformance | null) {
  if (!session || session.sets.length === 0) {
    return 'No recent performance';
  }

  return session.sets
    .map((set) => `${set.weight ?? 'BW'} x ${set.reps ?? '-'}`)
    .join(', ');
}

function formatCurrentBest(pb: PersonalBestSummary) {
  if (pb.heaviestWeight.weight && pb.heaviestWeight.reps) {
    return `${pb.heaviestWeight.weight} lb x ${pb.heaviestWeight.reps}`;
  }

  if (pb.bestEstimatedOneRepMax.value) {
    return `${Math.round(pb.bestEstimatedOneRepMax.value)} lb est. 1RM`;
  }

  return 'No best yet';
}

export function getProgressionRecommendation(
  exerciseName: string,
  logs: ExerciseLog[],
  options?: {
    repTarget?: { min: number; max: number };
  },
): ProgressionRecommendation {
  const repTarget = options?.repTarget ?? { min: 6, max: 8 };
  const recentSession = getRecentPerformanceForExercise(logs);
  const pb = getExercisePersonalBest(logs);

  if (!recentSession) {
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: 'No recent performance',
      recommendedNextWeight: null,
      recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
      recommendationType: 'not_enough_data',
      reason: 'No history exists yet. Start conservatively and build a baseline.',
      confidence: 'low',
    };
  }

  const recentPain = recentSession.sets.some((set) => set.pain_flag);
  const workingSets = recentSession.sets.filter(
    (set) => typeof set.weight === 'number' || typeof set.reps === 'number',
  );
  const hasBodyweightPattern = isBodyweightExercise(exerciseName, logs);
  const lastWeight =
    workingSets.find((set) => typeof set.weight === 'number')?.weight ?? null;
  const allSetsHitTop =
    workingSets.length > 0 &&
    workingSets.every(
      (set) =>
        typeof set.reps === 'number' &&
        set.reps >= repTarget.max &&
        (typeof set.rpe !== 'number' || set.rpe <= 8.5),
    );
  const missedReps = workingSets.some(
    (set) => typeof set.reps === 'number' && set.reps < repTarget.min,
  );
  const highRpe = workingSets.some(
    (set) => typeof set.rpe === 'number' && set.rpe >= 9.5,
  );

  if (recentPain) {
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: formatPerformanceSummary(recentSession),
      recommendedNextWeight: lastWeight,
      recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
      recommendationType: 'deload_or_caution',
      reason: 'Recent pain or discomfort was logged. Hold back progression and train cautiously.',
      confidence: 'high',
    };
  }

  if (hasBodyweightPattern || lastWeight === null) {
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: formatPerformanceSummary(recentSession),
      recommendedNextWeight: null,
      recommendedRepTarget: `${repTarget.max}-${repTarget.max + 2}`,
      recommendationType: 'increase_reps',
      reason: 'This exercise does not have reliable load data. Progress by adding reps or sets first.',
      confidence: 'medium',
    };
  }

  if (highRpe) {
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: formatPerformanceSummary(recentSession),
      recommendedNextWeight: Math.max(0, lastWeight - 5),
      recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
      recommendationType: 'reduce_weight',
      reason: 'Recent sets were very hard on RPE. Repeat with caution or slightly reduce the load.',
      confidence: 'medium',
    };
  }

  if (missedReps) {
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: formatPerformanceSummary(recentSession),
      recommendedNextWeight: lastWeight,
      recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
      recommendationType: 'repeat_weight',
      reason: 'Recent performance missed the target reps, so repeat the same load before increasing.',
      confidence: 'high',
    };
  }

  if (allSetsHitTop) {
    const jump = getRecommendedJump(exerciseName);
    return {
      exerciseName,
      currentBest: formatCurrentBest(pb),
      lastPerformance: formatPerformanceSummary(recentSession),
      recommendedNextWeight: lastWeight + jump,
      recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
      recommendationType: 'increase_weight',
      reason: 'You hit the top of the rep target across working sets without excessive RPE. Increase next time.',
      confidence: 'high',
    };
  }

  return {
    exerciseName,
    currentBest: formatCurrentBest(pb),
    lastPerformance: formatPerformanceSummary(recentSession),
    recommendedNextWeight: lastWeight,
    recommendedRepTarget: `${repTarget.min}-${repTarget.max}`,
    recommendationType: 'repeat_weight',
    reason: 'Recent performance was solid but not clearly above target. Repeat the same weight and aim for cleaner reps.',
    confidence: 'medium',
  };
}

export function getAllPersonalBests(logs: ExerciseLog[]) {
  return groupExerciseLogsByExercise(logs)
    .map((group) => getExercisePersonalBest(group.logs))
    .sort((left, right) => {
      const rightValue = right.bestEstimatedOneRepMax.value ?? 0;
      const leftValue = left.bestEstimatedOneRepMax.value ?? 0;
      return rightValue - leftValue;
    });
}

export function getExercisePrHighlights(
  exerciseName: string,
  currentLogs: ExerciseLog[],
  previousLogs: ExerciseLog[],
) {
  const current = getExercisePersonalBest(currentLogs);
  const previous = getExercisePersonalBest(previousLogs);
  const highlights: string[] = [];

  if (
    (current.heaviestWeight.weight ?? 0) > (previous.heaviestWeight.weight ?? 0)
  ) {
    highlights.push(`New heaviest weight on ${exerciseName}`);
  }

  if (
    (current.bestEstimatedOneRepMax.value ?? 0) >
    (previous.bestEstimatedOneRepMax.value ?? 0)
  ) {
    highlights.push(`New estimated 1RM on ${exerciseName}`);
  }

  if (
    (current.bestRepAtWeight.reps ?? 0) > (previous.bestRepAtWeight.reps ?? 0) &&
    current.bestRepAtWeight.weight === previous.bestRepAtWeight.weight
  ) {
    highlights.push(`New rep PR on ${exerciseName}`);
  }

  if (
    (current.highestSessionVolume.volume ?? 0) >
    (previous.highestSessionVolume.volume ?? 0)
  ) {
    highlights.push(`New session volume PR on ${exerciseName}`);
  }

  return highlights;
}
