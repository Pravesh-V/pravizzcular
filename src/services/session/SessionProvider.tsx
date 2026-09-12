import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Database } from '@/database/Database';
import { nowIso } from '@/database/ids';
import type { ConsistencyConfig, Profile, User, UserSettings } from '@/database/schema';
import { LocalAuthBackend } from '@/services/auth/LocalAuthBackend';
import type { AuthBackend } from '@/services/auth/types';
import { useDatabaseContext, useLiveQuery } from '@/services/database/DatabaseProvider';
import { deviceTimezone } from '@/utils/date';

interface SessionContextValue {
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  consistency: ConsistencyConfig | null;
  /** False until the profile step of onboarding has been completed. */
  isOnboarded: boolean;
  isLoading: boolean;
  updateProfile: (patch: Partial<Omit<Profile, 'id' | 'userId'>>) => void;
  updateSettings: (patch: Partial<Omit<UserSettings, 'id' | 'userId'>>) => void;
  updateConsistency: (patch: Partial<Omit<ConsistencyConfig, 'id' | 'userId'>>) => void;
  completeOnboarding: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  backend?: AuthBackend;
}

export function SessionProvider({ children, backend }: SessionProviderProps) {
  const { db, status } = useDatabaseContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const auth = useMemo(() => backend ?? new LocalAuthBackend(db), [backend, db]);

  useEffect(() => {
    // Must not run before init(): init replaces the in-memory cache wholesale,
    // so a user created beforehand would be silently discarded.
    if (status !== 'ready') return;

    let cancelled = false;

    (async () => {
      try {
        const user = await auth.signInAnonymously();
        if (cancelled) return;

        ensureUserRecords(db, user.id);
        setUserId(user.id);
      } catch (error) {
        console.error('[session] sign-in failed', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth, db, status]);

  const records = useLiveQuery((database) => {
    if (!userId) {
      return { user: null, profile: null, settings: null, consistency: null };
    }
    return {
      user: database.find('users', userId) ?? null,
      profile: database.all('profiles').find((p) => p.userId === userId) ?? null,
      settings: database.all('user_settings').find((s) => s.userId === userId) ?? null,
      consistency:
        database.all('consistency_config').find((c) => c.userId === userId) ?? null,
    };
  });

  const updateProfile = useCallback<SessionContextValue['updateProfile']>(
    (patch) => {
      if (records.profile) db.update('profiles', records.profile.id, patch);
    },
    [db, records.profile],
  );

  const updateSettings = useCallback<SessionContextValue['updateSettings']>(
    (patch) => {
      if (records.settings) db.update('user_settings', records.settings.id, patch);
    },
    [db, records.settings],
  );

  const updateConsistency = useCallback<SessionContextValue['updateConsistency']>(
    (patch) => {
      if (records.consistency) {
        db.update('consistency_config', records.consistency.id, patch);
      }
    },
    [db, records.consistency],
  );

  const completeOnboarding = useCallback(() => {
    if (records.profile) {
      db.update('profiles', records.profile.id, {
        onboardingCompletedAt: nowIso(),
      });
    }
  }, [db, records.profile]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...records,
      isOnboarded: records.profile?.onboardingCompletedAt != null,
      isLoading,
      updateProfile,
      updateSettings,
      updateConsistency,
      completeOnboarding,
    }),
    [
      records,
      isLoading,
      updateProfile,
      updateSettings,
      updateConsistency,
      completeOnboarding,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Guarantees a profile, settings and consistency config exist for a user.
 * Idempotent, so it is safe to call on every launch.
 */
function ensureUserRecords(db: Database, userId: string): void {
  const hasProfile = db.all('profiles').some((p) => p.userId === userId);
  if (!hasProfile) {
    db.insert('profiles', {
      userId,
      displayName: '',
      sex: 'unspecified',
      birthDate: null,
      heightCm: null,
      experience: 'beginner',
      primaryGoal: 'build_muscle',
      trainingDaysPerWeek: 4,
      onboardingCompletedAt: null,
    });
  }

  const hasSettings = db.all('user_settings').some((s) => s.userId === userId);
  if (!hasSettings) {
    db.insert('user_settings', {
      userId,
      weightUnit: 'kg',
      heightUnit: 'cm',
      timeFormat: '24h',
      theme: 'dark',
      timezone: deviceTimezone(),
      firstDayOfWeek: 1,
      progressionStyle: 'double',
      e1rmFormula: 'epley',
      restTimerSeconds: 120,
      hapticsEnabled: true,
      aiEnabled: true,
    });
  }

  const hasConsistency = db.all('consistency_config').some((c) => c.userId === userId);
  if (!hasConsistency) {
    db.insert('consistency_config', {
      userId,
      training: 30,
      nutrition: 30,
      sleep: 15,
      water: 10,
      habits: 15,
    });
  }
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
