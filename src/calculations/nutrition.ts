import type { FoodMacros, NutritionLogItem, NutritionTarget } from '@/database/schema';

/** Running totals for a meal or a day. */
export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

export const EMPTY_TOTALS: MacroTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
};

function safe(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Scales a food's per-serving macros by a quantity multiplier. */
export function scaleMacros(macros: FoodMacros, quantity: number): MacroTotals {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  return {
    calories: safe(macros.calories) * q,
    proteinG: safe(macros.proteinG) * q,
    carbsG: safe(macros.carbsG) * q,
    fatG: safe(macros.fatG) * q,
    fiberG: safe(macros.fiberG) * q,
    sugarG: safe(macros.sugarG) * q,
    sodiumMg: safe(macros.sodiumMg) * q,
  };
}

export function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: a.fiberG + b.fiberG,
    sugarG: a.sugarG + b.sugarG,
    sodiumMg: a.sodiumMg + b.sodiumMg,
  };
}

function roundTotals(t: MacroTotals): MacroTotals {
  return {
    calories: Math.round(t.calories),
    proteinG: Math.round(t.proteinG * 10) / 10,
    carbsG: Math.round(t.carbsG * 10) / 10,
    fatG: Math.round(t.fatG * 10) / 10,
    fiberG: Math.round(t.fiberG * 10) / 10,
    sugarG: Math.round(t.sugarG * 10) / 10,
    sodiumMg: Math.round(t.sodiumMg),
  };
}

export interface MacroTotalsOptions {
  /**
   * Count only items ticked off. Used for "what have I actually eaten so far"
   * versus "what is this meal planned to be".
   */
  completedOnly?: boolean;
}

/**
 * Totals a set of logged items.
 *
 * Reads the macro snapshot stored on each item rather than looking up the food,
 * so editing a food later never rewrites what a past day totalled.
 */
export function calculateMacroTotals(
  items: NutritionLogItem[],
  { completedOnly = false }: MacroTotalsOptions = {},
): MacroTotals {
  let totals = { ...EMPTY_TOTALS };

  for (const item of items) {
    if (completedOnly && !item.isComplete) continue;
    totals = addTotals(totals, scaleMacros(item, item.quantity));
  }

  return roundTotals(totals);
}

// --- Target adherence -----------------------------------------------------

export type AdherenceVerdict = 'under' | 'on_target' | 'over';

export interface MacroAdherence {
  actual: number;
  target: number;
  /** actual / target. 0 when the target is not set, never Infinity. */
  ratio: number;
  verdict: AdherenceVerdict;
  /** Signed distance to target in the macro's own unit. */
  remaining: number;
}

/**
 * Scores one macro against its target.
 *
 * `tolerance` defines a symmetric acceptable band (0.1 = ±10%). Being over a
 * target is reported as `over`, not as failure — different goals treat that
 * differently and the UI decides how to present it.
 */
export function evaluateMacro(
  actual: number,
  target: number,
  tolerance = 0,
): MacroAdherence {
  const safeActual = safe(actual);
  const safeTarget = safe(target);

  if (safeTarget <= 0) {
    return {
      actual: safeActual,
      target: 0,
      ratio: 0,
      verdict: 'on_target',
      remaining: 0,
    };
  }

  const ratio = safeActual / safeTarget;
  const lower = 1 - tolerance;
  const upper = 1 + tolerance;

  let verdict: AdherenceVerdict;
  if (ratio < lower) verdict = 'under';
  else if (ratio > upper) verdict = 'over';
  else verdict = 'on_target';

  return {
    actual: safeActual,
    target: safeTarget,
    ratio,
    verdict,
    remaining: Math.round((safeTarget - safeActual) * 10) / 10,
  };
}

export interface DayAdherence {
  calories: MacroAdherence;
  protein: MacroAdherence;
  carbs: MacroAdherence;
  fat: MacroAdherence;
  /** 0..1 nutrition score for the consistency engine. */
  score: number;
}

/**
 * Scores a day's nutrition.
 *
 * Protein is scored as "hit or approaching the target" (going over protein is
 * not penalised), while calories are scored against a tolerance band in both
 * directions. That asymmetry reflects how the targets are actually used.
 */
export function evaluateDay(totals: MacroTotals, target: NutritionTarget): DayAdherence {
  const tolerance = safe(target.calorieTolerance) || 0.1;

  const calories = evaluateMacro(totals.calories, target.calories, tolerance);
  const protein = evaluateMacro(totals.proteinG, target.proteinG, 0);
  const carbs = evaluateMacro(totals.carbsG, target.carbsG, tolerance);
  const fat = evaluateMacro(totals.fatG, target.fatG, tolerance);

  // Calories within band and protein met carry the score; carbs and fat inform
  // but do not dominate, matching how the targets are prioritised in practice.
  const calorieScore = calories.target > 0 ? bandScore(calories.ratio, tolerance) : 0;
  const proteinScore = protein.target > 0 ? Math.min(protein.ratio, 1) : 0;

  const parts = [calorieScore, proteinScore].filter((p) => Number.isFinite(p));
  const score = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;

  return {
    calories,
    protein,
    carbs,
    fat,
    score: clamp01(score),
  };
}

/**
 * 1.0 inside the tolerance band, tapering linearly to 0 at double the band
 * width. Deliberately continuous so a day just outside the band is not scored
 * the same as a day wildly outside it.
 */
function bandScore(ratio: number, tolerance: number): number {
  if (!Number.isFinite(ratio)) return 0;
  const distance = Math.abs(ratio - 1);
  if (distance <= tolerance) return 1;

  const falloff = Math.max(tolerance, 0.01) * 2;
  return clamp01(1 - (distance - tolerance) / falloff);
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

/** Counts days a target was met, e.g. "protein hit 24 / 30 days". */
export function countDaysMeetingTarget(
  dailyValues: number[],
  target: number,
): { met: number; total: number; ratio: number } {
  const total = dailyValues.length;
  if (total === 0 || !Number.isFinite(target) || target <= 0) {
    return { met: 0, total, ratio: 0 };
  }

  const met = dailyValues.filter((v) => Number.isFinite(v) && v >= target).length;
  return { met, total, ratio: met / total };
}

/** Counts days whose value landed inside a tolerance band around the target. */
export function countDaysWithinRange(
  dailyValues: number[],
  target: number,
  tolerance: number,
): { met: number; total: number; ratio: number } {
  const total = dailyValues.length;
  if (total === 0 || !Number.isFinite(target) || target <= 0) {
    return { met: 0, total, ratio: 0 };
  }

  const met = dailyValues.filter((v) => {
    if (!Number.isFinite(v)) return false;
    const ratio = v / target;
    return ratio >= 1 - tolerance && ratio <= 1 + tolerance;
  }).length;

  return { met, total, ratio: met / total };
}

export function averageOf(values: number[]): number | null {
  const usable = values.filter((v) => Number.isFinite(v));
  if (usable.length === 0) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}
