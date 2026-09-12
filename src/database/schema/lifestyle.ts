import type { ID, ISOTimestamp, LocalDate, LocalTime, OwnedEntity } from './common';

export type HabitValueType = 'boolean' | 'numeric' | 'duration';
export type HabitCadence = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Habit extends OwnedEntity {
  name: string;
  /** Emoji or icon key. Kept as a string so no icon set is baked into the data. */
  icon: string | null;
  valueType: HabitValueType;
  /** Target per period. For boolean habits this is always 1. */
  targetValue: number;
  /** Display unit, e.g. 'L', 'steps', 'pages'. Null for boolean habits. */
  unit: string | null;
  cadence: HabitCadence;
  /** Which days count, when cadence is 'weekdays'. */
  weekdays: number;
  position: number;
  isActive: boolean;
  isDemo: boolean;
}

export interface HabitLog extends OwnedEntity {
  habitId: ID;
  localDate: LocalDate;
  /** Raw logged amount: 3.2 litres, 7.7 hours, or 1/0 for boolean habits. */
  value: number;
  /** Cached at write time against the target then in force. */
  isComplete: boolean;
  isDemo: boolean;
}

export type ScheduleKind =
  | 'workout'
  | 'meal'
  | 'study'
  | 'work'
  | 'sleep'
  | 'custom';

/**
 * An entry in the daily timeline. Either recurring (weekday mask) or pinned to
 * one specific date.
 */
export interface ScheduleItem extends OwnedEntity {
  title: string;
  kind: ScheduleKind;
  timeOfDay: LocalTime;
  durationMin: number | null;
  isRecurring: boolean;
  weekdays: number;
  specificDate: LocalDate | null;
  /** Optional link to the workout template or meal template this represents. */
  refId: ID | null;
  position: number;
  isActive: boolean;
  isDemo: boolean;
}

export interface ScheduleCompletion extends OwnedEntity {
  scheduleItemId: ID;
  localDate: LocalDate;
  completedAt: ISOTimestamp;
}

export interface BodyweightLog extends OwnedEntity {
  localDate: LocalDate;
  weightKg: number;
  note: string | null;
  isDemo: boolean;
}
