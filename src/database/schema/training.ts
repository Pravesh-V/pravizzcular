import type { ID, ISOTimestamp, LocalDate, OwnedEntity } from './common';

/**
 * Determines which of the measurement fields on a set are meaningful.
 * Validated by `validateSet` rather than by splitting sets into separate tables,
 * so one logging screen can serve every exercise type.
 */
export type ExerciseMetricType =
  | 'weight_reps' // Bench press: weight + reps
  | 'reps' // Pull-ups: reps only
  | 'duration' // Plank: seconds
  | 'distance_duration' // Running: metres + seconds
  | 'bodyweight' // Push-ups, counted as bodyweight load
  | 'assisted'; // Assisted pull-ups: assistance reduces effective load

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export interface Exercise extends OwnedEntity {
  name: string;
  /** Lower-cased, punctuation-stripped name used for search and dedupe. */
  canonicalName: string;
  metricType: ExerciseMetricType;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  /** False for the built-in library, true for user-authored exercises. */
  isCustom: boolean;
  /** Counts toward the overall strength score by default (bench/squat/dead/etc.). */
  isCompound: boolean;
  notes: string | null;
}

/** Lets "bench", "flat bench", "barbell bench" all resolve to one exercise. */
export interface ExerciseAlias extends OwnedEntity {
  exerciseId: ID;
  alias: string;
}

export interface WorkoutTemplate extends OwnedEntity {
  name: string;
  notes: string | null;
  /** Which weekdays this template is normally performed on. */
  scheduledWeekdays: number;
  position: number;
}

export interface TemplateExercise extends OwnedEntity {
  templateId: ID;
  exerciseId: ID;
  position: number;
  targetSets: number;
  targetRepsLow: number | null;
  targetRepsHigh: number | null;
  notes: string | null;
}

export type WorkoutStatus =
  | 'planned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'skipped';

export interface Workout extends OwnedEntity {
  templateId: ID | null;
  name: string;
  status: WorkoutStatus;
  /** The day this workout belongs to, in the user's timezone. */
  scheduledFor: LocalDate;
  startedAt: ISOTimestamp | null;
  completedAt: ISOTimestamp | null;
  /** Excludes time spent paused. */
  durationSec: number | null;
  notes: string | null;
  /** Part of the generated demo history; removed by "reset demo data". */
  isDemo: boolean;
}

export interface WorkoutExercise extends OwnedEntity {
  workoutId: ID;
  exerciseId: ID;
  position: number;
  notes: string | null;
}

export type SetType =
  | 'warmup'
  | 'working'
  | 'drop'
  | 'failure'
  | 'amrap'
  | 'backoff';

export interface WorkoutSet extends OwnedEntity {
  workoutExerciseId: ID;
  /** 1-based display order within the exercise. */
  setIndex: number;
  setType: SetType;

  /** Populated per the exercise's metricType; null where not applicable. */
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;

  /** Rate of perceived exertion, 1–10. Optional, never required. */
  rpe: number | null;
  /** Reps in reserve, 0–10. Optional, never required. */
  rir: number | null;

  isComplete: boolean;
  loggedAt: ISOTimestamp;
}

export type PersonalRecordType =
  | 'max_weight'
  | 'max_reps'
  | 'estimated_1rm'
  | 'max_volume'
  | 'best_set'
  | 'longest_duration'
  | 'best_distance'
  | 'best_pace';

export interface PersonalRecord extends OwnedEntity {
  exerciseId: ID;
  recordType: PersonalRecordType;
  /** In canonical units for the record type (kg, reps, seconds, metres). */
  value: number;
  /** Context so the PR can be rendered as "82.5 kg × 8" rather than a bare number. */
  weightKg: number | null;
  reps: number | null;
  setId: ID | null;
  workoutId: ID | null;
  achievedOn: LocalDate;
  achievedAt: ISOTimestamp;
  /** The record this superseded, for "+2.5 kg" deltas. Null for a first PR. */
  previousValue: number | null;
}

/** Which measurement fields a metric type requires. Drives validation and UI. */
export const METRIC_FIELDS: Record<
  ExerciseMetricType,
  { weight: boolean; reps: boolean; duration: boolean; distance: boolean }
> = {
  weight_reps: { weight: true, reps: true, duration: false, distance: false },
  reps: { weight: false, reps: true, duration: false, distance: false },
  duration: { weight: false, reps: false, duration: true, distance: false },
  distance_duration: { weight: false, reps: false, duration: true, distance: true },
  bodyweight: { weight: false, reps: true, duration: false, distance: false },
  assisted: { weight: true, reps: true, duration: false, distance: false },
};
