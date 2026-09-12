import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  /** Short, human line. Never "No data available." */
  title: string;
  /** One encouraging sentence that says what happens next. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional decorative glyph rendered above the title. */
  glyph?: React.ReactNode;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  glyph,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      {glyph ? <View style={{ marginBottom: theme.spacing.sm }}>{glyph}</View> : null}
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="footnote" tone="secondary" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </View>
  );
}
