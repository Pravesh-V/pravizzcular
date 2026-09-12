import type { Database } from '@/database/Database';
import type { ID, LocalDate } from '@/database/schema';
import { Weekday } from '@/database/schema';
import { addDays, today, weekdayBit } from '@/utils/date';

import { canonicalise, SEED_EXERCISES } from './exercises';
import { SEED_FOODS } from './foods';

/**
 * Seeding.
 *
 * Two distinct things live here and must not be confused:
 *
 * - **Library content** (exercises, starter foods): real reference data that
 *   ships with the app and survives a demo reset.
 * - **Demo history** (workouts, logs, bodyweight): illustrative data so the
 *   app looks alive during development. Every row is flagged `isDemo` and is
 *   removed wholesale by {@link resetDemoData}.
 */

export function hasLibrary(db: Database): boolean {
  return db.all('exercises').length > 0;
}

/** Installs the built-in exercise library and starter foods. Idempotent. */
export function seedLibrary(db: Database, userId: ID): void {
  if (db.all('exercises').length === 0) {
    for (const seed of SEED_EXERCISES) {
      const exercise = db.insert('exercises', {
        userId,
        name: seed.name,
        canonicalName: canonicalise(seed.name),
        metricType: seed.metricType,
        primaryMuscle: seed.primaryMuscle,
        secondaryMuscles: seed.secondaryMuscles,
        equipment: seed.equipment,
        isCustom: false,
        isCompound: seed.isCompound,
        notes: null,
      });

      for (const alias of seed.aliases) {
        db.insert('exercise_aliases', {
          userId,
          exerciseId: exercise.id,
          alias: canonicalise(alias),
        });
      }
    }
  }

  if (db.all('foods').length === 0) {
    for (const food of SEED_FOODS) {
      db.insert('foods', {
        userId,
        name: food.name,
        canonicalName: canonicalise(food.name),
        brand: null,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        fiberG: food.fiberG,
        sugarG: food.sugarG,
        sodiumMg: food.sodiumMg,
        isDemo: false,
        isFavourite: false,
      });
    }
  }
}

const { monday, tuesday, wednesday, thursday, friday, saturday } = Weekday;

interface TemplateSeed {
  name: string;
  weekdays: number;
  exercises: { name: string; sets: number; low: number; high: number }[];
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    name: 'Push',
    weekdays: monday | thursday,
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, low: 6, high: 8 },
      { name: 'Overhead Press', sets: 3, low: 6, high: 10 },
      { name: 'Incline Barbell Press', sets: 3, low: 8, high: 10 },
      { name: 'Lateral Raise', sets: 3, low: 12, high: 15 },
      { name: 'Triceps Pushdown', sets: 3, low: 10, high: 12 },
    ],
  },
  {
    name: 'Pull',
    weekdays: tuesday | friday,
    exercises: [
      { name: 'Deadlift', sets: 3, low: 4, high: 6 },
      { name: 'Pull-up', sets: 4, low: 6, high: 10 },
      { name: 'Barbell Row', sets: 3, low: 8, high: 10 },
      { name: 'Seated Cable Row', sets: 3, low: 10, high: 12 },
      { name: 'Barbell Curl', sets: 3, low: 10, high: 12 },
    ],
  },
  {
    name: 'Legs',
    weekdays: saturday,
    exercises: [
      { name: 'Barbell Back Squat', sets: 4, low: 5, high: 8 },
      { name: 'Romanian Deadlift', sets: 3, low: 8, high: 10 },
      { name: 'Leg Press', sets: 3, low: 10, high: 12 },
      { name: 'Leg Curl', sets: 3, low: 12, high: 15 },
      { name: 'Standing Calf Raise', sets: 4, low: 12, high: 15 },
    ],
  },
];

/** Creates the starting workout templates, habits, meals and schedule. */
export function seedStarterContent(db: Database, userId: ID): void {
  const exerciseByName = new Map(db.all('exercises').map((e) => [e.name, e.id]));

  if (db.all('workout_templates').length === 0) {
    TEMPLATE_SEEDS.forEach((seed, index) => {
      const template = db.insert('workout_templates', {
        userId,
        name: seed.name,
        notes: null,
        scheduledWeekdays: seed.weekdays,
        position: index,
      });

      seed.exercises.forEach((ex, position) => {
        const exerciseId = exerciseByName.get(ex.name);
        if (!exerciseId) return;

        db.insert('template_exercises', {
          userId,
          templateId: template.id,
          exerciseId,
          position,
          targetSets: ex.sets,
          targetRepsLow: ex.low,
          targetRepsHigh: ex.high,
          notes: null,
        });
      });
    });
  }

  if (db.all('meal_templates').length === 0) {
    const meals = [
      { name: 'Breakfast', time: '08:00' },
      { name: 'Lunch', time: '13:00' },
      { name: 'Snack', time: '17:00' },
      { name: 'Dinner', time: '20:00' },
    ];

    const foodByName = new Map(db.all('foods').map((f) => [f.name, f.id]));
    const breakfastItems = [
      { name: 'Milk (full fat)', quantity: 1 },
      { name: 'Dahi (curd)', quantity: 2 },
      { name: 'Chana (boiled chickpeas)', quantity: 1 },
      { name: 'Matar (green peas)', quantity: 1 },
    ];

    meals.forEach((meal, index) => {
      const template = db.insert('meal_templates', {
        userId,
        name: meal.name,
        position: index,
        defaultTime: meal.time,
        isDemo: false,
      });

      if (meal.name !== 'Breakfast') return;

      breakfastItems.forEach((item, position) => {
        const foodId = foodByName.get(item.name);
        if (!foodId) return;

        db.insert('meal_template_items', {
          userId,
          mealTemplateId: template.id,
          foodId,
          quantity: item.quantity,
          position,
        });
      });
    });
  }

  if (db.all('nutrition_targets').length === 0) {
    db.insert('nutrition_targets', {
      userId,
      effectiveFrom: '2000-01-01',
      calories: 2400,
      proteinG: 160,
      carbsG: 280,
      fatG: 70,
      calorieTolerance: 0.1,
    });
  }

  if (db.all('habits').length === 0) {
    const habits = [
      { name: 'Water', icon: '💧', valueType: 'numeric' as const, target: 3, unit: 'L' },
      {
        name: 'Sleep 7h+',
        icon: '😴',
        valueType: 'duration' as const,
        target: 7 * 3600,
        unit: 'h',
      },
      { name: 'Creatine', icon: '⚡', valueType: 'boolean' as const, target: 1, unit: null },
      { name: 'Omega-3', icon: '🐟', valueType: 'boolean' as const, target: 1, unit: null },
      {
        name: 'Steps',
        icon: '👟',
        valueType: 'numeric' as const,
        target: 8000,
        unit: 'steps',
      },
      { name: 'Reading', icon: '📖', valueType: 'boolean' as const, target: 1, unit: null },
    ];

    habits.forEach((habit, index) => {
      db.insert('habits', {
        userId,
        name: habit.name,
        icon: habit.icon,
        valueType: habit.valueType,
        targetValue: habit.target,
        unit: habit.unit,
        cadence: 'daily',
        weekdays: 0b1111111,
        position: index,
        isActive: true,
        isDemo: false,
      });
    });
  }

  if (db.all('schedule_items').length === 0) {
    const items = [
      { title: 'Breakfast', kind: 'meal' as const, time: '08:00', days: 0b1111111 },
      {
        title: 'College',
        kind: 'study' as const,
        time: '10:00',
        days: monday | tuesday | wednesday | thursday | friday,
      },
      { title: 'Lunch', kind: 'meal' as const, time: '13:00', days: 0b1111111 },
      {
        title: 'Gym',
        kind: 'workout' as const,
        time: '17:30',
        days: monday | tuesday | thursday | friday | saturday,
      },
      { title: 'Dinner', kind: 'meal' as const, time: '20:00', days: 0b1111111 },
      { title: 'Sleep target', kind: 'sleep' as const, time: '22:30', days: 0b1111111 },
    ];

    items.forEach((item, index) => {
      db.insert('schedule_items', {
        userId,
        title: item.title,
        kind: item.kind,
        timeOfDay: item.time,
        durationMin: null,
        isRecurring: true,
        weekdays: item.days,
        specificDate: null,
        refId: null,
        position: index,
        isActive: true,
        isDemo: false,
      });
    });
  }
}

// --- Demo history ---------------------------------------------------------

/**
 * Deterministic pseudo-random source.
 *
 * Seeded so the generated demo history is identical on every install, which
 * keeps screenshots and manual QA reproducible.
 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const DEMO_PROGRESSION: Record<string, { start: number; weeklyGain: number; reps: number }> =
  {
    'Barbell Bench Press': { start: 72.5, weeklyGain: 1.25, reps: 8 },
    'Overhead Press': { start: 45, weeklyGain: 0.6, reps: 8 },
    'Incline Barbell Press': { start: 55, weeklyGain: 0.9, reps: 9 },
    'Lateral Raise': { start: 10, weeklyGain: 0.25, reps: 14 },
    'Triceps Pushdown': { start: 25, weeklyGain: 0.5, reps: 12 },
    Deadlift: { start: 125, weeklyGain: 2.2, reps: 5 },
    'Pull-up': { start: 0, weeklyGain: 0, reps: 8 },
    'Barbell Row': { start: 60, weeklyGain: 1.1, reps: 9 },
    'Seated Cable Row': { start: 50, weeklyGain: 0.9, reps: 11 },
    'Barbell Curl': { start: 25, weeklyGain: 0.4, reps: 11 },
    'Barbell Back Squat': { start: 95, weeklyGain: 1.8, reps: 6 },
    'Romanian Deadlift': { start: 80, weeklyGain: 1.3, reps: 9 },
    'Leg Press': { start: 140, weeklyGain: 3, reps: 11 },
    'Leg Curl': { start: 35, weeklyGain: 0.6, reps: 13 },
    'Standing Calf Raise': { start: 60, weeklyGain: 1, reps: 14 },
  };

export interface DemoOptions {
  /** How far back the generated history runs. */
  weeks?: number;
  /** Anchor for "today". Injected by tests; defaults to the real current day. */
  referenceDate?: LocalDate;
}

/**
 * Generates a plausible training, nutrition, habit and bodyweight history.
 *
 * The numbers trend upward but with realistic variance and the occasional
 * missed session — a flawless history would make every insight meaningless.
 */
export function seedDemoHistory(
  db: Database,
  userId: ID,
  { weeks = 10, referenceDate }: DemoOptions = {},
): void {
  const settings = db.all('user_settings').find((s) => s.userId === userId);
  const timezone = settings?.timezone ?? 'UTC';
  const end = referenceDate ?? today(timezone);
  const start = addDays(end, -(weeks * 7 - 1));

  const random = makeRandom(20260915);
  const templates = db.all('workout_templates');
  const exercises = db.all('exercises');
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const templateExercises = db.all('template_exercises');
  const habits = db.all('habits');
  const mealTemplates = db.all('meal_templates');
  const foods = db.all('foods');
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const mealItems = db.all('meal_template_items');

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset += 1) {
    const date = addDays(start, dayOffset);
    const weekIndex = Math.floor(dayOffset / 7);
    const bit = weekdayBit(date);
    const isToday = date === end;

    // --- Training ---
    const template = templates.find((t) => (t.scheduledWeekdays & bit) !== 0);
    if (template) {
      // Compliance improves over the period; ~12% of sessions are still missed.
      const complianceFloor = 0.78 + Math.min(weekIndex, 8) * 0.02;
      const attended = isToday ? false : random() < complianceFloor;

      if (attended) {
        const durationSec = Math.round((52 + random() * 18) * 60);
        const workout = db.insert('workouts', {
          userId,
          templateId: template.id,
          name: template.name,
          status: 'completed',
          scheduledFor: date,
          startedAt: `${date}T12:00:00.000Z`,
          completedAt: `${date}T13:00:00.000Z`,
          durationSec,
          notes: null,
          isDemo: true,
        });

        const planned = templateExercises
          .filter((te) => te.templateId === template.id)
          .sort((a, b) => a.position - b.position);

        planned.forEach((te, position) => {
          const exercise = exerciseById.get(te.exerciseId);
          if (!exercise) return;

          const workoutExercise = db.insert('workout_exercises', {
            userId,
            workoutId: workout.id,
            exerciseId: te.exerciseId,
            position,
            notes: null,
          });

          const curve = DEMO_PROGRESSION[exercise.name];
          if (!curve) return;

          for (let setIndex = 1; setIndex <= te.targetSets; setIndex += 1) {
            const drift = (random() - 0.5) * 2.5;
            const weight =
              curve.start > 0
                ? Math.max(
                    2.5,
                    Math.round((curve.start + curve.weeklyGain * weekIndex + drift) / 2.5) *
                      2.5,
                  )
                : null;

            const repDrift = Math.round((random() - 0.5) * 2);
            const reps = Math.max(1, curve.reps + repDrift);

            db.insert('sets', {
              userId,
              workoutExerciseId: workoutExercise.id,
              setIndex,
              setType: setIndex === 1 ? 'warmup' : 'working',
              weightKg: exercise.metricType === 'reps' ? null : weight,
              reps: exercise.metricType === 'duration' ? null : reps,
              durationSec: exercise.metricType === 'duration' ? 45 + setIndex * 5 : null,
              distanceM: null,
              rpe: null,
              rir: null,
              isComplete: true,
              loggedAt: `${date}T12:${String(10 + setIndex * 3).padStart(2, '0')}:00.000Z`,
            });
          }
        });
      }
    }

    // --- Nutrition ---
    for (const meal of mealTemplates) {
      const items = mealItems.filter((mi) => mi.mealTemplateId === meal.id);
      if (items.length === 0) continue;

      const logged = isToday ? random() < 0.6 : random() < 0.86;
      if (!logged) continue;

      const log = db.insert('nutrition_logs', {
        userId,
        localDate: date,
        mealTemplateId: meal.id,
        mealName: meal.name,
        position: meal.position,
        isComplete: true,
        isDemo: true,
      });

      items.forEach((item, position) => {
        const food = foodById.get(item.foodId);
        if (!food) return;

        db.insert('nutrition_log_items', {
          userId,
          nutritionLogId: log.id,
          foodId: food.id,
          foodName: food.name,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
          quantity: item.quantity,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          fiberG: food.fiberG,
          sugarG: food.sugarG,
          sodiumMg: food.sodiumMg,
          isComplete: true,
          position,
        });
      });
    }

    // --- Habits ---
    for (const habit of habits) {
      const hit = random() < 0.8;
      let value: number;

      switch (habit.valueType) {
        case 'numeric':
          value = habit.targetValue * (hit ? 1 + random() * 0.15 : 0.6 + random() * 0.3);
          break;
        case 'duration':
          value = habit.targetValue * (hit ? 1 + random() * 0.12 : 0.75 + random() * 0.2);
          break;
        default:
          value = hit ? 1 : 0;
      }

      value = Math.round(value * 10) / 10;

      db.insert('habit_logs', {
        userId,
        habitId: habit.id,
        localDate: date,
        value,
        isComplete: value >= habit.targetValue,
        isDemo: true,
      });
    }

    // --- Bodyweight (Tuesdays and Saturdays, per the reference tracker) ---
    if ((bit & (tuesday | saturday)) !== 0) {
      const base = 71.2 + weekIndex * 0.13;
      db.insert('bodyweight_logs', {
        userId,
        localDate: date,
        weightKg: Math.round((base + (random() - 0.5) * 0.6) * 10) / 10,
        note: null,
        isDemo: true,
      });
    }
  }

  seedDemoGoals(db, userId, end);
}

function seedDemoGoals(db: Database, userId: ID, referenceDate: LocalDate): void {
  if (db.all('goals').length > 0) return;

  const bench = db.all('exercises').find((e) => e.name === 'Barbell Bench Press');

  const goal = db.insert('goals', {
    userId,
    title: 'Bench 100 kg',
    goalType: 'strength',
    exerciseId: bench?.id ?? null,
    metric: 'max_weight',
    startValue: 72.5,
    targetValue: 100,
    unit: 'kg',
    targetDate: addDays(referenceDate, 120),
    status: 'active',
    achievedAt: null,
    lowerIsBetter: false,
  });

  [85, 90, 95, 100].forEach((value, position) => {
    db.insert('goal_milestones', {
      userId,
      goalId: goal.id,
      value,
      label: `${value} kg`,
      position,
      achievedAt: null,
    });
  });

  db.insert('goals', {
    userId,
    title: 'Train 4× per week',
    goalType: 'frequency',
    exerciseId: null,
    metric: 'workouts_per_week',
    startValue: 3,
    targetValue: 4,
    unit: 'sessions',
    targetDate: null,
    status: 'active',
    achievedAt: null,
    lowerIsBetter: false,
  });
}

/** True when any demo-flagged row exists. Drives the Settings toggle. */
export function hasDemoData(db: Database): boolean {
  return (
    db.all('workouts').some((w) => w.isDemo) ||
    db.all('nutrition_logs').some((n) => n.isDemo) ||
    db.all('habit_logs').some((h) => h.isDemo) ||
    db.all('bodyweight_logs').some((b) => b.isDemo)
  );
}

/**
 * Removes every demo-flagged row and the records hanging off them.
 * Library content and anything the user logged themselves is left untouched.
 */
export async function resetDemoData(db: Database): Promise<void> {
  const demoWorkoutIds = new Set(
    db.all('workouts').filter((w) => w.isDemo).map((w) => w.id),
  );
  const demoWorkoutExerciseIds = new Set(
    db
      .all('workout_exercises')
      .filter((we) => demoWorkoutIds.has(we.workoutId))
      .map((we) => we.id),
  );
  const demoLogIds = new Set(
    db.all('nutrition_logs').filter((n) => n.isDemo).map((n) => n.id),
  );

  db.hardDelete('sets', (row) =>
    demoWorkoutExerciseIds.has(
      (row as unknown as { workoutExerciseId: string }).workoutExerciseId,
    ),
  );
  db.hardDelete('workout_exercises', (row) => demoWorkoutExerciseIds.has(row.id));
  db.hardDelete('workouts', (row) => demoWorkoutIds.has(row.id));
  db.hardDelete('nutrition_log_items', (row) =>
    demoLogIds.has((row as unknown as { nutritionLogId: string }).nutritionLogId),
  );
  db.hardDelete('nutrition_logs', (row) => demoLogIds.has(row.id));
  db.hardDelete('habit_logs', (row) => (row as { isDemo?: boolean }).isDemo === true);
  db.hardDelete('bodyweight_logs', (row) => (row as { isDemo?: boolean }).isDemo === true);
  db.hardDelete('personal_records', () => true);
  db.hardDelete('daily_summaries', () => true);
  db.hardDelete('monthly_summaries', () => true);

  await db.flush();
}
