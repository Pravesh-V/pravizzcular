import type {
  Achievement,
  AiConversation,
  AiMessage,
  AppNotification,
  BodyweightLog,
  ConsistencyConfig,
  DailySummary,
  Exercise,
  ExerciseAlias,
  Food,
  Goal,
  GoalMilestone,
  Habit,
  HabitLog,
  MealTemplate,
  MealTemplateItem,
  MonthlySummary,
  NotificationPreference,
  NutritionLog,
  NutritionLogItem,
  NutritionTarget,
  PercentileDataset,
  PercentileDistribution,
  PercentileResult,
  PersonalRecord,
  Profile,
  ScheduleCompletion,
  ScheduleItem,
  TemplateExercise,
  User,
  UserAchievement,
  UserSettings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplate,
} from './schema';

/**
 * The full set of stored collections and the entity each holds.
 *
 * Names match the Postgres tables in `supabase/migrations` one-for-one, so the
 * eventual backend migration is a transport change rather than a remodel.
 */
export interface CollectionMap {
  users: User;
  profiles: Profile;
  user_settings: UserSettings;
  consistency_config: ConsistencyConfig;

  exercises: Exercise;
  exercise_aliases: ExerciseAlias;
  workout_templates: WorkoutTemplate;
  template_exercises: TemplateExercise;
  workouts: Workout;
  workout_exercises: WorkoutExercise;
  sets: WorkoutSet;
  personal_records: PersonalRecord;

  foods: Food;
  meal_templates: MealTemplate;
  meal_template_items: MealTemplateItem;
  nutrition_logs: NutritionLog;
  nutrition_log_items: NutritionLogItem;
  nutrition_targets: NutritionTarget;

  habits: Habit;
  habit_logs: HabitLog;
  schedule_items: ScheduleItem;
  schedule_completions: ScheduleCompletion;
  bodyweight_logs: BodyweightLog;

  goals: Goal;
  goal_milestones: GoalMilestone;
  daily_summaries: DailySummary;
  monthly_summaries: MonthlySummary;
  achievements: Achievement;
  user_achievements: UserAchievement;

  notifications: AppNotification;
  notification_preferences: NotificationPreference;
  ai_conversations: AiConversation;
  ai_messages: AiMessage;
  percentile_datasets: PercentileDataset;
  percentile_distributions: PercentileDistribution;
  percentile_results: PercentileResult;
}

export const COLLECTION_NAMES = [
  'users',
  'profiles',
  'user_settings',
  'consistency_config',
  'exercises',
  'exercise_aliases',
  'workout_templates',
  'template_exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'personal_records',
  'foods',
  'meal_templates',
  'meal_template_items',
  'nutrition_logs',
  'nutrition_log_items',
  'nutrition_targets',
  'habits',
  'habit_logs',
  'schedule_items',
  'schedule_completions',
  'bodyweight_logs',
  'goals',
  'goal_milestones',
  'daily_summaries',
  'monthly_summaries',
  'achievements',
  'user_achievements',
  'notifications',
  'notification_preferences',
  'ai_conversations',
  'ai_messages',
  'percentile_datasets',
  'percentile_distributions',
  'percentile_results',
] as const satisfies readonly (keyof CollectionMap)[];

export type CollectionName = (typeof COLLECTION_NAMES)[number];

/** Bump when a shipped schema change requires transforming stored rows. */
export const SCHEMA_VERSION = 1;
