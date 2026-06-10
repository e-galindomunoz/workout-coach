import { Session, User } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, isProfileComplete, supabase } from '../lib/supabase';
import type { Profile } from '../types/supabase';

const AUTH_TIMEOUT_MS = 4000;

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
  applyProfile: (nextProfile: Profile) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out')), timeoutMs);
      }),
    ]);
  }

  async function refreshProfile(nextSession?: Session | null) {
    const activeSession = nextSession ?? session;

    if (!activeSession) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await withTimeout(getProfile(), AUTH_TIMEOUT_MS);
      setProfile(error ? null : data);
    } catch {
      setProfile(null);
    }
  }

  async function syncProfileForSession(nextSession: Session | null) {
    if (!nextSession) {
      setProfile(null);
      return;
    }

    try {
      const profileResult = await withTimeout(getProfile(), AUTH_TIMEOUT_MS);
      setProfile(profileResult.error ? null : profileResult.data);
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
        );

        if (!active) {
          return;
        }

        if (error) {
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(data.session);
        await syncProfileForSession(data.session);
      } catch {
        if (!active) {
          return;
        }

        setSession(null);
        setProfile(null);
      } finally {
        if (active) {
          setInitialized(true);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (active) {
        try {
          setInitialized(false);
          setSession(nextSession);
          await syncProfileForSession(nextSession);
        } catch {
          setProfile(null);
        } finally {
          setInitialized(true);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      session,
      user: session?.user ?? null,
      profile,
      profileComplete: isProfileComplete(profile),
      applyProfile: (nextProfile: Profile) => {
        setProfile(nextProfile);
      },
      refreshProfile: async () => {
        await refreshProfile();
      },
    }),
    [initialized, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
