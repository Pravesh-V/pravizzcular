import type { ID, ISOTimestamp, LocalDate, OwnedEntity, Sex } from './common';

export type NotificationCategory =
  | 'workout_reminder'
  | 'nutrition_nudge'
  | 'pr_celebration'
  | 'monthly_report'
  | 'missed_log'
  | 'goal_milestone';

export interface NotificationPreference extends OwnedEntity {
  category: NotificationCategory;
  enabled: boolean;
  /** Minutes before the event to fire, where the category supports it. */
  leadTimeMin: number | null;
}

export interface AppNotification extends OwnedEntity {
  category: NotificationCategory;
  title: string;
  body: string;
  scheduledFor: ISOTimestamp;
  sentAt: ISOTimestamp | null;
  readAt: ISOTimestamp | null;
  /** Deep-link route opened on tap. */
  route: string | null;
}

export interface AiConversation extends OwnedEntity {
  title: string;
  lastMessageAt: ISOTimestamp | null;
}

export type AiRole = 'user' | 'assistant' | 'system';

export interface AiMessage extends OwnedEntity {
  conversationId: ID;
  role: AiRole;
  content: string;
  /**
   * Names of the structured context functions whose output was supplied for
   * this turn (e.g. ['getExerciseProgress']). Recorded so a user can audit
   * exactly which of their data left the device.
   */
  contextRefs: string[];
  /** Which provider produced this, for transparency. 'mock' during development. */
  provider: string | null;
}

// --- Strength percentiles -------------------------------------------------

export type PercentileBasis = 'estimated_1rm' | 'max_weight' | 'reps';

/**
 * A source of comparison data.
 *
 * `isDemo` is critical: the MVP ships illustrative distributions only, and
 * every ranking surfaced in the UI must disclose that. Replacing this with a
 * real dataset is a data-layer change, not a code change.
 */
export interface PercentileDataset extends OwnedEntity {
  key: string;
  name: string;
  /** Where the numbers came from, shown verbatim in the methodology sheet. */
  source: string;
  version: string;
  basis: PercentileBasis;
  /** True while the dataset is illustrative rather than empirical. */
  isDemo: boolean;
  /** Comparison groups this dataset can actually support. */
  supportedGroups: ComparisonGroup[];
  methodologyNote: string;
  publishedAt: ISOTimestamp | null;
}

export type ComparisonGroup =
  | 'all'
  | 'similar_bodyweight'
  | 'similar_age'
  | 'similar_experience'
  | 'recreational'
  | 'advanced';

/**
 * One distribution slice, parameterised rather than bucketed.
 *
 * Uses an LMS-style triple (lambda/median/sigma) so a percentile can be
 * evaluated continuously across bodyweight instead of snapping to coarse
 * bands like "55–60 kg".
 */
export interface PercentileDistribution extends OwnedEntity {
  datasetId: ID;
  exerciseKey: string;
  sex: Sex;
  /** Continuous reference point this slice is centred on. */
  bodyweightKg: number;
  ageMin: number;
  ageMax: number;
  /** Box-Cox power. */
  lambda: number;
  /** Median lift at this reference point, in kg. */
  mu: number;
  /** Coefficient of variation. */
  sigma: number;
  sampleSize: number | null;
}

export interface PercentileResult extends OwnedEntity {
  exerciseId: ID;
  datasetId: ID;
  comparisonGroup: ComparisonGroup;
  /** 0–100. */
  percentile: number;
  basis: PercentileBasis;
  inputValue: number;
  /** The inputs used, retained so a stale result can be explained. */
  inputBodyweightKg: number | null;
  inputAge: number | null;
  computedOn: LocalDate;
  computedAt: ISOTimestamp;
}
