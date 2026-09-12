import type {
  Equipment,
  ExerciseMetricType,
  MuscleGroup,
} from '@/database/schema';

export interface SeedExercise {
  name: string;
  metricType: ExerciseMetricType;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  isCompound: boolean;
  aliases: string[];
}

/**
 * Built-in exercise library.
 *
 * This is real reference data, not demo data: it ships with the app and is not
 * removed by "reset demo data". Users can add their own on top.
 *
 * Aliases exist so search is forgiving — "bench", "flat bench" and "barbell
 * bench press" all resolve to one canonical exercise.
 */
export const SEED_EXERCISES: SeedExercise[] = [
  // --- Chest ---
  {
    name: 'Barbell Bench Press',
    metricType: 'weight_reps',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['bench', 'bench press', 'flat bench', 'barbell bench'],
  },
  {
    name: 'Incline Barbell Press',
    metricType: 'weight_reps',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['incline bench', 'incline press'],
  },
  {
    name: 'Dumbbell Bench Press',
    metricType: 'weight_reps',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'dumbbell',
    isCompound: true,
    aliases: ['db bench', 'dumbbell press'],
  },
  {
    name: 'Cable Fly',
    metricType: 'weight_reps',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    equipment: 'cable',
    isCompound: false,
    aliases: ['fly', 'chest fly', 'pec fly'],
  },
  {
    name: 'Push-up',
    metricType: 'bodyweight',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'bodyweight',
    isCompound: true,
    aliases: ['pushup', 'press up'],
  },

  // --- Back ---
  {
    name: 'Deadlift',
    metricType: 'weight_reps',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'glutes', 'forearms'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['conventional deadlift', 'dl'],
  },
  {
    name: 'Barbell Row',
    metricType: 'weight_reps',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['bent over row', 'bb row', 'row'],
  },
  {
    name: 'Pull-up',
    metricType: 'reps',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'bodyweight',
    isCompound: true,
    aliases: ['pullup', 'pull ups', 'chin up'],
  },
  {
    name: 'Assisted Pull-up',
    metricType: 'assisted',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'machine',
    isCompound: true,
    aliases: ['assisted pullup'],
  },
  {
    name: 'Lat Pulldown',
    metricType: 'weight_reps',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    isCompound: true,
    aliases: ['pulldown', 'lat pull'],
  },
  {
    name: 'Seated Cable Row',
    metricType: 'weight_reps',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    isCompound: true,
    aliases: ['cable row', 'seated row'],
  },

  // --- Legs ---
  {
    name: 'Barbell Back Squat',
    metricType: 'weight_reps',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['squat', 'back squat', 'bb squat'],
  },
  {
    name: 'Front Squat',
    metricType: 'weight_reps',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['front squats'],
  },
  {
    name: 'Romanian Deadlift',
    metricType: 'weight_reps',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['rdl', 'romanian dl', 'stiff leg deadlift'],
  },
  {
    name: 'Leg Press',
    metricType: 'weight_reps',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes'],
    equipment: 'machine',
    isCompound: true,
    aliases: ['legpress'],
  },
  {
    name: 'Leg Curl',
    metricType: 'weight_reps',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    equipment: 'machine',
    isCompound: false,
    aliases: ['hamstring curl'],
  },
  {
    name: 'Leg Extension',
    metricType: 'weight_reps',
    primaryMuscle: 'quads',
    secondaryMuscles: [],
    equipment: 'machine',
    isCompound: false,
    aliases: ['quad extension'],
  },
  {
    name: 'Walking Lunge',
    metricType: 'weight_reps',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    isCompound: true,
    aliases: ['lunge', 'lunges'],
  },
  {
    name: 'Standing Calf Raise',
    metricType: 'weight_reps',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: 'machine',
    isCompound: false,
    aliases: ['calf raise', 'calves'],
  },

  // --- Shoulders ---
  {
    name: 'Overhead Press',
    metricType: 'weight_reps',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'barbell',
    isCompound: true,
    aliases: ['ohp', 'military press', 'shoulder press', 'strict press'],
  },
  {
    name: 'Dumbbell Shoulder Press',
    metricType: 'weight_reps',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    isCompound: true,
    aliases: ['db shoulder press', 'seated dumbbell press'],
  },
  {
    name: 'Lateral Raise',
    metricType: 'weight_reps',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    isCompound: false,
    aliases: ['side raise', 'lat raise', 'side lateral'],
  },
  {
    name: 'Face Pull',
    metricType: 'weight_reps',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: 'cable',
    isCompound: false,
    aliases: ['facepull', 'rear delt pull'],
  },

  // --- Arms ---
  {
    name: 'Barbell Curl',
    metricType: 'weight_reps',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    isCompound: false,
    aliases: ['bicep curl', 'bb curl', 'curl'],
  },
  {
    name: 'Dumbbell Curl',
    metricType: 'weight_reps',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    isCompound: false,
    aliases: ['db curl', 'alternating curl'],
  },
  {
    name: 'Triceps Pushdown',
    metricType: 'weight_reps',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    isCompound: false,
    aliases: ['pushdown', 'tricep pushdown', 'rope pushdown'],
  },
  {
    name: 'Skull Crusher',
    metricType: 'weight_reps',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'barbell',
    isCompound: false,
    aliases: ['lying triceps extension', 'skullcrusher'],
  },

  // --- Core ---
  {
    name: 'Plank',
    metricType: 'duration',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: 'bodyweight',
    isCompound: false,
    aliases: ['front plank'],
  },
  {
    name: 'Hanging Leg Raise',
    metricType: 'reps',
    primaryMuscle: 'core',
    secondaryMuscles: ['forearms'],
    equipment: 'bodyweight',
    isCompound: false,
    aliases: ['leg raise', 'hanging knee raise'],
  },
  {
    name: 'Cable Crunch',
    metricType: 'weight_reps',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'cable',
    isCompound: false,
    aliases: ['kneeling crunch'],
  },

  // --- Cardio ---
  {
    name: 'Running',
    metricType: 'distance_duration',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quads', 'calves'],
    equipment: 'other',
    isCompound: false,
    aliases: ['run', 'jog', 'treadmill'],
  },
  {
    name: 'Cycling',
    metricType: 'distance_duration',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quads'],
    equipment: 'other',
    isCompound: false,
    aliases: ['bike', 'cycle', 'stationary bike'],
  },
  {
    name: 'Rowing Machine',
    metricType: 'distance_duration',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['back', 'quads'],
    equipment: 'machine',
    isCompound: false,
    aliases: ['erg', 'rower'],
  },
];

/** Normalises a name for search and duplicate detection. */
export function canonicalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
