import type { ConsistencyConfig, LocalDate } from '@/database/schema';

import { clamp01 } from './nutrition';

/**
 * The consistency engine.
 *
 * Two rules govern everything here:
 *
 * 1. The score must be reproducible from logged data alone. No smoothing, no
 *    charity, no hidden floors. If the user recomputes it by hand they must get
 *    the same number.
 *
 * 2. A category that does not apply to a day is *excluded*, not scored zero.
 *    A planned rest day has no training component, so the remaining categories
 *    are re-weighted across it. Missing a workout you never planned is not a
 *    failure — that distinction is the whole point.
 */

export type ConsistencyCategory =
  | 'training'
  | 'nutrition'
  | 'sleep'
  | 'water'
  | 'habits';

export const CONSISTENCY_CATEGORIES: ConsistencyCategory[] = [
  'training',
  'nutrition',
  'sleep',
  'water',
  'habits',
];

/**
 * Per-category score for one day.
 * `null` means "not applicable today" and removes the category from the average.
 */
export type CategoryScores = Partial<Record<ConsistencyCategory, number | null>>;

export interface ConsistencyBreakdownEntry {
  category: ConsistencyCategory;
  /** 0..1, or null when the category did not apply. */
  score: number | null;
  /** Configured weight before renormalisation. */
  weight: number;
  /** Share of the final score this category actually carried, 0..1. */
  effectiveWeight: number;
}

export interface ConsistencyResult {
  /** 0..100, rounded to a whole percent for display. */
  score: number;
  /** Unrounded 0..1 value, for further maths. */
  raw: number;
  breakdown: ConsistencyBreakdownEntry[];
  /** True when nothing applied, so the UI can show "—" instead of 0%. */
  isUndefined: boolean;
}

export const DEFAULT_WEIGHTS: Record<ConsistencyCategory, number> = {
  training: 30,
  nutrition: 30,
  sleep: 15,
  water: 10,
  habits: 15,
};

export function weightsFromConfig(
  config: Pick<ConsistencyConfig, ConsistencyCategory>,
): Record<ConsistencyCategory, number> {
  return {
    training: nonNegative(config.training),
    nutrition: nonNegative(config.nutrition),
    sleep: nonNegative(config.sleep),
    water: nonNegative(config.water),
    habits: nonNegative(config.habits),
  };
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Weighted average of the applicable categories.
 *
 * Weights need not sum to 100 — they are normalised over whichever categories
 * applied, which is also what makes rest-day exclusion work.
 */
export function calculateConsistency(
  scores: CategoryScores,
  weights: Record<ConsistencyCategory, number> = DEFAULT_WEIGHTS,
): ConsistencyResult {
  const applicable: { category: ConsistencyCategory; score: number; weight: number }[] =
    [];

  for (const category of CONSISTENCY_CATEGORIES) {
    const raw = scores[category];
    const weight = nonNegative(weights[category]);

    if (raw === null || raw === undefined) continue;
    if (weight === 0) continue;

    applicable.push({ category, score: clamp01(raw), weight });
  }

  const totalWeight = applicable.reduce((sum, a) => sum + a.weight, 0);

  const breakdown: ConsistencyBreakdownEntry[] = CONSISTENCY_CATEGORIES.map(
    (category) => {
      const entry = applicable.find((a) => a.category === category);
      return {
        category,
        score: entry ? entry.score : null,
        weight: nonNegative(weights[category]),
        effectiveWeight: entry && totalWeight > 0 ? entry.weight / totalWeight : 0,
      };
    },
  );

  if (totalWeight === 0) {
    return { score: 0, raw: 0, breakdown, isUndefined: true };
  }

  const raw = applicable.reduce((sum, a) => sum + a.score * a.weight, 0) / totalWeight;

  return {
    score: Math.round(clamp01(raw) * 100),
    raw: clamp01(raw),
    breakdown,
    isUndefined: false,
  };
}

/**
 * Training score for one day.
 *
 * Returns null on a planned rest day so the category drops out of the average
 * entirely rather than scoring zero.
 */
export function trainingScoreForDay({
  workoutPlanned,
  workoutCompleted,
  isRestDay,
}: {
  workoutPlanned: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
}): number | null {
  // Training that actually happened always counts, planned or not.
  if (workoutCompleted) return 1;

  // Nothing planned and nothing done: the category does not apply today.
  if (isRestDay || !workoutPlanned) return null;

  // A planned session that did not happen is the only real miss.
  return 0;
}

/** Mean of a set of daily scores. Null when there is nothing to average. */
export function averageConsistency(dailyRaw: (number | null)[]): number | null {
  const usable = dailyRaw.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (usable.length === 0) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

// --- Streaks --------------------------------------------------------------

export interface StreakDay {
  date: LocalDate;
  /** Did the tracked thing happen on this day? */
  achieved: boolean;
  /**
   * True when the day legitimately does not count either way — a planned rest
   * day for a workout streak. These are skipped without breaking the streak.
   */
  excused: boolean;
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Counts streaks with excused days bridged rather than breaking the run.
 *
 * A scheduled rest day must not break a training streak — that would push the
 * user toward training when they planned to recover, which the product
 * explicitly refuses to do.
 *
 * `days` must be ordered oldest to newest.
 */
export function calculateStreak(days: StreakDay[]): StreakResult {
  let current = 0;
  let longest = 0;
  let running = 0;

  for (const day of days) {
    if (day.excused) continue; // Bridges the streak without extending it.

    if (day.achieved) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  // The current streak is the tail run, counted back from the most recent day.
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    if (!day) break;
    if (day.excused) continue;
    if (!day.achieved) break;
    current += 1;
  }

  return { current, longest };
}
