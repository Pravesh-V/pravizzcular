import { useMemo } from 'react';

import {
  calculateConsistency,
  calculateMacroTotals,
  clamp01,
  evaluateDay,
  trainingScoreForDay,
  weightsFromConfig,
  type ConsistencyResult,
  type DayAdherence,
  type MacroTotals,
} from '@/calculations';
import type {
  Habit,
  HabitLog,
  LocalDate,
  NutritionTarget,
  ScheduleItem,
  Workout,
  WorkoutTemplate,
} from '@/database/schema';
import { useLiveQuery } from '@/services/database/DatabaseProvider';
import { useSession } from '@/services/session/SessionProvider';
import { today as resolveToday, toLocalTime, weekdayBit } from '@/utils/date';

export interface TimelineEntry {
  item: ScheduleItem;
  completed: boolean;
  /** The next thing due today, highlighted in the timeline. */
  isNext: boolean;
}

export interface HabitProgress {
  habit: Habit;
  log: HabitLog | null;
  value: number;
  complete: boolean;
}

export interface TodayState {
  date: LocalDate;
  /** The template scheduled for today, if any. Null on a rest day. */
  plannedTemplate: WorkoutTemplate | null;
  workout: Workout | null;
  isRestDay: boolean;
  /** 'HH:mm' from the schedule, when a gym slot exists today. */
  workoutTime: string | null;

  totals: MacroTotals;
  target: NutritionTarget | null;
  nutrition: DayAdherence | null;

  habits: HabitProgress[];
  habitsComplete: number;
  habitsTotal: number;

  timeline: TimelineEntry[];
  consistency: ConsistencyResult;
}

/**
 * Assembles everything the Home screen shows for the current local day.
 *
 * Every value is derived from logged rows through the pure calculation layer —
 * nothing here is fabricated or padded. When data is absent the fields are null
 * and the UI renders an empty state rather than a zero.
 */
export function useToday(now: Date = new Date()): TodayState {
  const { settings, consistency: consistencyConfig } = useSession();
  const timezone = settings?.timezone ?? 'UTC';
  const date = resolveToday(timezone, now);
  // Must come from the same timezone as `date`, or "up next" disagrees with
  // the day it is scoped to.
  const currentTime = toLocalTime(now, timezone);

  const data = useLiveQuery((db) => {
    const bit = weekdayBit(date);

    const plannedTemplate =
      db.all('workout_templates').find((t) => (t.scheduledWeekdays & bit) !== 0) ?? null;

    const workout = db.all('workouts').find((w) => w.scheduledFor === date) ?? null;

    const scheduleItems = db
      .all('schedule_items')
      .filter((s) => s.isActive)
      .filter((s) => (s.isRecurring ? (s.weekdays & bit) !== 0 : s.specificDate === date))
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

    const completions = new Set(
      db
        .all('schedule_completions')
        .filter((c) => c.localDate === date)
        .map((c) => c.scheduleItemId),
    );

    const logs = db.all('nutrition_logs').filter((l) => l.localDate === date);
    const logIds = new Set(logs.map((l) => l.id));
    const items = db
      .all('nutrition_log_items')
      .filter((i) => logIds.has(i.nutritionLogId));

    // The target in force on this date, not merely the newest one.
    const target =
      db
        .all('nutrition_targets')
        .filter((t) => t.effectiveFrom <= date)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;

    const habits = db
      .all('habits')
      .filter((h) => h.isActive)
      .sort((a, b) => a.position - b.position);

    const habitLogs = db.all('habit_logs').filter((l) => l.localDate === date);

    return {
      plannedTemplate,
      workout,
      scheduleItems,
      completions,
      items,
      target,
      habits,
      habitLogs,
    };
  });

  return useMemo(() => {
    const totals = calculateMacroTotals(data.items, { completedOnly: true });
    const nutrition = data.target ? evaluateDay(totals, data.target) : null;

    const habits: HabitProgress[] = data.habits.map((habit) => {
      const log = data.habitLogs.find((l) => l.habitId === habit.id) ?? null;
      const value = log?.value ?? 0;
      return {
        habit,
        log,
        value,
        complete: log?.isComplete ?? value >= habit.targetValue,
      };
    });

    const habitsComplete = habits.filter((h) => h.complete).length;

    const workoutSlot =
      data.scheduleItems.find((s) => s.kind === 'workout')?.timeOfDay ?? null;

    const isRestDay = data.plannedTemplate === null;
    const workoutCompleted = data.workout?.status === 'completed';

    // The next incomplete entry whose time has not yet passed.
    const nextIndex = data.scheduleItems.findIndex(
      (s) => !data.completions.has(s.id) && s.timeOfDay >= currentTime,
    );

    const timeline: TimelineEntry[] = data.scheduleItems.map((item, index) => ({
      item,
      completed: data.completions.has(item.id),
      isNext: index === nextIndex,
    }));

    const habitScore = habits.length > 0 ? clamp01(habitsComplete / habits.length) : null;

    const consistency = calculateConsistency(
      {
        training: trainingScoreForDay({
          workoutPlanned: !isRestDay,
          workoutCompleted,
          isRestDay,
        }),
        nutrition: nutrition?.score ?? null,
        habits: habitScore,
        // Sleep and water are tracked as habits in this build, so they are not
        // scored separately — double-counting them would distort the weighting.
        sleep: null,
        water: null,
      },
      consistencyConfig ? weightsFromConfig(consistencyConfig) : undefined,
    );

    return {
      date,
      plannedTemplate: data.plannedTemplate,
      workout: data.workout,
      isRestDay,
      workoutTime: workoutSlot,
      totals,
      target: data.target,
      nutrition,
      habits,
      habitsComplete,
      habitsTotal: habits.length,
      timeline,
      consistency,
    };
  }, [data, date, currentTime, consistencyConfig]);
}
