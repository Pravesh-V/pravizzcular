/**
 * Shared primitives for every stored entity.
 *
 * Canonical storage units — display conversion happens at the UI edge only:
 *   weight   kilograms   (kg)
 *   height   centimetres (cm)
 *   distance metres      (m)
 *   duration seconds     (s)
 *   energy   kilocalories(kcal)
 *   macros   grams       (g)
 */

/** Client-generated UUID. Stable across devices so sync never has to renumber. */
export type ID = string;

/** Absolute instant, ISO-8601 with timezone, e.g. '2026-09-12T18:30:00.000Z'. */
export type ISOTimestamp = string;

/**
 * A calendar day in the *user's* timezone, 'YYYY-MM-DD'.
 *
 * Anything that belongs to a day (a meal, a habit tick, a bodyweight reading)
 * is keyed by this, never by a UTC timestamp. That is what stops a 23:30 log
 * from sliding into tomorrow for users east of UTC.
 */
export type LocalDate = string;

/** 'HH:mm' in the user's local time. */
export type LocalTime = string;

export interface BaseEntity {
  id: ID;
  createdAt: ISOTimestamp;
  /** Bumped on every write. Drives last-write-wins reconciliation during sync. */
  updatedAt: ISOTimestamp;
  /** Soft delete. Rows are retained so history and audits stay intact. */
  deletedAt: ISOTimestamp | null;
}

export interface OwnedEntity extends BaseEntity {
  userId: ID;
}

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft';
export type DistanceUnit = 'km' | 'mi';
export type TimeFormat = '12h' | '24h';

export type Sex = 'male' | 'female' | 'unspecified';

/** Mirrors the theme layer's preference union, stored on user settings. */
export type ThemePreferenceValue = 'dark' | 'light' | 'system';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

/** Bitmask, Monday = 1 << 0 … Sunday = 1 << 6. */
export type WeekdayMask = number;

export const Weekday = {
  monday: 1 << 0,
  tuesday: 1 << 1,
  wednesday: 1 << 2,
  thursday: 1 << 3,
  friday: 1 << 4,
  saturday: 1 << 5,
  sunday: 1 << 6,
} as const;

export const ALL_WEEKDAYS: WeekdayMask = 0b1111111;
