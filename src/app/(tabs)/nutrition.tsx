import { View } from 'react-native';

import {
  AnimatedNumber,
  Card,
  ProgressBar,
  Screen,
  SectionLabel,
  Text,
} from '@/components/ui';
import { useToday } from '@/features/home/useToday';
import { PhasePlaceholder } from '@/features/shell/PhasePlaceholder';
import { useTheme } from '@/theme';
import { formatNumber } from '@/utils/units';

export default function NutritionScreen() {
  const theme = useTheme();
  const today = useToday();
  const { totals, target } = today;

  const macros = target
    ? [
        {
          label: 'Calories',
          actual: totals.calories,
          target: target.calories,
          unit: 'kcal',
        },
        { label: 'Protein', actual: totals.proteinG, target: target.proteinG, unit: 'g' },
        { label: 'Carbs', actual: totals.carbsG, target: target.carbsG, unit: 'g' },
        { label: 'Fat', actual: totals.fatG, target: target.fatG, unit: 'g' },
      ]
    : [];

  return (
    <Screen scroll bottomInset={24}>
      <View style={{ paddingTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
        <Text variant="title1">Nutrition</Text>
      </View>

      <SectionLabel label="Today" />
      <Card>
        {macros.length === 0 ? (
          <Text variant="footnote" tone="secondary">
            Set your targets to start tracking.
          </Text>
        ) : (
          macros.map((macro, index) => {
            const ratio = macro.target > 0 ? macro.actual / macro.target : 0;
            return (
              <View
                key={macro.label}
                style={{ marginTop: index === 0 ? 0 : theme.spacing.lg }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <Text variant="subhead" tone="secondary">
                    {macro.label}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <AnimatedNumber value={macro.actual} variant="bodyStrong" />
                    <Text variant="footnote" tone="muted">
                      {` / ${formatNumber(macro.target, 0)} ${macro.unit}`}
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  value={ratio}
                  showOverflow={macro.label === 'Calories'}
                  tone={ratio >= 1 ? 'positive' : 'accent'}
                  style={{ marginTop: theme.spacing.sm }}
                />
              </View>
            );
          })
        )}
      </Card>

      <PhasePlaceholder
        phase={3}
        summary="Food and meal management, with per-item logging, is the third build phase."
        upcoming={[
          'Create, edit and reuse foods with custom serving sizes',
          'Fixed meal templates you can tick off whole or item by item',
          'Daily, weekly and monthly macro adherence',
          'Editable calorie and macro targets',
        ]}
      />
    </Screen>
  );
}
