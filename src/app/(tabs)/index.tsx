import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  AnimatedNumber,
  Card,
  ProgressBar,
  ProgressRing,
  Screen,
  SectionLabel,
  Separator,
  Text,
} from '@/components/ui';
import { useToday } from '@/features/home/useToday';
import { useSession } from '@/services/session/SessionProvider';
import { useTheme } from '@/theme';
import { dayPart, formatLongDate, formatTime } from '@/utils/date';
import { formatNumber } from '@/utils/units';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, settings } = useSession();
  const today = useToday();

  const timezone = settings?.timezone ?? 'UTC';
  const timeFormat = settings?.timeFormat ?? '24h';
  const greeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  }[dayPart(new Date(), timezone)];

  const name = profile?.displayName?.trim();

  return (
    <Screen scroll bottomInset={24}>
      <View style={{ paddingTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
        <Text variant="title1">
          {greeting}
          {name ? `, ${name}` : ''}.
        </Text>
      </View>

      <SectionLabel label="Today" />
      <Text variant="footnote" tone="secondary" style={{ marginTop: -theme.spacing.sm }}>
        {formatLongDate(today.date)}
      </Text>

      <View style={{ height: theme.spacing.base }} />

      <WorkoutCard
        onPress={() => router.push('/workout')}
        title={
          today.isRestDay
            ? 'Recovery day'
            : (today.plannedTemplate?.name.toUpperCase() ?? 'No workout planned')
        }
        subtitle={
          today.isRestDay
            ? 'Rest is part of training.'
            : today.workout?.status === 'completed'
              ? 'Completed'
              : today.workoutTime
                ? formatTime(today.workoutTime, timeFormat)
                : 'Not scheduled'
        }
        done={today.workout?.status === 'completed'}
        rest={today.isRestDay}
      />

      <View style={{ height: theme.spacing.md }} />

      <NutritionCard onPress={() => router.push('/nutrition')} today={today} />

      <View style={{ height: theme.spacing.md }} />

      <HabitsCard today={today} />

      <View style={{ height: theme.spacing.xl }} />

      <SectionLabel label="Today at a glance" />
      <Card padded={false}>
        {today.timeline.length === 0 ? (
          <View style={{ padding: theme.spacing.base }}>
            <Text variant="footnote" tone="secondary">
              Nothing scheduled today.
            </Text>
          </View>
        ) : (
          today.timeline.map((entry, index) => (
            <View key={entry.item.id}>
              {index > 0 ? <Separator inset={theme.spacing.base} /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.base,
                  gap: theme.spacing.md,
                }}
              >
                <Text variant="footnote" tone="muted" numeric style={{ width: 58 }}>
                  {formatTime(entry.item.timeOfDay, timeFormat)}
                </Text>
                <Text
                  variant="callout"
                  tone={entry.completed ? 'secondary' : 'primary'}
                  style={{ flex: 1 }}
                >
                  {entry.item.title}
                </Text>
                {entry.completed ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.color.positive}
                    accessibilityLabel="Completed"
                  />
                ) : entry.isNext ? (
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={theme.color.accent}
                    accessibilityLabel="Up next"
                  />
                ) : null}
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function WorkoutCard({
  title,
  subtitle,
  done,
  rest,
  onPress,
}: {
  title: string;
  subtitle: string;
  done: boolean;
  rest: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={`Workout: ${title}, ${subtitle}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" tone="muted">
            Workout
          </Text>
          <Text variant="title2" style={{ marginTop: theme.spacing.xs }}>
            {title}
          </Text>
          <Text variant="footnote" tone={done ? 'positive' : 'secondary'}>
            {subtitle}
          </Text>
        </View>
        <Ionicons
          name={rest ? 'moon-outline' : done ? 'checkmark-circle' : 'chevron-forward'}
          size={rest || done ? 22 : 18}
          color={done ? theme.color.positive : theme.color.textMuted}
        />
      </View>
    </Card>
  );
}

function NutritionCard({
  today,
  onPress,
}: {
  today: ReturnType<typeof useToday>;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { totals, target, nutrition } = today;

  if (!target) {
    return (
      <Card onPress={onPress}>
        <Text variant="overline" tone="muted">
          Nutrition
        </Text>
        <Text variant="footnote" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          Set your targets to start tracking.
        </Text>
      </Card>
    );
  }

  const kcalRatio = target.calories > 0 ? totals.calories / target.calories : 0;
  const proteinRatio = target.proteinG > 0 ? totals.proteinG / target.proteinG : 0;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Nutrition: ${totals.calories} of ${target.calories} calories, ${totals.proteinG} of ${target.proteinG} grams protein`}
    >
      <Text variant="overline" tone="muted">
        Nutrition
      </Text>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AnimatedNumber value={totals.calories} variant="title3" />
            <Text variant="footnote" tone="secondary">
              {` / ${target.calories.toLocaleString('en-US')} kcal`}
            </Text>
          </View>
          <ProgressBar
            value={kcalRatio}
            showOverflow
            tone={nutrition?.calories.verdict === 'on_target' ? 'positive' : 'accent'}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AnimatedNumber value={totals.proteinG} precision={0} variant="title3" />
            <Text variant="footnote" tone="secondary">
              {` / ${formatNumber(target.proteinG, 0)} g protein`}
            </Text>
          </View>
          <ProgressBar
            value={proteinRatio}
            tone={proteinRatio >= 1 ? 'positive' : 'accent'}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      </View>
    </Card>
  );
}

function HabitsCard({ today }: { today: ReturnType<typeof useToday> }) {
  const theme = useTheme();
  const { habitsComplete, habitsTotal, consistency } = today;

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <Card style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="overline" tone="muted">
          Habits
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            marginTop: theme.spacing.sm,
          }}
        >
          <AnimatedNumber value={habitsComplete} variant="title1" />
          <Text variant="body" tone="secondary">{` / ${habitsTotal}`}</Text>
        </View>
        <Text variant="footnote" tone="secondary">
          complete
        </Text>
      </Card>

      <Card style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="overline" tone="muted" style={{ alignSelf: 'flex-start' }}>
          Consistency
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <ProgressRing
            value={consistency.raw}
            size={68}
            tone={consistency.raw >= 0.8 ? 'positive' : 'accent'}
            accessibilityLabel={`Today's consistency ${consistency.score} percent`}
          >
            {consistency.isUndefined ? (
              <Text variant="title3" tone="muted">
                —
              </Text>
            ) : (
              <AnimatedNumber value={consistency.score} suffix="%" variant="title3" />
            )}
          </ProgressRing>
        </View>
      </Card>
    </View>
  );
}
