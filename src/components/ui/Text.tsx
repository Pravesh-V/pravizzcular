import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type TypeScaleKey } from '@/theme';

type ToneKey =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'positive'
  | 'negative'
  | 'attention'
  | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TypeScaleKey;
  tone?: ToneKey;
  /**
   * Tabular figures. Use for any number that updates in place so digits keep
   * a constant width and the layout doesn't jitter mid-animation.
   */
  numeric?: boolean;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

export function Text({
  variant = 'body',
  tone = 'primary',
  numeric = false,
  align,
  weight,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const toneColor: Record<ToneKey, string> = {
    primary: theme.color.text,
    secondary: theme.color.textSecondary,
    muted: theme.color.textMuted,
    accent: theme.color.accent,
    positive: theme.color.positive,
    negative: theme.color.negative,
    attention: theme.color.attention,
    onAccent: theme.color.textOnAccent,
  };

  return (
    <RNText
      style={[
        theme.type[variant],
        {
          color: toneColor[tone],
          fontFamily: numeric ? theme.fontFamily.mono : theme.fontFamily.sans,
        },
        numeric ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  );
}
