import type { E1RMFormula, SetType, WorkoutSet } from '@/database/schema';
import { roundToIncrement } from '@/utils/units';

/**
 * Strength mathematics. Pure functions — no storage, no React, no clock.
 *
 * Every estimate here is explicitly an *estimate*. The UI is required to label
 * derived one-rep maxes as "Estimated 1RM" and never as a tested max.
 */

/**
 * Above this rep count, single-set 1RM estimation stops being meaningful: the
 * formulas were fitted on low-rep work and diverge badly on high-rep sets.
 * Rather than print an absurd number, we return null and the UI says so.
 */
export const E1RM_REP_LIMIT = 15;

export type EstimateConfidence = 'high' | 'moderate' | 'low';

export interface E1RMInput {
  weightKg: number;
  reps: number;
  formula?: E1RMFormula;
}

/**
 * Estimated one-rep max.
 *
 * Returns null when the input cannot support an estimate (non-positive load,
 * zero reps, or a rep count beyond {@link E1RM_REP_LIMIT}). Callers must handle
 * null rather than rendering a fallback number.
 */
export function calculateE1RM({
  weightKg,
  reps,
  formula = 'epley',
}: E1RMInput): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0 || reps < 1) return null;
  if (reps > E1RM_REP_LIMIT) return null;

  // A single rep is the max by definition — no formula, no inflation.
  if (reps === 1) return round2(weightKg);

  let estimate: number;
  switch (formula) {
    case 'brzycki':
      // Denominator approaches zero near 37 reps; the rep limit keeps us clear.
      estimate = weightKg * (36 / (37 - reps));
      break;
    case 'lombardi':
      estimate = weightKg * Math.pow(reps, 0.1);
      break;
    case 'epley':
    default:
      estimate = weightKg * (1 + reps / 30);
      break;
  }

  if (!Number.isFinite(estimate) || estimate <= 0) return null;
  return round2(estimate);
}

/** How much to trust an estimate, based on how far it extrapolates. */
export function e1rmConfidence(reps: number): EstimateConfidence {
  if (reps <= 5) return 'high';
  if (reps <= 10) return 'moderate';
  return 'low';
}

/** The best estimated 1RM across a group of sets. Null when none qualify. */
export function bestE1RM(sets: WorkoutSet[], formula: E1RMFormula = 'epley'): number | null {
  let best: number | null = null;

  for (const set of sets) {
    if (!set.isComplete || set.weightKg === null || set.reps === null) continue;
    const estimate = calculateE1RM({
      weightKg: set.weightKg,
      reps: set.reps,
      formula,
    });
    if (estimate !== null && (best === null || estimate > best)) best = estimate;
  }

  return best;
}

/** Set types that represent real training stimulus rather than preparation. */
const WORKING_SET_TYPES: ReadonlySet<SetType> = new Set<SetType>([
  'working',
  'drop',
  'failure',
  'amrap',
  'backoff',
]);

export function isWorkingSet(set: WorkoutSet): boolean {
  return WORKING_SET_TYPES.has(set.setType);
}

export interface VolumeOptions {
  /** Warm-ups inflate tonnage without adding stimulus, so they're out by default. */
  includeWarmups?: boolean;
}

/**
 * Tonnage: sum of weight × reps over completed sets, in kg.
 * Sets without both a weight and a rep count contribute nothing.
 */
export function calculateVolume(
  sets: WorkoutSet[],
  { includeWarmups = false }: VolumeOptions = {},
): number {
  let total = 0;

  for (const set of sets) {
    if (!set.isComplete) continue;
    if (!includeWarmups && !isWorkingSet(set)) continue;
    if (set.weightKg === null || set.reps === null) continue;
    if (set.weightKg <= 0 || set.reps <= 0) continue;

    total += set.weightKg * set.reps;
  }

  return round2(total);
}

export function countWorkingSets(sets: WorkoutSet[]): number {
  return sets.filter((s) => s.isComplete && isWorkingSet(s)).length;
}

export function totalReps(sets: WorkoutSet[]): number {
  return sets.reduce(
    (sum, s) => (s.isComplete && s.reps !== null && s.reps > 0 ? sum + s.reps : sum),
    0,
  );
}

/** Heaviest completed set. Null when nothing qualifies. */
export function heaviestSet(sets: WorkoutSet[]): WorkoutSet | null {
  let best: WorkoutSet | null = null;

  for (const set of sets) {
    if (!set.isComplete || set.weightKg === null || set.weightKg <= 0) continue;
    if (best === null || set.weightKg > (best.weightKg ?? 0)) best = set;
  }

  return best;
}

// --- Progressive overload -------------------------------------------------

export type ProgressionStyleInput = 'weight' | 'reps' | 'double' | 'manual';

export interface ProgressionContext {
  /** Most recent session's working sets for this exercise, in order. */
  lastSessionSets: WorkoutSet[];
  style: ProgressionStyleInput;
  /** Smallest loadable jump, in kg. */
  increment?: number;
  /** Target rep window for double progression. */
  repRangeLow?: number;
  repRangeHigh?: number;
}

export interface ProgressionSuggestion {
  weightKg: number;
  reps: number;
  /** Short, honest rationale shown under the suggestion. */
  reason: string;
}

/**
 * Suggests the next session's top set.
 *
 * Returns null when there isn't enough history to say anything useful, or when
 * the user has chosen manual progression. Suggestions are never applied
 * automatically — the UI offers Accept / Edit / Skip.
 */
export function suggestProgression({
  lastSessionSets,
  style,
  increment = 2.5,
  repRangeLow = 6,
  repRangeHigh = 10,
}: ProgressionContext): ProgressionSuggestion | null {
  if (style === 'manual') return null;

  const working = lastSessionSets.filter(
    (s) => s.isComplete && isWorkingSet(s) && s.weightKg !== null && s.reps !== null,
  );
  if (working.length === 0) return null;

  const topWeight = Math.max(...working.map((s) => s.weightKg ?? 0));
  if (topWeight <= 0) return null;

  const setsAtTop = working.filter((s) => s.weightKg === topWeight);
  const repsAtTop = setsAtTop.map((s) => s.reps ?? 0);
  const minReps = Math.min(...repsAtTop);

  switch (style) {
    case 'weight': {
      // Only add load when every set at the top weight held its reps.
      const consistent = repsAtTop.length >= 2 && minReps === Math.max(...repsAtTop);
      if (!consistent) {
        return {
          weightKg: topWeight,
          reps: minReps,
          reason: 'Repeat last session to even out your sets first.',
        };
      }
      return {
        weightKg: roundToIncrement(topWeight + increment, increment),
        reps: minReps,
        reason: `You held ${minReps} reps across ${repsAtTop.length} sets.`,
      };
    }

    case 'reps': {
      return {
        weightKg: topWeight,
        reps: minReps + 1,
        reason: 'Add a rep before adding weight.',
      };
    }

    case 'double': {
      // Climb reps to the top of the window, then add load and reset to the bottom.
      if (minReps >= repRangeHigh) {
        return {
          weightKg: roundToIncrement(topWeight + increment, increment),
          reps: repRangeLow,
          reason: `You topped the ${repRangeLow}–${repRangeHigh} range. Add load, reset reps.`,
        };
      }
      return {
        weightKg: topWeight,
        reps: Math.min(minReps + 1, repRangeHigh),
        reason: `Work up to ${repRangeHigh} reps before adding load.`,
      };
    }

    default:
      return null;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
