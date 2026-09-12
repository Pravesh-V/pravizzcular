import type {
  BaseEntity,
  HeightUnit,
  ISOTimestamp,
  LocalDate,
  OwnedEntity,
  Sex,
  ThemePreferenceValue,
  TimeFormat,
  TrainingExperience,
  WeightUnit,
} from './common';

export interface User extends BaseEntity {
  email: string | null;
  /** True for local-only accounts created without sign-up. */
  isAnonymous: boolean;
  lastSeenAt: ISOTimestamp;
}

export type PrimaryGoal =
  | 'build_muscle'
  | 'get_stronger'
  | 'lose_fat'
  | 'improve_fitness'
  | 'maintain';

export interface Profile extends OwnedEntity {
  displayName: string;
  sex: Sex;
  /** Stored as a date, not an age, so it stays correct over time. */
  birthDate: LocalDate | null;
  heightCm: number | null;
  experience: TrainingExperience;
  primaryGoal: PrimaryGoal;
  /** Planned sessions per week. Feeds rest-day and consistency logic. */
  trainingDaysPerWeek: number;
  onboardingCompletedAt: ISOTimestamp | null;
}

export type ProgressionStyle = 'weight' | 'reps' | 'double' | 'manual';
export type E1RMFormula = 'epley' | 'brzycki' | 'lombardi';

export interface UserSettings extends OwnedEntity {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  timeFormat: TimeFormat;
  theme: ThemePreferenceValue;
  /** IANA zone, e.g. 'Asia/Kolkata'. Resolves every LocalDate in the app. */
  timezone: string;
  /** 1 = Monday. Controls week boundaries in analytics. */
  firstDayOfWeek: 1 | 7;
  progressionStyle: ProgressionStyle;
  e1rmFormula: E1RMFormula;
  restTimerSeconds: number;
  hapticsEnabled: boolean;
  /** When false, no data is sent to any AI provider and the Bot tab is hidden. */
  aiEnabled: boolean;
}

/**
 * Per-user weighting of the consistency score. Values are relative weights,
 * normalised at calculation time so they need not sum to exactly 100.
 */
export interface ConsistencyConfig extends OwnedEntity {
  training: number;
  nutrition: number;
  sleep: number;
  water: number;
  habits: number;
}

export interface ProfileBundle {
  user: User;
  profile: Profile;
  settings: UserSettings;
  consistency: ConsistencyConfig;
}
