-- Pravesh — initial schema
--
-- STATUS: not yet provisioned. The app currently runs entirely on the local
-- storage driver (see src/database/). This file is the target Postgres schema,
-- kept in lockstep with src/database/schema/*.ts so that enabling the backend
-- is a transport change rather than a remodel. Table and column names match the
-- TypeScript collections one-for-one (snake_case here, camelCase there).
--
-- CONVENTIONS
--   * Canonical units: kg, cm, metres, seconds, kcal, grams. Display units are
--     a client concern and are never stored.
--   * `local_date` is a DATE in the *user's* timezone, resolved client-side.
--     Instants are timestamptz. Never derive one from the other in SQL without
--     the user's timezone.
--   * Soft delete via `deleted_at`; rows are retained for history and export.
--   * `id` is supplied by the client (UUID v4) so offline writes are complete
--     on creation and never need renumbering at sync time.
--   * Every user-owned table has RLS enabled with an owner-only policy. There
--     is no code path in which the client may read another user's rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type sex_t as enum ('male', 'female', 'unspecified');
create type training_experience_t as enum ('beginner', 'intermediate', 'advanced');
create type primary_goal_t as enum (
  'build_muscle', 'get_stronger', 'lose_fat', 'improve_fitness', 'maintain'
);
create type weight_unit_t as enum ('kg', 'lb');
create type height_unit_t as enum ('cm', 'ft');
create type time_format_t as enum ('12h', '24h');
create type theme_t as enum ('dark', 'light', 'system');
create type progression_style_t as enum ('weight', 'reps', 'double', 'manual');
create type e1rm_formula_t as enum ('epley', 'brzycki', 'lombardi');

create type exercise_metric_t as enum (
  'weight_reps', 'reps', 'duration', 'distance_duration', 'bodyweight', 'assisted'
);
create type muscle_group_t as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body', 'cardio'
);
create type equipment_t as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'
);
create type workout_status_t as enum (
  'planned', 'in_progress', 'paused', 'completed', 'skipped'
);
create type set_type_t as enum (
  'warmup', 'working', 'drop', 'failure', 'amrap', 'backoff'
);
create type pr_type_t as enum (
  'max_weight', 'max_reps', 'estimated_1rm', 'max_volume',
  'best_set', 'longest_duration', 'best_distance', 'best_pace'
);

create type habit_value_t as enum ('boolean', 'numeric', 'duration');
create type habit_cadence_t as enum ('daily', 'weekdays', 'weekly', 'monthly');
create type schedule_kind_t as enum ('workout', 'meal', 'study', 'work', 'sleep', 'custom');

create type goal_type_t as enum (
  'strength', 'bodyweight', 'consistency', 'frequency', 'nutrition', 'endurance', 'custom'
);
create type goal_status_t as enum ('active', 'achieved', 'paused', 'abandoned');
create type achievement_tier_t as enum ('bronze', 'silver', 'gold');
create type achievement_category_t as enum (
  'training', 'nutrition', 'consistency', 'strength', 'milestone'
);

create type notification_category_t as enum (
  'workout_reminder', 'nutrition_nudge', 'pr_celebration',
  'monthly_report', 'missed_log', 'goal_milestone'
);
create type ai_role_t as enum ('user', 'assistant', 'system');
create type percentile_basis_t as enum ('estimated_1rm', 'max_weight', 'reps');
create type comparison_group_t as enum (
  'all', 'similar_bodyweight', 'similar_age',
  'similar_experience', 'recreational', 'advanced'
);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- Mirrors auth.users. Kept separate so the app owns its own profile fields.
create table users (
  id uuid primary key,
  email text,
  is_anonymous boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table profiles (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null default '',
  sex sex_t not null default 'unspecified',
  birth_date date,
  height_cm numeric(5,1) check (height_cm is null or height_cm between 50 and 280),
  experience training_experience_t not null default 'beginner',
  primary_goal primary_goal_t not null default 'build_muscle',
  training_days_per_week smallint not null default 4
    check (training_days_per_week between 0 and 7),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

create table user_settings (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  weight_unit weight_unit_t not null default 'kg',
  height_unit height_unit_t not null default 'cm',
  time_format time_format_t not null default '24h',
  theme theme_t not null default 'dark',
  timezone text not null default 'UTC',
  first_day_of_week smallint not null default 1 check (first_day_of_week in (1, 7)),
  progression_style progression_style_t not null default 'double',
  e1rm_formula e1rm_formula_t not null default 'epley',
  rest_timer_seconds integer not null default 120 check (rest_timer_seconds >= 0),
  haptics_enabled boolean not null default true,
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

-- Relative weights; normalised at calculation time, so they need not total 100.
create table consistency_config (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  training numeric(5,2) not null default 30 check (training >= 0),
  nutrition numeric(5,2) not null default 30 check (nutrition >= 0),
  sleep numeric(5,2) not null default 15 check (sleep >= 0),
  water numeric(5,2) not null default 10 check (water >= 0),
  habits numeric(5,2) not null default 15 check (habits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------

create table exercises (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  canonical_name text not null,
  metric_type exercise_metric_t not null,
  primary_muscle muscle_group_t not null,
  secondary_muscles muscle_group_t[] not null default '{}',
  equipment equipment_t not null default 'other',
  is_custom boolean not null default true,
  is_compound boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index exercises_user_canonical_idx on exercises (user_id, canonical_name);

create table exercise_aliases (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index exercise_aliases_lookup_idx on exercise_aliases (user_id, alias);

create table workout_templates (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  notes text,
  -- Bitmask, Monday = 1 << 0 … Sunday = 1 << 6.
  scheduled_weekdays smallint not null default 0
    check (scheduled_weekdays between 0 and 127),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table template_exercises (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  template_id uuid not null references workout_templates(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets smallint not null default 3 check (target_sets > 0),
  target_reps_low smallint check (target_reps_low is null or target_reps_low > 0),
  target_reps_high smallint check (target_reps_high is null or target_reps_high > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    target_reps_low is null or target_reps_high is null
    or target_reps_high >= target_reps_low
  )
);
create index template_exercises_template_idx on template_exercises (template_id, position);

create table workouts (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  template_id uuid references workout_templates(id) on delete set null,
  name text not null,
  status workout_status_t not null default 'planned',
  scheduled_for date not null,
  started_at timestamptz,
  completed_at timestamptz,
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index workouts_user_date_idx on workouts (user_id, scheduled_for desc);

create table workout_exercises (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index workout_exercises_workout_idx on workout_exercises (workout_id, position);

-- One table for every exercise type. Which measurement columns are meaningful
-- is determined by the parent exercise's metric_type; the check below only
-- guarantees that at least one measurement is present.
create table sets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_index smallint not null check (set_index > 0),
  set_type set_type_t not null default 'working',
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  reps smallint check (reps is null or reps >= 0),
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  distance_m numeric(9,2) check (distance_m is null or distance_m >= 0),
  rpe numeric(3,1) check (rpe is null or rpe between 1 and 10),
  rir smallint check (rir is null or rir between 0 and 10),
  is_complete boolean not null default true,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    weight_kg is not null or reps is not null
    or duration_sec is not null or distance_m is not null
  )
);
create index sets_workout_exercise_idx on sets (workout_exercise_id, set_index);
create index sets_user_logged_idx on sets (user_id, logged_at desc);

create table personal_records (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  record_type pr_type_t not null,
  value numeric(10,2) not null,
  weight_kg numeric(6,2),
  reps smallint,
  set_id uuid references sets(id) on delete set null,
  workout_id uuid references workouts(id) on delete set null,
  achieved_on date not null,
  achieved_at timestamptz not null default now(),
  previous_value numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index personal_records_lookup_idx
  on personal_records (user_id, exercise_id, record_type, achieved_on desc);

-- ---------------------------------------------------------------------------
-- Nutrition
-- ---------------------------------------------------------------------------

create table foods (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  canonical_name text not null,
  brand text,
  serving_size numeric(8,2) not null check (serving_size > 0),
  serving_unit text not null,
  calories numeric(7,2) not null default 0 check (calories >= 0),
  protein_g numeric(6,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6,2) not null default 0 check (fat_g >= 0),
  fiber_g numeric(6,2),
  sugar_g numeric(6,2),
  sodium_mg numeric(8,2),
  is_demo boolean not null default false,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index foods_user_canonical_idx on foods (user_id, canonical_name);

create table meal_templates (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  default_time time,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table meal_template_items (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  meal_template_id uuid not null references meal_templates(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  quantity numeric(6,2) not null default 1 check (quantity > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table nutrition_logs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  local_date date not null,
  meal_template_id uuid references meal_templates(id) on delete set null,
  -- Snapshotted: renaming a template must not rewrite history.
  meal_name text not null,
  position integer not null default 0,
  is_complete boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index nutrition_logs_user_date_idx on nutrition_logs (user_id, local_date desc);

-- Macros are snapshotted at log time. This duplication is deliberate: editing a
-- food tomorrow must not silently change what last month's totals were.
create table nutrition_log_items (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  nutrition_log_id uuid not null references nutrition_logs(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  food_name text not null,
  serving_size numeric(8,2) not null,
  serving_unit text not null,
  quantity numeric(6,2) not null default 1 check (quantity > 0),
  calories numeric(7,2) not null default 0,
  protein_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  fiber_g numeric(6,2),
  sugar_g numeric(6,2),
  sodium_mg numeric(8,2),
  is_complete boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index nutrition_log_items_log_idx on nutrition_log_items (nutrition_log_id, position);

-- Versioned by start date so past days are scored against the target that was
-- actually in force then.
create table nutrition_targets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  effective_from date not null,
  calories numeric(7,2) not null check (calories > 0),
  protein_g numeric(6,2) not null check (protein_g >= 0),
  carbs_g numeric(6,2) not null check (carbs_g >= 0),
  fat_g numeric(6,2) not null check (fat_g >= 0),
  calorie_tolerance numeric(4,3) not null default 0.100
    check (calorie_tolerance between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, effective_from)
);

-- ---------------------------------------------------------------------------
-- Lifestyle
-- ---------------------------------------------------------------------------

create table habits (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon text,
  value_type habit_value_t not null default 'boolean',
  target_value numeric(10,2) not null default 1 check (target_value > 0),
  unit text,
  cadence habit_cadence_t not null default 'daily',
  weekdays smallint not null default 127 check (weekdays between 0 and 127),
  position integer not null default 0,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table habit_logs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  local_date date not null,
  value numeric(10,2) not null default 0 check (value >= 0),
  is_complete boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (habit_id, local_date)
);
create index habit_logs_user_date_idx on habit_logs (user_id, local_date desc);

create table schedule_items (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  kind schedule_kind_t not null default 'custom',
  time_of_day time not null,
  duration_min integer check (duration_min is null or duration_min >= 0),
  is_recurring boolean not null default true,
  weekdays smallint not null default 127 check (weekdays between 0 and 127),
  specific_date date,
  ref_id uuid,
  position integer not null default 0,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- A non-recurring item must name the day it belongs to.
  check (is_recurring or specific_date is not null)
);

create table schedule_completions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (schedule_item_id, local_date)
);

create table bodyweight_logs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  local_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, local_date)
);

-- ---------------------------------------------------------------------------
-- Outcomes
-- ---------------------------------------------------------------------------

create table goals (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  goal_type goal_type_t not null default 'custom',
  exercise_id uuid references exercises(id) on delete set null,
  metric text not null,
  start_value numeric(10,2) not null default 0,
  target_value numeric(10,2) not null,
  unit text not null default '',
  target_date date,
  status goal_status_t not null default 'active',
  achieved_at timestamptz,
  lower_is_better boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table goal_milestones (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  value numeric(10,2) not null,
  label text,
  position integer not null default 0,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Caches. Every column is recomputable from raw logs; `computed_at` older than
-- the day's last write means the row is stale. Never treat these as sources.
create table daily_summaries (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  local_date date not null,
  consistency_score numeric(5,2) not null default 0,
  training_score numeric(4,3),
  nutrition_score numeric(4,3),
  habit_score numeric(4,3),
  sleep_score numeric(4,3),
  water_score numeric(4,3),
  workout_planned boolean not null default false,
  workout_completed boolean not null default false,
  is_rest_day boolean not null default false,
  calories numeric(7,2) not null default 0,
  protein_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  training_volume_kg numeric(10,2) not null default 0,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, local_date)
);

create table monthly_summaries (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  year smallint not null,
  month smallint not null check (month between 1 and 12),
  workouts_completed integer not null default 0,
  workouts_planned integer not null default 0,
  training_consistency numeric(5,2) not null default 0,
  nutrition_consistency numeric(5,2) not null default 0,
  habit_consistency numeric(5,2) not null default 0,
  overall_consistency numeric(5,2) not null default 0,
  total_volume_kg numeric(12,2) not null default 0,
  avg_workout_duration_sec integer,
  personal_records integer not null default 0,
  avg_calories numeric(7,2),
  avg_protein_g numeric(6,2),
  start_bodyweight_kg numeric(5,2),
  end_bodyweight_kg numeric(5,2),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, year, month)
);

-- Shared catalogue, readable by every authenticated user.
create table achievements (
  id uuid primary key,
  key text not null unique,
  title text not null,
  description text not null,
  tier achievement_tier_t not null default 'bronze',
  category achievement_category_t not null default 'training',
  threshold numeric(10,2) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table user_achievements (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  achievement_key text not null,
  progress numeric(10,2) not null default 0,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- System
-- ---------------------------------------------------------------------------

create table notification_preferences (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  category notification_category_t not null,
  enabled boolean not null default true,
  lead_time_min integer check (lead_time_min is null or lead_time_min >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, category)
);

create table notifications (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  category notification_category_t not null,
  title text not null,
  body text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz,
  route text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table ai_conversations (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null default '',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table ai_messages (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role ai_role_t not null,
  content text not null,
  -- Names of the structured context functions supplied for this turn, so the
  -- user can audit exactly which of their data left the device.
  context_refs text[] not null default '{}',
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Reference data, readable by all authenticated users, writable by no client.
--
-- IMPORTANT: the MVP ships illustrative distributions only (is_demo = true).
-- Any ranking derived from a demo dataset must be labelled as such in the UI.
-- Replacing this with empirical data is a data change, not a code change.
create table percentile_datasets (
  id uuid primary key,
  key text not null unique,
  name text not null,
  source text not null,
  version text not null default '1',
  basis percentile_basis_t not null default 'estimated_1rm',
  is_demo boolean not null default true,
  supported_groups comparison_group_t[] not null default '{all}',
  methodology_note text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- LMS-style parameters, evaluated continuously across bodyweight rather than
-- snapped to coarse bands like "55-60 kg".
create table percentile_distributions (
  id uuid primary key,
  dataset_id uuid not null references percentile_datasets(id) on delete cascade,
  exercise_key text not null,
  sex sex_t not null,
  bodyweight_kg numeric(5,2) not null,
  age_min smallint not null default 0,
  age_max smallint not null default 120,
  lambda numeric(6,4) not null,
  mu numeric(7,2) not null,
  sigma numeric(6,4) not null,
  sample_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (age_max >= age_min)
);
create index percentile_distributions_lookup_idx
  on percentile_distributions (dataset_id, exercise_key, sex, bodyweight_kg);

create table percentile_results (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  dataset_id uuid not null references percentile_datasets(id) on delete cascade,
  comparison_group comparison_group_t not null default 'all',
  percentile numeric(5,2) not null check (percentile between 0 and 100),
  basis percentile_basis_t not null,
  input_value numeric(10,2) not null,
  input_bodyweight_kg numeric(5,2),
  input_age smallint,
  computed_on date not null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
--
-- Every user-owned table gets the same owner-only policy. A client holding the
-- anon key can therefore only ever reach its own rows; there is no query that
-- returns another user's data. Service-role keys stay server-side and are never
-- shipped to the device.

do $$
declare
  t text;
  owned_tables text[] := array[
    'profiles', 'user_settings', 'consistency_config',
    'exercises', 'exercise_aliases', 'workout_templates', 'template_exercises',
    'workouts', 'workout_exercises', 'sets', 'personal_records',
    'foods', 'meal_templates', 'meal_template_items',
    'nutrition_logs', 'nutrition_log_items', 'nutrition_targets',
    'habits', 'habit_logs', 'schedule_items', 'schedule_completions',
    'bodyweight_logs',
    'goals', 'goal_milestones', 'daily_summaries', 'monthly_summaries',
    'user_achievements',
    'notifications', 'notification_preferences',
    'ai_conversations', 'ai_messages', 'percentile_results'
  ];
begin
  foreach t in array owned_tables loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t || '_owner_only', t);
  end loop;
end $$;

-- `users` keys on id rather than user_id.
alter table users enable row level security;
alter table users force row level security;
create policy users_self_only on users
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Shared reference data: readable by all authenticated users, never writable
-- from a client. Writes happen through migrations or server-side jobs only.
alter table achievements enable row level security;
create policy achievements_read on achievements
  for select to authenticated using (true);

alter table percentile_datasets enable row level security;
create policy percentile_datasets_read on percentile_datasets
  for select to authenticated using (true);

alter table percentile_distributions enable row level security;
create policy percentile_distributions_read on percentile_distributions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger %I before update on %I
         for each row execute function touch_updated_at()',
      t || '_touch_updated_at', t
    );
  end loop;
end $$;
