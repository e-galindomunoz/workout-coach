// ─── coach-chat ─────────────────────────────────────────────────────────────

export type CoachChatRequest = {
  message: string;
  context?: Record<string, unknown>;
};

export type CoachChatResponse = {
  reply: string;
  safetyLevel: 'normal' | 'caution' | 'stop';
  suggestedActions: string[];
};

// ─── workout-insight ─────────────────────────────────────────────────────────

export type WorkoutInsightRequest = {
  exerciseName?: string;
  context: Record<string, unknown>;
};

export type WorkoutInsightResponse = {
  summary: string;
  insights: string[];
  nextFocus: string;
  safetyNote: string | null;
};

// ─── adjust-workout ───────────────────────────────────────────────────────────

export type AdjustWorkoutChange = {
  type: 'swap' | 'sets' | 'reps' | 'rest' | 'intensity' | 'remove' | 'add';
  original: string;
  updated: string;
  reason: string;
};

export type AdjustWorkoutRequest = {
  request: string;
  currentWorkout: Record<string, unknown>;
  context: Record<string, unknown>;
};

export type AdjustWorkoutResponse = {
  coachNote: string;
  changes: AdjustWorkoutChange[];
  safetyNote: string | null;
};
