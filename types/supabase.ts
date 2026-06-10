export type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  height: string | null;
  current_weight: number | null;
  goal_weight: number | null;
  main_goal: string | null;
  experience_level: string | null;
  days_per_week: number | null;
  preferred_split: string | null;
  workout_length: number | null;
  equipment: string[] | null;
  injuries: string | null;
  liked_exercises: string[] | null;
  disliked_exercises: string[] | null;
  cardio_preference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Partial<
  Omit<Profile, 'id' | 'created_at' | 'updated_at'>
>;

export type ProfileUpdate = ProfileInsert;

export type ProfileFormValues = {
  name: string;
  age: string;
  height: string;
  currentWeight: string;
  goalWeight: string;
  mainGoal: string;
  experienceLevel: string;
  daysPerWeek: string;
  preferredSplit: string;
  workoutLength: string;
  equipment: string;
  injuries: string;
  likedExercises: string;
  dislikedExercises: string;
  cardioPreference: string;
  notes: string;
};

export type BodyMetric = {
  id: string;
  user_id: string;
  weight: number;
  waist: number | null;
  notes: string | null;
  logged_at: string;
};

export type BodyMetricInsert = {
  weight: number;
  waist?: number | null;
  notes?: string | null;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  title: string;
  workout_type: string | null;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  workout_session_id: string;
  exercise_name: string;
  muscle_group: string | null;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  pain_flag: boolean;
  logged_at: string;
};

export type ExerciseCatalogItem = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  notes: string | null;
  created_at: string;
};

export type ActiveSet = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  notes: string;
  painFlag: boolean;
};

export type ActiveExercise = {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  notes: string;
  sets: ActiveSet[];
};

export type ActiveWorkout = {
  title: string;
  workoutType: string;
  notes: string;
  startedAt: string;
  exercises: ActiveExercise[];
};

export type PersonalBestSummary = {
  exerciseName: string;
  muscleGroup: string | null;
  heaviestWeight: {
    weight: number | null;
    reps: number | null;
    loggedAt: string | null;
    sessionId: string | null;
  };
  bestEstimatedOneRepMax: {
    value: number | null;
    weight: number | null;
    reps: number | null;
    loggedAt: string | null;
    sessionId: string | null;
  };
  bestRepAtWeight: {
    weight: number | null;
    reps: number | null;
    loggedAt: string | null;
    sessionId: string | null;
  };
  highestSessionVolume: {
    volume: number | null;
    sessionId: string | null;
    loggedAt: string | null;
  };
  mostRecentWorkingWeight: number | null;
  mostRecentSets: Array<{
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    painFlag: boolean;
    notes: string | null;
  }>;
  lastPerformedDate: string | null;
  recentTrend: 'up' | 'flat' | 'down' | 'insufficient_data';
};

export type ExerciseSessionPerformance = {
  sessionId: string;
  loggedAt: string;
  muscleGroup: string | null;
  sets: ExerciseLog[];
  totalVolume: number;
  topWeight: number | null;
  bestEstimatedOneRepMax: number | null;
};

export type ProgressionRecommendation = {
  exerciseName: string;
  currentBest: string;
  lastPerformance: string;
  recommendedNextWeight: number | null;
  recommendedRepTarget: string;
  recommendationType:
    | 'increase_weight'
    | 'repeat_weight'
    | 'reduce_weight'
    | 'increase_reps'
    | 'deload_or_caution'
    | 'not_enough_data';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
};

export type PrHighlight = {
  exerciseName: string;
  type: 'heaviest' | 'estimated_1rm' | 'rep_pr' | 'session_volume';
  label: string;
  previousValue: string;
  currentValue: string;
};
