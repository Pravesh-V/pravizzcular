import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  /** Optional leading element (icon). Kept generic to avoid an icon dependency here. */
  leading?: React.ReactNode;
}

const heights: Record<Size, number> = { sm: 36, md: 46, lg: 54 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityHint,
  leading,
}: ButtonProps) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const inactive = disabled || loading;

  const surface: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: theme.color.accent },
    secondary: {
      backgroundColor: theme.color.elevated,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.color.border,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: {
      backgroundColor: theme.color.negativeSoft,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.color.negative,
    },
  };

  const tone = {
    primary: 'onAccent',
    secondary: 'primary',
    ghost: 'accent',
    danger: 'negative',
  } as const;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

  return (
    <AnimatedPressable
      onPress={inactive ? undefined : onPress}
      onPressIn={() => {
        if (!inactive) pressed.value = withSpring(1, theme.spring.snappy);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, theme.spring.snappy);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        {
          minHeight: heights[size],
          paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          opacity: inactive ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        surface[variant],
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.color.textOnAccent : theme.color.accent}
        />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text
            variant={size === 'sm' ? 'subhead' : 'bodyStrong'}
            tone={tone[variant]}
          >
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
