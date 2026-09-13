import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Field, Text } from '@/components/ui';
import {
  OnboardingProvider,
  useOnboarding,
} from '@/features/onboarding/OnboardingContext';
import { ChoiceList, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import type { PrimaryGoal, Sex, TrainingExperience } from '@/database/schema';
import { useDatabase } from '@/services/database/DatabaseProvider';
import { useSession } from '@/services/session/SessionProvider';
import { useTheme } from '@/theme';
import { today } from '@/utils/date';

const TOTAL_STEPS = 8;

export default function OnboardingRoute() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const common = { step, totalSteps: TOTAL_STEPS, onBack: back };

  switch (step) {
    case 1:
      return <WelcomeStep {...common} onNext={next} />;
    case 2:
      return <ProfileStep {...common} onNext={next} />;
    case 3:
      return <GoalStep {...common} onNext={next} />;
    case 4:
      return <ExperienceStep {...common} onNext={next} />;
    case 5:
      return <ScheduleStep {...common} onNext={next} />;
    case 6:
      return <TargetsStep {...common} onNext={next} />;
    case 7:
      return <HabitsStep {...common} onNext={next} />;
    default:
      return <DoneStep {...common} />;
  }
}

interface StepProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext?: () => void;
}

function WelcomeStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const theme = useTheme();
  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="Let's build your system."
      subtitle="A few questions, then you're logging. You can change any of this later."
      primaryLabel="Start"
      onPrimary={onNext ?? (() => {})}
    >
      <View style={{ gap: theme.spacing.base }}>
        <Text variant="callout" tone="secondary">
          Pravesh turns what you log into progress you can actually see — strength,
          consistency, nutrition and goals in one place.
        </Text>
        <Text variant="callout" tone="secondary">
          Track less. Understand more.
        </Text>
      </View>
    </OnboardingStep>
  );
}

function ProfileStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const theme = useTheme();
  const { draft, update } = useOnboarding();

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="About you"
      subtitle="Used to personalise targets and comparisons. Nothing leaves your device."
      onPrimary={onNext ?? (() => {})}
      primaryDisabled={draft.displayName.trim().length === 0}
      scroll
    >
      <View style={{ gap: theme.spacing.base }}>
        <Field
          label="Name"
          value={draft.displayName}
          onChangeText={(displayName) => update({ displayName })}
          placeholder="Pravesh"
          maxLength={40}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Height"
              value={draft.heightCm}
              onChangeText={(heightCm) => update({ heightCm })}
              placeholder="175"
              keyboardType="numeric"
              suffix="cm"
              maxLength={3}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Weight"
              value={draft.weightKg}
              onChangeText={(weightKg) => update({ weightKg })}
              placeholder="72"
              keyboardType="numeric"
              suffix="kg"
              maxLength={5}
            />
          </View>
        </View>

        <Field
          label="Year of birth"
          value={draft.birthYear}
          onChangeText={(birthYear) => update({ birthYear })}
          placeholder="2001"
          keyboardType="numeric"
          maxLength={4}
        />

        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" tone="muted">
            Sex — used only for strength comparisons
          </Text>
          <ChoiceList<Sex>
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'unspecified', label: 'Prefer not to say' },
            ]}
            value={draft.sex}
            onChange={(sex) => update({ sex })}
          />
        </View>
      </View>
    </OnboardingStep>
  );
}

function GoalStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="What are you working toward?"
      onPrimary={onNext ?? (() => {})}
    >
      <ChoiceList<PrimaryGoal>
        options={[
          { value: 'build_muscle', label: 'Build muscle' },
          { value: 'get_stronger', label: 'Get stronger' },
          { value: 'lose_fat', label: 'Lose fat' },
          { value: 'improve_fitness', label: 'Improve fitness' },
          { value: 'maintain', label: 'Maintain' },
        ]}
        value={draft.primaryGoal}
        onChange={(primaryGoal) => update({ primaryGoal })}
      />
    </OnboardingStep>
  );
}

function ExperienceStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="How long have you been training?"
      subtitle="Sets sensible defaults for progression. Change it any time."
      onPrimary={onNext ?? (() => {})}
    >
      <ChoiceList<TrainingExperience>
        options={[
          {
            value: 'beginner',
            label: 'Beginner',
            hint: 'Under a year of consistent training',
          },
          { value: 'intermediate', label: 'Intermediate', hint: 'One to three years' },
          { value: 'advanced', label: 'Advanced', hint: 'Three years or more' },
        ]}
        value={draft.experience}
        onChange={(experience) => update({ experience })}
      />
    </OnboardingStep>
  );
}

function ScheduleStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const theme = useTheme();
  const { draft, update } = useOnboarding();

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="How often do you train?"
      subtitle="Rest days are part of the plan — missing one won't count against you."
      onPrimary={onNext ?? (() => {})}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {[2, 3, 4, 5, 6].map((days) => {
          const selected = draft.trainingDaysPerWeek === days;
          return (
            <Pressable
              key={days}
              onPress={() => update({ trainingDaysPerWeek: days })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                width: 62,
                height: 62,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: theme.borderWidth.thin,
                borderColor: selected ? theme.color.accent : theme.color.borderSubtle,
                backgroundColor: selected ? theme.color.accentSoft : theme.color.surface,
              }}
            >
              <Text variant="title2" numeric tone={selected ? 'accent' : 'primary'}>
                {days}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="footnote" tone="muted" style={{ marginTop: theme.spacing.base }}>
        days per week
      </Text>
    </OnboardingStep>
  );
}

function TargetsStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const theme = useTheme();
  const { draft, update } = useOnboarding();

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="Daily nutrition targets"
      subtitle="Enter what you already follow. Guided calculation comes later."
      onPrimary={onNext ?? (() => {})}
    >
      <View style={{ gap: theme.spacing.base }}>
        <Field
          label="Calories"
          value={draft.calories}
          onChangeText={(calories) => update({ calories })}
          keyboardType="numeric"
          suffix="kcal"
          maxLength={5}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Protein"
              value={draft.proteinG}
              onChangeText={(proteinG) => update({ proteinG })}
              keyboardType="numeric"
              suffix="g"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Carbs"
              value={draft.carbsG}
              onChangeText={(carbsG) => update({ carbsG })}
              keyboardType="numeric"
              suffix="g"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Fat"
              value={draft.fatG}
              onChangeText={(fatG) => update({ fatG })}
              keyboardType="numeric"
              suffix="g"
              maxLength={4}
            />
          </View>
        </View>
      </View>
    </OnboardingStep>
  );
}

const HABIT_CHOICES = ['Water', 'Sleep 7h+', 'Creatine', 'Omega-3', 'Steps', 'Reading'];

function HabitsStep({ step, totalSteps, onBack, onNext }: StepProps) {
  const theme = useTheme();
  const { draft, update } = useOnboarding();

  const toggle = (name: string) => {
    const next = draft.habits.includes(name)
      ? draft.habits.filter((h) => h !== name)
      : [...draft.habits, name];
    update({ habits: next });
  };

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="Pick a few habits"
      subtitle="Start small. You can add your own later."
      onPrimary={onNext ?? (() => {})}
    >
      <View style={{ gap: theme.spacing.sm }}>
        {HABIT_CHOICES.map((name) => {
          const selected = draft.habits.includes(name);
          return (
            <Pressable
              key={name}
              onPress={() => toggle(name)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.base,
                paddingHorizontal: theme.spacing.base,
                borderRadius: theme.radius.md,
                borderWidth: theme.borderWidth.thin,
                borderColor: selected ? theme.color.accent : theme.color.borderSubtle,
                backgroundColor: selected ? theme.color.accentSoft : theme.color.surface,
                minHeight: theme.minTouchTarget,
              }}
            >
              <Text variant="body" tone={selected ? 'accent' : 'primary'}>
                {name}
              </Text>
              <Text variant="body" tone={selected ? 'accent' : 'muted'}>
                {selected ? '✓' : '+'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

function DoneStep({ step, totalSteps, onBack }: StepProps) {
  const theme = useTheme();
  const router = useRouter();
  const db = useDatabase();
  const { draft } = useOnboarding();
  const { user, profile, settings, updateProfile, completeOnboarding } = useSession();
  const [saving, setSaving] = useState(false);

  const finish = useCallback(async () => {
    // A tap must never do nothing silently. If the session is somehow not
    // ready, say so rather than leaving the button inert.
    if (!user || !profile) {
      console.error('[onboarding] no active session when finishing');
      Alert.alert(
        'Just a moment',
        'Your profile is still being set up. Try again in a second.',
      );
      return;
    }

    setSaving(true);

    try {
      const birthYear = Number(draft.birthYear);
      const heightCm = Number(draft.heightCm);
      const weightKg = Number(draft.weightKg);

      updateProfile({
        displayName: draft.displayName.trim(),
        sex: draft.sex,
        birthDate:
          Number.isFinite(birthYear) && birthYear > 1900 ? `${birthYear}-01-01` : null,
        heightCm: Number.isFinite(heightCm) && heightCm > 0 ? heightCm : null,
        experience: draft.experience,
        primaryGoal: draft.primaryGoal,
        trainingDaysPerWeek: draft.trainingDaysPerWeek,
      });

      if (Number.isFinite(weightKg) && weightKg > 0) {
        db.insert('bodyweight_logs', {
          userId: user.id,
          localDate: today(settings?.timezone ?? 'UTC'),
          weightKg,
          note: null,
          isDemo: false,
        });
      }

      const calories = Number(draft.calories);
      const proteinG = Number(draft.proteinG);
      const carbsG = Number(draft.carbsG);
      const fatG = Number(draft.fatG);

      if ([calories, proteinG, carbsG, fatG].every((v) => Number.isFinite(v) && v > 0)) {
        const existing = db
          .all('nutrition_targets')
          .find((t) => t.effectiveFrom === '2000-01-01');

        if (existing) {
          db.update('nutrition_targets', existing.id, {
            calories,
            proteinG,
            carbsG,
            fatG,
          });
        }
      }

      // Deactivate habits the user did not choose, rather than deleting them —
      // they stay available to re-enable later.
      if (draft.habits.length > 0) {
        for (const habit of db.all('habits')) {
          db.update('habits', habit.id, {
            isActive: draft.habits.includes(habit.name),
          });
        }
      }

      completeOnboarding();
      await db.flush();
      router.replace('/');
    } catch (error) {
      console.error('[onboarding] failed to save', error);
      setSaving(false);
    }
  }, [db, draft, profile, router, settings, updateProfile, completeOnboarding, user]);

  return (
    <OnboardingStep
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      title="Your system is ready."
      subtitle={`Everything's set up, ${draft.displayName.trim() || 'let’s go'}.`}
      primaryLabel={saving ? 'Setting up…' : 'Open Pravesh'}
      primaryDisabled={saving}
      onPrimary={() => void finish()}
    >
      <View style={{ gap: theme.spacing.md }}>
        <Summary label="Goal" value={goalLabel(draft.primaryGoal)} />
        <Summary label="Training" value={`${draft.trainingDaysPerWeek} days per week`} />
        <Summary
          label="Nutrition"
          value={`${draft.calories} kcal · ${draft.proteinG}g protein`}
        />
        <Summary
          label="Habits"
          value={draft.habits.length > 0 ? draft.habits.join(', ') : 'None yet'}
        />
      </View>
    </OnboardingStep>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="callout" style={{ paddingRight: theme.spacing.base }}>
        {value}
      </Text>
    </View>
  );
}

function goalLabel(goal: PrimaryGoal): string {
  return {
    build_muscle: 'Build muscle',
    get_stronger: 'Get stronger',
    lose_fat: 'Lose fat',
    improve_fitness: 'Improve fitness',
    maintain: 'Maintain',
  }[goal];
}
