import { View } from 'react-native';

import { Card, SectionLabel, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface PhasePlaceholderProps {
  /** Which build phase delivers this area. */
  phase: number;
  /** What the finished section will do. */
  summary: string;
  /** Specific capabilities still to be built. */
  upcoming: string[];
}

/**
 * An explicit "not built yet" marker.
 *
 * The product brief forbids UI that looks functional but does nothing. Rather
 * than mock up a screen with dead controls, unbuilt areas say plainly what is
 * missing and when it arrives.
 */
export function PhasePlaceholder({ phase, summary, upcoming }: PhasePlaceholderProps) {
  const theme = useTheme();

  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <SectionLabel label={`Phase ${phase}`} />
      <Card>
        <Text variant="callout" tone="secondary">
          {summary}
        </Text>

        <View style={{ marginTop: theme.spacing.base, gap: theme.spacing.sm }}>
          {upcoming.map((line) => (
            <View
              key={line}
              style={{
                flexDirection: 'row',
                gap: theme.spacing.sm,
                alignItems: 'flex-start',
              }}
            >
              <Text variant="footnote" tone="muted">
                •
              </Text>
              <Text variant="footnote" tone="muted" style={{ flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Text
        variant="caption"
        tone="muted"
        style={{ marginTop: theme.spacing.md }}
      >
        Not yet implemented. Nothing on this screen is simulated.
      </Text>
    </View>
  );
}
