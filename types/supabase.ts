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
