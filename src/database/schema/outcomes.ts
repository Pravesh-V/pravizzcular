import type { ID, ISOTimestamp, LocalDate, OwnedEntity } from './common';

export type GoalType =
  | 'strength' // Bench 100 kg
  | 'bodyweight' // Reach 70 kg
  | 'consistency' // 90% diet consistency
  | 'frequency' // Train 4× per week
  | 'nutrition' // Hit 160g protein daily
  | 'endurance' // 5K under 25 minutes
  | 'custom';

export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export interface Goal extends OwnedEntity {
  title: string;
  goalType: GoalType;
  /** Set for strength/endurance goals tied to a specific lift. */
  exerciseId: ID | null;
  /** What is being measured, e.g. 'estimated_1rm', 'max_weight', 'weight_kg'. */
  metric: string;
  /** Value when the goal was created, so progress is measured from a baseline. */
  startValue: number;
  targetValue: number;
  /** Canonical unit for the metric. */
  unit: string;
  targetDate: LocalDate | null;
  status: GoalStatus;
  achievedAt: ISOTimestamp | null;
  /** Lower target values mean improvement (e.g. a 5K time). */
  lowerIsBetter: boolean;
}

export interface GoalMilestone extends OwnedEntity {
  goalId: ID;
  value: number;
  label: string | null;
  position: number;
  achievedAt: ISOTimestamp | null;
}

/**
 * Cached per-day rollup. Every field is recomputable from raw logs; this table
 * exists only to keep the calendar and streak views fast. `computedAt` older
 * than the day's last write means the row is stale and must be recalculated.
 */
export interface DailySummary extends OwnedEntity {
  localDate: LocalDate;
  consistencyScore: number;
  trainingScore: number | null;
  nutritionScore: number | null;
  habitScore: number | null;
  sleepScore: number | null;
  waterScore: number | null;
  /** Null when no workout was planned — distinct from a missed workout. */
  workoutPlanned: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  trainingVolumeKg: number;
  computedAt: ISOTimestamp;
}

export interface MonthlySummary extends OwnedEntity {
  year: number;
  /** 1–12. */
  month: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  trainingConsistency: number;
  nutritionConsistency: number;
  habitConsistency: number;
  overallConsistency: number;
  totalVolumeKg: number;
  avgWorkoutDurationSec: number | null;
  personalRecords: number;
  avgCalories: number | null;
  avgProteinG: number | null;
  startBodyweightKg: number | null;
  endBodyweightKg: number | null;
  computedAt: ISOTimestamp;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';

/** Catalogue row. Shared definition, not per-user. */
export interface Achievement extends OwnedEntity {
  /** Stable identifier, e.g. 'workouts_50'. */
  key: string;
  title: string;
  description: string;
  tier: AchievementTier;
  /** Category used for grouping in the UI. */
  category: 'training' | 'nutrition' | 'consistency' | 'strength' | 'milestone';
  /** Numeric threshold the progress value is compared against. */
  threshold: number;
}

export interface UserAchievement extends OwnedEntity {
  achievementId: ID;
  achievementKey: string;
  /** Current value toward `threshold`, so locked badges can show progress. */
  progress: number;
  achievedAt: ISOTimestamp | null;
}
