import { useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useDatabaseContext } from '@/services/database/DatabaseProvider';
import { useSession } from '@/services/session/SessionProvider';
import { useTheme } from '@/theme';

/**
 * Holds the UI until storage is ready, and routes a new user into onboarding.
 *
 * Errors surface as plain language — the technical cause is logged, never
 * shown. "Supabase 23505 constraint violation" is not a user-facing string.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { status, retry } = useDatabaseContext();
  const { isLoading, isOnboarded } = useSession();
  const router = useRouter();
  const segments = useSegments();

  const blocked = status !== 'ready' || isLoading;

  useEffect(() => {
    if (blocked) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/');
    }
  }, [blocked, isOnboarded, segments, router]);

  if (status === 'error') {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.base,
          }}
        >
          <Text variant="title2" align="center">
            Something went wrong
          </Text>
          <Text variant="footnote" tone="secondary" align="center">
            We couldn&apos;t load your data. Your logs are still saved on this device.
          </Text>
          <Button label="Try again" onPress={retry} />
        </View>
      </Screen>
    );
  }

  if (blocked) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.color.canvas,
        }}
      >
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  return <>{children}</>;
}
