export interface PresetExercise {
  name: string;
  muscleGroup: string;
  primaryMuscles: string[];
  sets: number;
  reps: string;
}

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Glutes',
  'Core',
  'Cardio',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EXERCISE_LIBRARY: PresetExercise[] = [
  // CHEST
  { name: 'Barbell Bench Press', muscleGroup: 'Chest', primaryMuscles: ['Pecs', 'Anterior Delt', 'Triceps'], sets: 4, reps: '5-8' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', primaryMuscles: ['Pecs', 'Anterior Delt', 'Triceps'], sets: 3, reps: '8-12' },
  { name: 'Incline Barbell Press', muscleGroup: 'Chest', primaryMuscles: ['Upper Pecs', 'Anterior Delt'], sets: 3, reps: '8-10' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', primaryMuscles: ['Upper Pecs', 'Anterior Delt'], sets: 3, reps: '8-12' },
  { name: 'Decline Bench Press', muscleGroup: 'Chest', primaryMuscles: ['Lower Pecs', 'Triceps'], sets: 3, reps: '8-12' },
  { name: 'Cable Fly', muscleGroup: 'Chest', primaryMuscles: ['Pecs'], sets: 3, reps: '12-15' },
  { name: 'Dumbbell Fly', muscleGroup: 'Chest', primaryMuscles: ['Pecs'], sets: 3, reps: '12-15' },
  { name: 'Pec Deck Machine', muscleGroup: 'Chest', primaryMuscles: ['Pecs'], sets: 3, reps: '12-15' },
  { name: 'Chest Dip', muscleGroup: 'Chest', primaryMuscles: ['Lower Pecs', 'Triceps'], sets: 3, reps: '8-12' },
  { name: 'Push-Up', muscleGroup: 'Chest', primaryMuscles: ['Pecs', 'Anterior Delt', 'Triceps'], sets: 3, reps: '15-20' },

  // BACK
  { name: 'Deadlift', muscleGroup: 'Back', primaryMuscles: ['Erectors', 'Lats', 'Traps', 'Glutes', 'Hamstrings'], sets: 4, reps: '3-6' },
  { name: 'Barbell Row', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Rhomboids', 'Rear Delt', 'Biceps'], sets: 4, reps: '6-10' },
  { name: 'Dumbbell Row', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Rhomboids', 'Rear Delt'], sets: 3, reps: '8-12 each side' },
  { name: 'Pull-Up', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Biceps', 'Core'], sets: 4, reps: '5-10' },
  { name: 'Chin-Up', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Biceps'], sets: 4, reps: '6-10' },
  { name: 'Lat Pulldown', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Biceps'], sets: 3, reps: '10-12' },
  { name: 'Seated Cable Row', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Rhomboids', 'Rear Delt'], sets: 3, reps: '10-12' },
  { name: 'T-Bar Row', muscleGroup: 'Back', primaryMuscles: ['Lats', 'Rhomboids'], sets: 4, reps: '8-10' },
  { name: 'Face Pull', muscleGroup: 'Back', primaryMuscles: ['Rear Delt', 'Rotator Cuff', 'Traps'], sets: 3, reps: '15-20' },
  { name: 'Back Extension', muscleGroup: 'Back', primaryMuscles: ['Erectors', 'Glutes'], sets: 3, reps: '12-15' },

  // SHOULDERS
  { name: 'Overhead Press', muscleGroup: 'Shoulders', primaryMuscles: ['Anterior Delt', 'Lateral Delt', 'Triceps'], sets: 4, reps: '5-8' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', primaryMuscles: ['Anterior Delt', 'Lateral Delt', 'Triceps'], sets: 3, reps: '8-12' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders', primaryMuscles: ['All Delt Heads'], sets: 3, reps: '10-12' },
  { name: 'Lateral Raise', muscleGroup: 'Shoulders', primaryMuscles: ['Lateral Delt'], sets: 4, reps: '12-20' },
  { name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', primaryMuscles: ['Lateral Delt'], sets: 3, reps: '15-20 each side' },
  { name: 'Front Raise', muscleGroup: 'Shoulders', primaryMuscles: ['Anterior Delt'], sets: 3, reps: '12-15' },
  { name: 'Rear Delt Fly', muscleGroup: 'Shoulders', primaryMuscles: ['Rear Delt', 'Rotator Cuff'], sets: 3, reps: '15-20' },
  { name: 'Upright Row', muscleGroup: 'Shoulders', primaryMuscles: ['Lateral Delt', 'Traps', 'Biceps'], sets: 3, reps: '10-12' },

  // BICEPS
  { name: 'Barbell Curl', muscleGroup: 'Biceps', primaryMuscles: ['Biceps', 'Brachialis'], sets: 3, reps: '8-12' },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps', primaryMuscles: ['Biceps', 'Brachialis'], sets: 3, reps: '10-12' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', primaryMuscles: ['Brachialis', 'Brachioradialis', 'Biceps'], sets: 3, reps: '10-12' },
  { name: 'Preacher Curl', muscleGroup: 'Biceps', primaryMuscles: ['Biceps'], sets: 3, reps: '10-12' },
  { name: 'Cable Curl', muscleGroup: 'Biceps', primaryMuscles: ['Biceps'], sets: 3, reps: '12-15' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', primaryMuscles: ['Long Head Biceps'], sets: 3, reps: '10-12' },
  { name: 'Concentration Curl', muscleGroup: 'Biceps', primaryMuscles: ['Biceps'], sets: 3, reps: '10-15 each arm' },

  // TRICEPS
  { name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', primaryMuscles: ['Triceps', 'Pecs', 'Anterior Delt'], sets: 3, reps: '8-12' },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', primaryMuscles: ['Triceps'], sets: 3, reps: '12-15' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', primaryMuscles: ['Long Head Triceps'], sets: 3, reps: '10-12' },
  { name: 'Skull Crusher', muscleGroup: 'Triceps', primaryMuscles: ['Triceps'], sets: 3, reps: '10-12' },
  { name: 'Tricep Dip', muscleGroup: 'Triceps', primaryMuscles: ['Triceps', 'Pecs'], sets: 3, reps: '10-15' },
  { name: 'Diamond Push-Up', muscleGroup: 'Triceps', primaryMuscles: ['Triceps'], sets: 3, reps: '12-15' },
  { name: 'Cable Overhead Extension', muscleGroup: 'Triceps', primaryMuscles: ['Long Head Triceps'], sets: 3, reps: '12-15' },

  // LEGS
  { name: 'Barbell Squat', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes', 'Hamstrings', 'Core'], sets: 4, reps: '5-8' },
  { name: 'Front Squat', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes', 'Core'], sets: 4, reps: '5-8' },
  { name: 'Leg Press', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], sets: 4, reps: '8-12' },
  { name: 'Romanian Deadlift', muscleGroup: 'Legs', primaryMuscles: ['Hamstrings', 'Glutes', 'Erectors'], sets: 3, reps: '8-12' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], sets: 3, reps: '8-10 each leg' },
  { name: 'Leg Extension', muscleGroup: 'Legs', primaryMuscles: ['Quads'], sets: 3, reps: '12-15' },
  { name: 'Lying Leg Curl', muscleGroup: 'Legs', primaryMuscles: ['Hamstrings'], sets: 3, reps: '10-12' },
  { name: 'Seated Leg Curl', muscleGroup: 'Legs', primaryMuscles: ['Hamstrings'], sets: 3, reps: '10-12' },
  { name: 'Hack Squat', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes'], sets: 4, reps: '8-12' },
  { name: 'Walking Lunge', muscleGroup: 'Legs', primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], sets: 3, reps: '10-12 each leg' },
  { name: 'Standing Calf Raise', muscleGroup: 'Legs', primaryMuscles: ['Gastrocnemius', 'Soleus'], sets: 4, reps: '12-15' },
  { name: 'Seated Calf Raise', muscleGroup: 'Legs', primaryMuscles: ['Soleus'], sets: 4, reps: '15-20' },

  // GLUTES
  { name: 'Hip Thrust', muscleGroup: 'Glutes', primaryMuscles: ['Glutes', 'Hamstrings'], sets: 4, reps: '8-12' },
  { name: 'Glute Bridge', muscleGroup: 'Glutes', primaryMuscles: ['Glutes', 'Hamstrings'], sets: 3, reps: '12-15' },
  { name: 'Sumo Deadlift', muscleGroup: 'Glutes', primaryMuscles: ['Glutes', 'Hamstrings', 'Adductors'], sets: 4, reps: '5-8' },
  { name: 'Cable Kickback', muscleGroup: 'Glutes', primaryMuscles: ['Glutes'], sets: 3, reps: '15-20 each leg' },
  { name: 'Abductor Machine', muscleGroup: 'Glutes', primaryMuscles: ['Glute Med', 'Hip Abductors'], sets: 3, reps: '15-20' },
  { name: 'Step-Up', muscleGroup: 'Glutes', primaryMuscles: ['Glutes', 'Quads'], sets: 3, reps: '10-12 each leg' },
  { name: 'Donkey Kick', muscleGroup: 'Glutes', primaryMuscles: ['Glutes'], sets: 3, reps: '15-20 each leg' },

  // CORE
  { name: 'Plank', muscleGroup: 'Core', primaryMuscles: ['Transverse Abs', 'Obliques', 'Erectors'], sets: 3, reps: '30-60 sec' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'Core', primaryMuscles: ['Transverse Abs', 'Lats'], sets: 3, reps: '8-12' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', primaryMuscles: ['Lower Abs', 'Hip Flexors'], sets: 3, reps: '10-15' },
  { name: 'Cable Crunch', muscleGroup: 'Core', primaryMuscles: ['Abs'], sets: 3, reps: '12-15' },
  { name: 'Russian Twist', muscleGroup: 'Core', primaryMuscles: ['Obliques'], sets: 3, reps: '15-20 each side' },
  { name: 'Pallof Press', muscleGroup: 'Core', primaryMuscles: ['Obliques', 'Transverse Abs'], sets: 3, reps: '12-15 each side' },
  { name: 'Side Plank', muscleGroup: 'Core', primaryMuscles: ['Obliques', 'Glute Med'], sets: 3, reps: '30-45 sec each side' },
  { name: 'Dead Bug', muscleGroup: 'Core', primaryMuscles: ['Transverse Abs', 'Hip Flexors'], sets: 3, reps: '8-10 each side' },

  // CARDIO
  { name: 'Kettlebell Swing', muscleGroup: 'Cardio', primaryMuscles: ['Glutes', 'Hamstrings', 'Core', 'Back'], sets: 4, reps: '15-20' },
  { name: 'Box Jump', muscleGroup: 'Cardio', primaryMuscles: ['Quads', 'Glutes', 'Calves'], sets: 4, reps: '5-8' },
  { name: 'Burpee', muscleGroup: 'Cardio', primaryMuscles: ['Full Body'], sets: 3, reps: '10-15' },
  { name: 'Sled Push', muscleGroup: 'Cardio', primaryMuscles: ['Quads', 'Glutes', 'Core'], sets: 4, reps: '20-40m' },
  { name: "Farmer's Walk", muscleGroup: 'Cardio', primaryMuscles: ['Traps', 'Core', 'Forearms', 'Legs'], sets: 4, reps: '30-40m' },
  { name: 'Battle Ropes', muscleGroup: 'Cardio', primaryMuscles: ['Shoulders', 'Core', 'Arms'], sets: 4, reps: '20-30 sec' },
  { name: 'Jump Rope', muscleGroup: 'Cardio', primaryMuscles: ['Calves', 'Conditioning'], sets: 3, reps: '2-5 min' },
];

export function searchPresets(query: string, group: MuscleGroup | null): PresetExercise[] {
  const normalized = query.trim().toLowerCase();
  const pool = group ? EXERCISE_LIBRARY.filter((e) => e.muscleGroup === group) : EXERCISE_LIBRARY;

  if (!normalized) {
    return pool;
  }

  return pool.filter(
    (e) =>
      e.name.toLowerCase().includes(normalized) ||
      e.primaryMuscles.some((m) => m.toLowerCase().includes(normalized)),
  );
}

export const PRESET_BY_NAME = new Map(
  EXERCISE_LIBRARY.map((p) => [p.name.toLowerCase(), p]),
);
