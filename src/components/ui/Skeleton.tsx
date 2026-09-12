import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, useTheme } from '@/theme';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const motion = useMotion();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    if (motion.reduceMotion) {
      pulse.value = 0.6;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [motion.reduceMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.color.skeleton,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}
