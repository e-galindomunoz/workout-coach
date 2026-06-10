// ─── coach-chat ───────────────────────────────────────────────────────────────

export type CoachChatRequest = {
  message: string;
  context: import('../lib/coachContext').CoachContext;
};

export type CoachChatResponse = {
  reply: string;
  safetyLevel: 'normal' | 'caution' | 'stop';
  suggestedActions: string[];
  referencedData: string[];
};

// ─── workout-insight ──────────────────────────────────────────────────────────

export type WorkoutInsightMode = 'post_workout' | 'exercise_detail';

export type WorkoutInsightCompletedExercise = {
  name: string;
  totalSets: number;
  sets: string[];
};

export type WorkoutInsightPR = {
  exercise: string;
  label: string;
  previous: string;
  current: string;
};

export type WorkoutInsightRequest = {
  mode: WorkoutInsightMode;
  // post_workout only
  completedWorkout?: {
    title: string;
    durationMinutes: number | null;
    exercises: WorkoutInsightCompletedExercise[];
    newPRs: WorkoutInsightPR[];
  };
  // exercise_detail only
  exerciseName?: string;
  exerciseContext?: import('../lib/coachContext').SelectedExerciseContext;
  // shared
  profile?: import('../lib/coachContext').ProfileSummary | null;
  recentTraining?: import('../lib/coachContext').RecentTrainingSummary;
  progressionRecommendations?: import('../lib/coachContext').ProgressionEntry[];
};

export type WorkoutInsightNextTarget = {
  exerciseName: string;
  target: string;
  reason: string;
};

export type WorkoutInsightResponse = {
  summary: string;
  wins: string[];
  nextFocus: string;
  nextTargets: WorkoutInsightNextTarget[];
  safetyNote: string | null;
};

// ─── adjust-workout ───────────────────────────────────────────────────────────

export type AdjustWorkoutChange = {
  type: 'swap' | 'sets' | 'reps' | 'rest' | 'intensity' | 'remove' | 'add';
  original: string;
  updated: string;
  reason: string;
};

export type WorkoutPatchExercise = {
  action: 'remove' | 'swap';
  exerciseName: string;
  replacedByName?: string;
};

export type WorkoutPatch = {
  exercises: WorkoutPatchExercise[];
  addExercises?: Array<{
    name: string;
    muscleGroup?: string;
    targetSets?: number;
  }>;
};

export type AdjustWorkoutCurrentExercise = {
  exerciseName: string;
  muscleGroup?: string;
  sets: Array<{ setNumber: number; weight: string | null; reps: string | null }>;
};

export type AdjustWorkoutRequest = {
  request: string;
  currentWorkout: {
    title: string;
    exercises: AdjustWorkoutCurrentExercise[];
  };
  completedSetsSoFar: Record<string, unknown>;
  profile: import('../lib/coachContext').ProfileSummary | null;
  recentTraining: import('../lib/coachContext').RecentTrainingSummary;
  personalBests: import('../lib/coachContext').PersonalBestEntry[];
  progressionRecommendations: import('../lib/coachContext').ProgressionEntry[];
};

export type AdjustWorkoutResponse = {
  coachNote: string;
  changes: AdjustWorkoutChange[];
  updatedWorkoutPatch: WorkoutPatch | null;
  safetyNote: string | null;
};

// ─── UI message model ─────────────────────────────────────────────────────────

export type CoachMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  safetyLevel?: 'normal' | 'caution' | 'stop';
  suggestedActions?: string[];
  referencedData?: string[];
  createdAt: string;
};
