import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Screen, Text } from '@/components/ui';
import { useMotion, useTheme } from '@/theme';

interface OnboardingStepProps {
  /** 1-based index used for the progress indicator. */
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onBack?: () => void;
  /** Scrollable variant for steps with enough content to overflow shorter viewports. */
  scroll?: boolean;
}

export function OnboardingStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  primaryLabel = 'Continue',
  onPrimary,
  primaryDisabled = false,
  onBack,
  scroll = false,
}: OnboardingStepProps) {
  const theme = useTheme();
  const motion = useMotion();
  const router = useRouter();

  const canGoBack = step > 1;

  return (
    <Screen scroll={scroll} contentContainerStyle={scroll ? { flexGrow: 1 } : undefined}>
      <View style={{ flex: 1, paddingTop: theme.spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.xxl,
          }}
          accessibilityLabel={`Step ${step} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  index < step ? theme.color.accent : theme.color.track,
              }}
            />
          ))}
        </View>

        <Animated.View
          entering={motion.reduceMotion ? undefined : FadeInDown.duration(280)}
          key={step}
        >
          <Text variant="display">{title}</Text>
          {subtitle ? (
            <Text
              variant="callout"
              tone="secondary"
              style={{ marginTop: theme.spacing.sm }}
            >
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={motion.reduceMotion ? undefined : FadeIn.delay(120).duration(300)}
          style={{ flex: 1, marginTop: theme.spacing.xxl }}
        >
          {children}
        </Animated.View>

        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
          <Button
            label={primaryLabel}
            onPress={onPrimary}
            disabled={primaryDisabled}
            fullWidth
            size="lg"
          />
          {canGoBack ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              accessibilityRole="button"
              style={{ alignSelf: 'center', padding: theme.spacing.sm }}
            >
              <Text variant="footnote" tone="muted">
                Back
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

interface ChoiceProps<T extends string> {
  options: { value: T; label: string; hint?: string }[];
  value: T | null;
  onChange: (value: T) => void;
}

/** Single-select list used throughout onboarding. */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
}: ChoiceProps<T>) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              paddingVertical: theme.spacing.base,
              paddingHorizontal: theme.spacing.base,
              borderRadius: theme.radius.md,
              borderWidth: theme.borderWidth.thin,
              borderColor: selected ? theme.color.accent : theme.color.borderSubtle,
              backgroundColor: selected ? theme.color.accentSoft : theme.color.surface,
              minHeight: theme.minTouchTarget,
              justifyContent: 'center',
            }}
          >
            <Text variant="bodyStrong" tone={selected ? 'accent' : 'primary'}>
              {option.label}
            </Text>
            {option.hint ? (
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {option.hint}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
