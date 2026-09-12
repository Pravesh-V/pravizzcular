import type { ID, LocalDate, OwnedEntity } from './common';

/** Per-serving macros. All values are for exactly one `servingSize` unit. */
export interface FoodMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

export interface Food extends OwnedEntity, FoodMacros {
  name: string;
  canonicalName: string;
  brand: string | null;
  /** Numeric size of one serving, e.g. 500 for "500 ml". */
  servingSize: number;
  /** Unit label for one serving, e.g. 'ml', 'g', 'piece', 'bowl'. */
  servingUnit: string;
  /** Part of the clearly-labelled demo dataset; removed by "reset demo data". */
  isDemo: boolean;
  isFavourite: boolean;
}

/** A reusable meal, e.g. "Breakfast" = milk + dahi + chana. */
export interface MealTemplate extends OwnedEntity {
  name: string;
  position: number;
  /** Typical time of day, used to order the day's timeline. */
  defaultTime: string | null;
  isDemo: boolean;
}

export interface MealTemplateItem extends OwnedEntity {
  mealTemplateId: ID;
  foodId: ID;
  /** Multiplier on the food's serving size. 2 = "Dahi ×2". */
  quantity: number;
  position: number;
}

/** One meal as actually eaten on one day. */
export interface NutritionLog extends OwnedEntity {
  localDate: LocalDate;
  /** Null once the source template is deleted; the log survives regardless. */
  mealTemplateId: ID | null;
  /** Snapshotted so renaming a template never rewrites history. */
  mealName: string;
  position: number;
  isComplete: boolean;
  isDemo: boolean;
}

/**
 * A food inside a logged meal.
 *
 * Macros are snapshotted at log time rather than joined from `foods`. This is
 * a deliberate exception to "don't duplicate derived data": editing a food's
 * macros tomorrow must not silently rewrite what last month's totals were.
 */
export interface NutritionLogItem extends OwnedEntity, FoodMacros {
  nutritionLogId: ID;
  /** Null if the food was later deleted. The snapshot below still stands. */
  foodId: ID | null;
  foodName: string;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  isComplete: boolean;
  position: number;
}

/**
 * Macro targets, versioned by start date so historical adherence is scored
 * against the target that was actually in force on that day.
 */
export interface NutritionTarget extends OwnedEntity {
  effectiveFrom: LocalDate;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /**
   * Acceptable band around the calorie target, as a fraction (0.1 = ±10%).
   * Exceeding a target is not automatically a failure — this defines the range.
   */
  calorieTolerance: number;
}
