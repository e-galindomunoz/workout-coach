import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { isProfileComplete } from './profile';
import type {
  BodyMetric,
  BodyMetricInsert,
  ExerciseCatalogItem,
  ExerciseLog,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  WorkoutSession,
} from '../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.';

export const supabase = createClient(
  supabaseUrl ?? 'https://example.supabase.co',
  supabaseAnonKey ?? 'public-anon-key-placeholder',
  {
    auth: {
      ...(Platform.OS !== 'web'
        ? { storage: AsyncStorage, lock: processLock }
        : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

function missingConfigResult<T = unknown>(): { data: null; error: Error } {
  return {
    data: null,
    error: new Error(supabaseConfigError),
  };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
    return missingConfigResult();
  }

  const { data, error } = await supabase.auth.getUser();
  return {
    data: data.user,
    error,
  };
}

export async function getProfile() {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userResult.data.id)
    .maybeSingle<Profile>();

  return result;
}

export async function createProfile(profile: ProfileInsert) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('profiles')
    .upsert(
      {
        id: userResult.data.id,
        ...profile,
      },
      {
        onConflict: 'id',
      },
    )
    .select()
    .single<Profile>();

  return result;
}

export async function updateProfile(profile: ProfileUpdate) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userResult.data.id)
    .select()
    .single<Profile>();

  return result;
}

export async function addBodyMetric(metric: BodyMetricInsert) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('body_metrics')
    .insert({
      user_id: userResult.data.id,
      weight: metric.weight,
      waist: metric.waist ?? null,
      notes: metric.notes ?? null,
    })
    .select()
    .single<BodyMetric>();

  return result;
}

export async function getLatestBodyMetric() {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle<BodyMetric>();

  return result;
}

export async function getBodyMetrics() {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('logged_at', { ascending: false })
    .returns<BodyMetric[]>();

  return result;
}

export async function deleteBodyMetric(id: string) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const { error } = await supabase
    .from('body_metrics')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data.id);

  return {
    error,
  };
}

export async function createWorkoutSession(input: {
  title: string;
  workoutType?: string | null;
  startedAt: string;
  notes?: string | null;
}) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userResult.data.id,
      title: input.title,
      workout_type: input.workoutType ?? null,
      started_at: input.startedAt,
      notes: input.notes ?? null,
    })
    .select()
    .single<WorkoutSession>();

  return result;
}

export async function finishWorkoutSession(input: {
  id: string;
  completedAt: string;
  durationMinutes: number;
  notes?: string | null;
}) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('workout_sessions')
    .update({
      completed_at: input.completedAt,
      duration_minutes: input.durationMinutes,
      notes: input.notes ?? null,
    })
    .eq('id', input.id)
    .eq('user_id', userResult.data.id)
    .select()
    .single<WorkoutSession>();

  return result;
}

export async function addExerciseLogs(
  sessionId: string,
  logs: Array<{
    exerciseName: string;
    muscleGroup?: string | null;
    setNumber: number;
    weight?: number | null;
    reps?: number | null;
    rpe?: number | null;
    notes?: string | null;
    painFlag?: boolean;
  }>,
) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const user = userResult.data;

  const result = await supabase
    .from('exercise_logs')
    .insert(
      logs.map((log) => ({
        user_id: user.id,
        workout_session_id: sessionId,
        exercise_name: log.exerciseName,
        muscle_group: log.muscleGroup ?? null,
        set_number: log.setNumber,
        weight: log.weight ?? null,
        reps: log.reps ?? null,
        rpe: log.rpe ?? null,
        notes: log.notes ?? null,
        pain_flag: log.painFlag ?? false,
      })),
    )
    .select()
    .returns<ExerciseLog[]>();

  return result;
}

export async function getRecentWorkoutSessions(limit = 10) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('started_at', { ascending: false })
    .limit(limit)
    .returns<WorkoutSession[]>();

  return result;
}

export async function getWorkoutSessionById(id: string) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userResult.data.id)
    .maybeSingle<WorkoutSession>();

  return result;
}

export async function deleteWorkoutSession(id: string) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data.id);

  return {
    error,
  };
}

export async function getExerciseLogsBySession(sessionId: string) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('workout_session_id', sessionId)
    .eq('user_id', userResult.data.id)
    .order('exercise_name', { ascending: true })
    .order('set_number', { ascending: true })
    .returns<ExerciseLog[]>();

  return result;
}

export async function getAllExerciseLogs() {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('logged_at', { ascending: false })
    .order('exercise_name', { ascending: true })
    .order('set_number', { ascending: true })
    .returns<ExerciseLog[]>();

  return result;
}

export async function getExerciseHistory(exerciseName: string, limit = 20) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userResult.data.id)
    .ilike('exercise_name', exerciseName)
    .order('logged_at', { ascending: false })
    .limit(limit)
    .returns<ExerciseLog[]>();

  return result;
}

export async function getExerciseCatalog() {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_catalog')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('name', { ascending: true })
    .returns<ExerciseCatalogItem[]>();

  return result;
}

export async function addExerciseToCatalog(input: {
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  notes?: string | null;
}) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_catalog')
    .insert({
      user_id: userResult.data.id,
      name: input.name,
      muscle_group: input.muscleGroup ?? null,
      equipment: input.equipment ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single<ExerciseCatalogItem>();

  return result;
}

export async function upsertExerciseToCatalog(input: {
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  notes?: string | null;
}) {
  const userResult = await getCurrentUser();

  if (userResult.error || !userResult.data) {
    return {
      data: null,
      error: userResult.error ?? new Error('No authenticated user found.'),
    };
  }

  const result = await supabase
    .from('exercise_catalog')
    .upsert(
      {
        user_id: userResult.data.id,
        name: input.name,
        muscle_group: input.muscleGroup ?? null,
        equipment: input.equipment ?? null,
        notes: input.notes ?? null,
      },
      {
        onConflict: 'user_id,name',
      },
    )
    .select()
    .single<ExerciseCatalogItem>();

  return result;
}

// ─── Coach messages ───────────────────────────────────────────────────────────

export type CoachMessageRow = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getCoachMessages(limit = 60) {
  if (!isSupabaseConfigured) return missingConfigResult<CoachMessageRow[]>();

  const userResult = await getCurrentUser();
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error ?? new Error('No authenticated user found.') };
  }

  const result = await supabase
    .from('coach_messages')
    .select('*')
    .eq('user_id', userResult.data.id)
    .order('created_at', { ascending: true })
    .limit(limit)
    .returns<CoachMessageRow[]>();

  return result;
}

export async function saveCoachMessage(input: {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown> | null;
}) {
  if (!isSupabaseConfigured) return missingConfigResult<CoachMessageRow>();

  const userResult = await getCurrentUser();
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error ?? new Error('No authenticated user found.') };
  }

  const result = await supabase
    .from('coach_messages')
    .insert({
      user_id: userResult.data.id,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? null,
    })
    .select()
    .single<CoachMessageRow>();

  return result;
}

export async function clearCoachMessages() {
  if (!isSupabaseConfigured) return { error: new Error(supabaseConfigError) };

  const userResult = await getCurrentUser();
  if (userResult.error || !userResult.data) {
    return { error: userResult.error ?? new Error('No authenticated user found.') };
  }

  const { error } = await supabase
    .from('coach_messages')
    .delete()
    .eq('user_id', userResult.data.id);

  return { error };
}

export { isProfileComplete };
