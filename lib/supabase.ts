import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { isProfileComplete } from './profile';
import type { Profile, ProfileInsert, ProfileUpdate } from '../types/supabase';

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
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
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

function missingConfigResult() {
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

export { isProfileComplete };
