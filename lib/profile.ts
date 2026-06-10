import type { Profile, ProfileFormValues, ProfileInsert } from '../types/supabase';

export const MAIN_GOAL_OPTIONS = [
  'fat loss',
  'muscle gain',
  'recomposition',
  'strength',
  'general fitness',
] as const;

export const EXPERIENCE_LEVEL_OPTIONS = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

export const PREFERRED_SPLIT_OPTIONS = [
  'full body',
  'upper/lower',
  'push/pull/legs',
  'custom',
] as const;

export const MIN_WORKOUT_LENGTH = 15;
export const MAX_WORKOUT_LENGTH = 240;

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  name: '',
  age: '',
  height: '',
  currentWeight: '',
  goalWeight: '',
  mainGoal: '',
  experienceLevel: '',
  daysPerWeek: '',
  preferredSplit: '',
  workoutLength: '',
  equipment: '',
  injuries: '',
  likedExercises: '',
  dislikedExercises: '',
  cardioPreference: '',
  notes: '',
};

const HEIGHT_PATTERN = /(\d+)\s*(?:ft|')\s*(\d+)\s*(?:in|")?/i;

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyList(value: string[] | null) {
  return value?.join(', ') ?? '';
}

export function formatHeight(feet: number, inches: number) {
  return `${feet} ft ${inches} in`;
}

export function parseHeight(value: string) {
  const match = value.match(HEIGHT_PATTERN);

  if (!match) {
    return {
      feet: 5,
      inches: 8,
    };
  }

  const feet = Number(match[1]);
  const inches = Number(match[2]);

  return {
    feet: Number.isFinite(feet) ? feet : 5,
    inches: Number.isFinite(inches) ? inches : 8,
  };
}

function parsePositiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function isProfileFieldComplete(value: string | number | string[] | null) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  return typeof value === 'string' ? value.trim().length > 0 : false;
}

export function isProfileComplete(profile: Profile | null) {
  if (!profile) {
    return false;
  }

  return [
    profile.name,
    profile.age,
    profile.height,
    profile.current_weight,
    profile.goal_weight,
    profile.main_goal,
    profile.experience_level,
    profile.days_per_week,
    profile.preferred_split,
    profile.workout_length,
    profile.equipment,
    profile.cardio_preference,
  ].every(isProfileFieldComplete);
}

export function profileToFormValues(profile: Profile | null): ProfileFormValues {
  if (!profile) {
    return EMPTY_PROFILE_FORM;
  }

  return {
    name: profile.name ?? '',
    age: profile.age?.toString() ?? '',
    height: profile.height ?? '',
    currentWeight: profile.current_weight?.toString() ?? '',
    goalWeight: profile.goal_weight?.toString() ?? '',
    mainGoal: profile.main_goal ?? '',
    experienceLevel: profile.experience_level ?? '',
    daysPerWeek: profile.days_per_week?.toString() ?? '',
    preferredSplit: profile.preferred_split ?? '',
    workoutLength: profile.workout_length?.toString() ?? '',
    equipment: stringifyList(profile.equipment),
    injuries: profile.injuries ?? '',
    likedExercises: stringifyList(profile.liked_exercises),
    dislikedExercises: stringifyList(profile.disliked_exercises),
    cardioPreference: profile.cardio_preference ?? '',
    notes: profile.notes ?? '',
  };
}

export function validateProfileForm(
  values: ProfileFormValues,
  step: number,
): string | null {
  const age = parsePositiveNumber(values.age);
  const currentWeight = parsePositiveNumber(values.currentWeight);
  const goalWeight = parsePositiveNumber(values.goalWeight);
  const daysPerWeek = parsePositiveNumber(values.daysPerWeek);
  const workoutLength = parsePositiveNumber(values.workoutLength);

  if (step === 0) {
    if (!values.name.trim() || !values.height.trim()) {
      return 'Name and height are required.';
    }

    if (!Number.isInteger(age) || age <= 0) {
      return 'Age must be a positive whole number.';
    }

    if (!(currentWeight > 0) || !(goalWeight > 0)) {
      return 'Current weight and goal weight must be positive numbers.';
    }
  }

  if (step === 1) {
    if (
      !values.mainGoal ||
      !values.experienceLevel ||
      !values.preferredSplit
    ) {
      return 'Goal, experience level, and preferred split are required.';
    }

    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
      return 'Days per week must be a whole number between 1 and 7.';
    }

    if (
      !Number.isInteger(workoutLength) ||
      workoutLength < MIN_WORKOUT_LENGTH ||
      workoutLength > MAX_WORKOUT_LENGTH
    ) {
      return `Workout length must be between ${MIN_WORKOUT_LENGTH} and ${MAX_WORKOUT_LENGTH} minutes.`;
    }
  }

  if (step === 2) {
    if (!values.equipment.trim() || !values.cardioPreference.trim()) {
      return 'Equipment available and cardio preference are required.';
    }
  }

  return null;
}

export function formValuesToProfileInsert(
  values: ProfileFormValues,
): ProfileInsert {
  return {
    name: values.name.trim(),
    age: Number(values.age),
    height: values.height.trim(),
    current_weight: Number(values.currentWeight),
    goal_weight: Number(values.goalWeight),
    main_goal: values.mainGoal,
    experience_level: values.experienceLevel,
    days_per_week: Number(values.daysPerWeek),
    preferred_split: values.preferredSplit,
    workout_length: Number(values.workoutLength),
    equipment: parseList(values.equipment),
    injuries: values.injuries.trim() || null,
    liked_exercises: parseList(values.likedExercises),
    disliked_exercises: parseList(values.dislikedExercises),
    cardio_preference: values.cardioPreference.trim(),
    notes: values.notes.trim() || null,
  };
}
