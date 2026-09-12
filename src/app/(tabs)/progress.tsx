import { View } from 'react-native';

import { Card, Screen, SectionLabel, Text } from '@/components/ui';
import { PhasePlaceholder } from '@/features/shell/PhasePlaceholder';
import { useLiveQuery } from '@/services/database/DatabaseProvider';
import { useSession } from '@/services/session/SessionProvider';
import { useTheme } from '@/theme';
import { formatWeight } from '@/utils/units';

export default function ProgressScreen() {
  const theme = useTheme();
  const { settings } = useSession();
  const unit = settings?.weightUnit ?? 'kg';

  const stats = useLiveQuery((db) => {
    const workouts = db.all('workouts').filter((w) => w.status === 'completed');
    const bodyweight = [...db.all('bodyweight_logs')].sort((a, b) =>
      b.localDate.localeCompare(a.localDate),
    );

    return {
      workouts: workouts.length,
      sets: db.all('sets').filter((s) => s.isComplete).length,
      latestWeight: bodyweight[0]?.weightKg ?? null,
    };
  });

  return (
    <Screen scroll bottomInset={24}>
      <View style={{ paddingTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
        <Text variant="title1">Progress</Text>
      </View>

      <SectionLabel label="Logged so far" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Stat label="Workouts" value={String(stats.workouts)} />
        <Stat label="Sets" value={String(stats.sets)} />
        <Stat label="Weight" value={formatWeight(stats.latestWeight, unit)} />
      </View>

      <PhasePlaceholder
        phase={5}
        summary="Monthly reports, exercise comparisons, goals and charts arrive in phase 5, with strength percentiles in phase 6."
        upcoming={[
          'Monthly progress report with honest period-over-period comparison',
          'Per-exercise progression on weight, reps, estimated 1RM and volume',
          'Bodyweight trend, calendar heatmap and streaks',
          'Goal roadmaps with milestones',
          'Strength percentiles — engine and dataset schema, clearly labelled',
        ]}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <Text variant="title3" numeric style={{ marginTop: theme.spacing.xs }}>
        {value}
      </Text>
    </Card>
  );
}
