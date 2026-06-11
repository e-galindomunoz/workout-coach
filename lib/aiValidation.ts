import type {
  AdjustWorkoutChange,
  AdjustWorkoutResponse,
  CoachChatResponse,
  WorkoutInsightNextTarget,
  WorkoutInsightResponse,
  WorkoutPatch,
} from '../types/ai';
import { detectSafetyLevel, getSafetyNote, type SafetyLevel } from './aiSafety';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean).slice(0, 8);
}

function clampItems<T>(items: T[], max = 6): T[] {
  return items.slice(0, max);
}

function normalizeSafetyLevel(value: unknown, fallback: SafetyLevel): SafetyLevel {
  return value === 'normal' || value === 'caution' || value === 'stop' ? value : fallback;
}

function buildCoachFallback(message: string, safetyLevel: SafetyLevel): CoachChatResponse {
  const normalizedLevel = safetyLevel === 'normal' ? detectSafetyLevel(message) : safetyLevel;

  return {
    reply:
      normalizedLevel === 'stop'
        ? 'Stop the workout now and seek guidance from a healthcare professional before training again.'
        : normalizedLevel === 'caution'
          ? 'Keep this session conservative, avoid pushing through pain, and stop if symptoms worsen.'
          : 'I could not parse the coach response. Please try again.',
    safetyLevel: normalizedLevel,
    suggestedActions:
      normalizedLevel === 'stop'
        ? ['Stop the workout', 'Seek professional guidance']
        : normalizedLevel === 'caution'
          ? ['Reduce load', 'Keep the session lighter']
          : ['Try again', 'Ask for a shorter answer'],
    referencedData: [],
  };
}

export function normalizeCoachChatResponse(
  value: unknown,
  message: string,
): CoachChatResponse {
  const record = asRecord(value);
  if (!record) {
    return buildCoachFallback(message, detectSafetyLevel(message));
  }

  const fallbackLevel = detectSafetyLevel(message);
  const safetyLevel = normalizeSafetyLevel(record.safetyLevel, fallbackLevel);
  const reply = asString(record.reply);
  const suggestedActions = asStringArray(record.suggestedActions);
  const referencedData = asStringArray(record.referencedData);

  const normalized: CoachChatResponse = {
    reply:
      reply ||
      buildCoachFallback(message, safetyLevel).reply,
    safetyLevel,
    suggestedActions:
      clampItems(suggestedActions.length > 0 ? suggestedActions : buildCoachFallback(message, safetyLevel).suggestedActions),
    referencedData: clampItems(referencedData),
  };

  return normalized;
}

function normalizeNextTarget(value: unknown): WorkoutInsightNextTarget | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const exerciseName = asString(record.exerciseName);
  const target = asString(record.target);
  const reason = asString(record.reason);

  if (!exerciseName || !target || !reason) {
    return null;
  }

  return { exerciseName, target, reason };
}

function buildWorkoutInsightFallback(
  safetyNote: string | null,
): WorkoutInsightResponse {
  return {
    summary: 'I could not parse the analysis response. Please try again.',
    wins: [],
    nextFocus: '',
    nextTargets: [],
    safetyNote,
  };
}

export function normalizeWorkoutInsightResponse(
  value: unknown,
  safetyNote: string | null = null,
): WorkoutInsightResponse {
  const record = asRecord(value);
  if (!record) {
    return buildWorkoutInsightFallback(safetyNote);
  }

  const summary = asString(record.summary);
  const wins = asStringArray(record.wins);
  const nextFocus = asString(record.nextFocus);
  const nextTargets = Array.isArray(record.nextTargets)
    ? record.nextTargets
        .map((item) => normalizeNextTarget(item))
        .filter((item): item is WorkoutInsightNextTarget => Boolean(item))
        .slice(0, 4)
    : [];
  const responseSafetyNote = asString(record.safetyNote, safetyNote ?? '');

  return {
    summary: summary || 'I could not parse the analysis response. Please try again.',
    wins,
    nextFocus,
    nextTargets,
    safetyNote: responseSafetyNote || safetyNote,
  };
}

function normalizeWorkoutPatch(value: unknown): WorkoutPatch | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const exercises = Array.isArray(record.exercises)
    ? record.exercises
        .map((item) => {
          const change = asRecord(item);
          if (!change) {
            return null;
          }

          const action = change.action;
          const exerciseName = asString(change.exerciseName);
          const replacedByName = asString(change.replacedByName);

          if ((action !== 'remove' && action !== 'swap') || !exerciseName) {
            return null;
          }

          if (action === 'swap' && !replacedByName) {
            return null;
          }

          return {
            action,
            exerciseName,
            ...(action === 'swap' ? { replacedByName } : {}),
          } satisfies WorkoutPatch['exercises'][number];
        })
        .filter((item): item is WorkoutPatch['exercises'][number] => Boolean(item))
    : [];

  const addExercises = Array.isArray(record.addExercises)
    ? record.addExercises
        .map((item) => {
          const add = asRecord(item);
          if (!add) {
            return null;
          }

          const name = asString(add.name);
          if (!name) {
            return null;
          }

          return {
            name,
            muscleGroup: asString(add.muscleGroup) || undefined,
            targetSets:
              typeof add.targetSets === 'number' && Number.isFinite(add.targetSets)
                ? Math.max(1, Math.min(8, Math.round(add.targetSets)))
                : undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : undefined;

  if (exercises.length === 0 && (!addExercises || addExercises.length === 0)) {
    return null;
  }

  return {
    exercises,
    ...(addExercises && addExercises.length > 0 ? { addExercises } : {}),
  };
}

function buildAdjustFallback(
  request: string,
  safetyNote: string | null,
): AdjustWorkoutResponse {
  const level = detectSafetyLevel(request);
  const finalSafetyNote = safetyNote ?? getSafetyNote(level);

  return {
    coachNote:
      level === 'stop'
        ? 'Stop the workout now and seek professional guidance before continuing.'
        : level === 'caution'
          ? 'Back off today and keep the adjustment conservative.'
          : 'I could not parse the adjustment response. Please try again.',
    changes: [],
    updatedWorkoutPatch: null,
    safetyNote: finalSafetyNote,
  };
}

export function normalizeAdjustWorkoutResponse(
  value: unknown,
  request: string,
  safetyNote: string | null = null,
): AdjustWorkoutResponse {
  const record = asRecord(value);
  if (!record) {
    return buildAdjustFallback(request, safetyNote);
  }

  const level = detectSafetyLevel(request);
  const responseSafetyNote = asString(record.safetyNote, safetyNote ?? '');
  const changes = Array.isArray(record.changes)
    ? record.changes
        .map((item) => {
          const change = asRecord(item);
          if (!change) {
            return null;
          }

          const type = asString(change.type);
          const original = asString(change.original);
          const updated = asString(change.updated);
          const reason = asString(change.reason);

          if (!type || !original || !updated || !reason) {
            return null;
          }

          if (!['swap', 'sets', 'reps', 'rest', 'intensity', 'remove', 'add'].includes(type)) {
            return null;
          }

          return { type: type as AdjustWorkoutChange['type'], original, updated, reason };
        })
        .filter((item): item is AdjustWorkoutChange => Boolean(item))
        .slice(0, 6)
    : [];

  const patch = normalizeWorkoutPatch(record.updatedWorkoutPatch);
  const coachNote = asString(record.coachNote);

  return {
    coachNote:
      coachNote ||
      buildAdjustFallback(request, responseSafetyNote || getSafetyNote(level)).coachNote,
    changes,
    updatedWorkoutPatch: level === 'stop' ? null : patch,
    safetyNote:
      responseSafetyNote ||
      safetyNote ||
      getSafetyNote(level),
  };
}
