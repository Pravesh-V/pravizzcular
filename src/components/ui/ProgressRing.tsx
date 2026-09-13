import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useMotion, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1, clamped for display. */
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'accent' | 'positive' | 'negative' | 'attention';
  /** Centre content, typically a number readout. */
  children?: React.ReactNode;
  accessibilityLabel?: string;
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 7,
  tone = 'accent',
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const motion = useMotion();

  const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = `ring-gradient-${tone}`;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(safe, { duration: motion.duration('slow') });
  }, [safe, motion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Only the accent ring — the headline "consistency" metric — earns a
  // gradient stroke. Status rings (positive/negative/attention) stay flat so
  // their meaning reads instantly, without a color transition to parse.
  const flatToneColor = {
    accent: theme.color.accent,
    positive: theme.color.positive,
    negative: theme.color.negative,
    attention: theme.color.attention,
  }[tone];

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe * 100) }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {tone === 'accent' ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.color.accentGradient[0]} />
              <Stop offset="100%" stopColor={theme.color.accentGradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.color.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone === 'accent' ? `url(#${gradientId})` : flatToneColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the arc at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
