import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, useTheme } from '@/theme';

export type ProgressTone = 'accent' | 'positive' | 'negative' | 'attention' | 'neutral';

interface ProgressBarProps {
  /** 0..1. Values outside the range are clamped for display. */
  value: number;
  tone?: ProgressTone;
  height?: number;
  style?: ViewStyle;
  /**
   * Renders the portion beyond 100% in a distinct segment instead of clamping
   * silently — exceeding a target is information, not automatically a failure.
   */
  showOverflow?: boolean;
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  tone = 'accent',
  height = 6,
  style,
  showOverflow = false,
  accessibilityLabel,
}: ProgressBarProps) {
  const theme = useTheme();
  const motion = useMotion();

  const safe = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const primary = Math.min(safe, 1);
  const overflow = showOverflow ? Math.min(Math.max(safe - 1, 0), 1) : 0;

  const width = useSharedValue(0);
  const overflowWidth = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(primary, { duration: motion.duration('slow') });
    overflowWidth.value = withTiming(overflow, { duration: motion.duration('slow') });
  }, [primary, overflow, motion, width, overflowWidth]);

  const toneColor: Record<ProgressTone, string> = {
    accent: theme.color.accent,
    positive: theme.color.positive,
    negative: theme.color.negative,
    attention: theme.color.attention,
    neutral: theme.color.textMuted,
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const overflowStyle = useAnimatedStyle(() => ({
    width: `${overflowWidth.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(primary * 100) }}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: theme.color.track,
          overflow: 'hidden',
          flexDirection: 'row',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          { height: '100%', borderRadius: height / 2, backgroundColor: toneColor[tone] },
          fillStyle,
        ]}
      />
      {showOverflow ? (
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: height / 2,
              backgroundColor: theme.color.attention,
              marginLeft: -height / 2,
            },
            overflowStyle,
          ]}
        />
      ) : null}
    </View>
  );
}
