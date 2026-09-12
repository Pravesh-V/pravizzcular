import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface SectionLabelProps {
  label: string;
  /** Optional trailing affordance, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionLabel({ label, actionLabel, onAction }: SectionLabelProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
      }}
    >
      <Text variant="overline" tone="muted" accessibilityRole="header">
        {label}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={theme.spacing.sm}
        >
          <Text variant="footnote" tone="accent">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
