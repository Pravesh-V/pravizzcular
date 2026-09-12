import { View } from 'react-native';

import { Card, Screen, SectionLabel, Separator, Text } from '@/components/ui';
import { PhasePlaceholder } from '@/features/shell/PhasePlaceholder';
import { useLiveQuery } from '@/services/database/DatabaseProvider';
import { useTheme } from '@/theme';

export default function WorkoutScreen() {
  const theme = useTheme();

  const templates = useLiveQuery((db) => {
    const all = db.all('workout_templates').sort((a, b) => a.position - b.position);
    const templateExercises = db.all('template_exercises');
    const exercises = new Map(db.all('exercises').map((e) => [e.id, e.name]));

    return all.map((template) => ({
      template,
      exercises: templateExercises
        .filter((te) => te.templateId === template.id)
        .sort((a, b) => a.position - b.position)
        .map((te) => ({
          id: te.id,
          name: exercises.get(te.exerciseId) ?? 'Unknown exercise',
          sets: te.targetSets,
          low: te.targetRepsLow,
          high: te.targetRepsHigh,
        })),
    }));
  });

  return (
    <Screen scroll bottomInset={24}>
      <View style={{ paddingTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
        <Text variant="title1">Workout</Text>
      </View>

      <SectionLabel label="Your templates" />
      {templates.map(({ template, exercises }) => (
        <Card key={template.id} style={{ marginBottom: theme.spacing.md }} padded={false}>
          <View style={{ padding: theme.spacing.base }}>
            <Text variant="title3">{template.name}</Text>
            <Text variant="footnote" tone="secondary">
              {exercises.length} exercises
            </Text>
          </View>
          <Separator />
          <View style={{ padding: theme.spacing.base, gap: theme.spacing.sm }}>
            {exercises.map((exercise) => (
              <View
                key={exercise.id}
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {exercise.name}
                </Text>
                <Text variant="footnote" tone="muted" numeric>
                  {exercise.sets} × {exercise.low}
                  {exercise.high && exercise.high !== exercise.low
                    ? `–${exercise.high}`
                    : ''}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ))}

      <PhasePlaceholder
        phase={2}
        summary="Live set logging, rest timers, personal records and progression suggestions are the next build phase."
        upcoming={[
          'Start a session from a template and log sets as you train',
          'Previous session and suggested load shown per exercise',
          'Automatic PR detection across weight, reps and estimated 1RM',
          'Rest timer, quick +/- entry and set type selection',
        ]}
      />
    </Screen>
  );
}
