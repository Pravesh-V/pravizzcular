import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useMotion, useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Raised surface — for sheets and menus rather than page content. */
  elevated?: boolean;
  /** Drop the border for cards that sit on a contrasting background. */
  borderless?: boolean;
  padded?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Card({
  children,
  onPress,
  style,
  elevated = false,
  borderless = false,
  padded = true,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const theme = useTheme();
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const base: ViewStyle = {
    backgroundColor: elevated ? theme.color.elevated : theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: borderless ? 0 : theme.borderWidth.thin,
    borderColor: theme.color.borderSubtle,
    padding: padded ? theme.spacing.base : 0,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: motion.reduceMotion ? 1 : 1 - pressed.value * 0.012 },
    ],
    opacity: 1 - pressed.value * 0.05,
  }));

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, theme.spring.snappy);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, theme.spring.snappy);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[base, style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
