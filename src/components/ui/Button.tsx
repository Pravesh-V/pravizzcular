import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, View, type ViewStyle } from 'react-native';
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
    // Gradient fill is painted separately below; this stays transparent.
    primary: {},
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

  // A soft colored glow under the primary CTA is the one "loud" moment this
  // component is allowed — every other variant stays flat and quiet.
  const glowStyle: ViewStyle =
    variant === 'primary' && !inactive
      ? Platform.select({
          web: { boxShadow: `0 8px 24px -6px ${theme.color.accentGlow}` } as ViewStyle,
          default: {
            shadowColor: theme.color.accent,
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          },
        }) ?? {}
      : {};

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
          overflow: 'hidden',
        },
        surface[variant],
        glowStyle,
        style,
        animatedStyle,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.color.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ ...StyleSheetAbsoluteFill }}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.color.textOnAccent : theme.color.accent}
        />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text variant={size === 'sm' ? 'subhead' : 'bodyStrong'} tone={tone[variant]}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const StyleSheetAbsoluteFill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
