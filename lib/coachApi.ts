import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabase';
import type { CoachContext } from './coachContext';
import type {
  AdjustWorkoutRequest,
  AdjustWorkoutResponse,
  CoachChatResponse,
  WorkoutInsightRequest,
  WorkoutInsightResponse,
} from '../types/ai';

type ApiResult<T> = { data: T | null; error: Error | null };

function notConfigured<T>(): ApiResult<T> {
  return { data: null, error: new Error(supabaseConfigError) };
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function sendCoachMessage(
  message: string,
  context: CoachContext,
): Promise<ApiResult<CoachChatResponse>> {
  if (!isSupabaseConfigured) return notConfigured();

  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke<CoachChatResponse>('coach-chat', {
    ...(headers ? { headers } : {}),
    body: { message, context },
  });

  return {
    data: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function getWorkoutInsight(
  request: WorkoutInsightRequest,
): Promise<ApiResult<WorkoutInsightResponse>> {
  if (!isSupabaseConfigured) return notConfigured();

  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke<WorkoutInsightResponse>(
    'workout-insight',
    { ...(headers ? { headers } : {}), body: request },
  );

  return {
    data: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function requestWorkoutAdjustment(
  adjustRequest: AdjustWorkoutRequest,
): Promise<ApiResult<AdjustWorkoutResponse>> {
  if (!isSupabaseConfigured) return notConfigured();

  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke<AdjustWorkoutResponse>(
    'adjust-workout',
    { ...(headers ? { headers } : {}), body: adjustRequest },
  );

  return {
    data: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}
