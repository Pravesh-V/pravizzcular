import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PrimaryGoal, Sex, TrainingExperience } from '@/database/schema';

export interface OnboardingDraft {
  displayName: string;
  sex: Sex;
  birthYear: string;
  heightCm: string;
  weightKg: string;
  primaryGoal: PrimaryGoal;
  experience: TrainingExperience;
  trainingDaysPerWeek: number;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  /** Habit names the user opted into. */
  habits: string[];
}

const INITIAL: OnboardingDraft = {
  displayName: '',
  sex: 'unspecified',
  birthYear: '',
  heightCm: '',
  weightKg: '',
  primaryGoal: 'build_muscle',
  experience: 'beginner',
  trainingDaysPerWeek: 4,
  calories: '2400',
  proteinG: '160',
  carbsG: '280',
  fatG: '70',
  habits: [],
};

interface OnboardingContextValue {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Holds onboarding answers in memory until the final step commits them.
 *
 * Deliberately not written to the database step by step — a half-finished
 * onboarding should leave no partial profile behind.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      update: (patch) => setDraft((current) => ({ ...current, ...patch })),
    }),
    [draft],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
