import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getProfile, isProfileComplete, supabase } from '../lib/supabase';
import type { Profile } from '../types/supabase';

const AUTH_TIMEOUT_MS = 4000;

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileReady: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
  applyProfile: (nextProfile: Profile) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const profileRequestId = useRef(0);

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
      setProfileReady(true);
      return;
    }

    const requestId = ++profileRequestId.current;

    try {
      const { data, error } = await withTimeout(getProfile(), AUTH_TIMEOUT_MS);
      if (requestId !== profileRequestId.current) {
        return;
      }

      if (error) {
        return;
      }

      setProfile(data);
      setProfileReady(true);
    } catch {
      if (requestId === profileRequestId.current && profile) {
        setProfileReady(true);
      }
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
          setProfileReady(true);
          return;
        }

        setSession(data.session);
        sessionRef.current = data.session;

        if (!data.session) {
          setProfile(null);
          setProfileReady(true);
          return;
        }

        setProfileReady(false);
        await refreshProfile(data.session);
      } catch {
        if (!active) {
          return;
        }

        setSession(null);
        setProfile(null);
        setProfileReady(true);
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
          const currentUserId = sessionRef.current?.user.id;
          const nextUserId = nextSession?.user.id;

          setSession(nextSession);
          sessionRef.current = nextSession;

          if (!nextSession) {
            profileRequestId.current += 1;
            setProfile(null);
            setProfileReady(true);
            return;
          }

          if (currentUserId === nextUserId) {
            return;
          }

          setInitialized(false);
          setProfile(null);
          setProfileReady(false);
          await refreshProfile(nextSession);
        } finally {
          if (active) {
            setInitialized(true);
          }
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
      profileReady,
      profileComplete: isProfileComplete(profile),
      applyProfile: (nextProfile: Profile) => {
        setProfile(nextProfile);
        setProfileReady(true);
      },
      refreshProfile: async () => {
        await refreshProfile();
      },
    }),
    [initialized, profile, profileReady, session],
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
