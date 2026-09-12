import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppGate } from '@/features/shell/AppGate';
import type { Database } from '@/database/Database';
import {
  hasLibrary,
  seedDemoHistory,
  seedLibrary,
  seedStarterContent,
} from '@/database/seed';
import { LocalAuthBackend } from '@/services/auth/LocalAuthBackend';
import { DatabaseProvider } from '@/services/database/DatabaseProvider';
import { SessionProvider } from '@/services/session/SessionProvider';
import { ThemedRoot } from '@/features/shell/ThemedRoot';

export default function RootLayout() {
  /**
   * First-run setup. Installs the exercise/food library, the starter templates
   * and a demo history so a fresh install is immediately explorable rather than
   * an empty shell. Demo rows are flagged and removable from Settings.
   */
  const onDatabaseReady = useCallback(async (db: Database) => {
    if (hasLibrary(db)) return;

    const backend = new LocalAuthBackend(db);
    const user = await backend.signInAnonymously();

    seedLibrary(db, user.id);
    seedStarterContent(db, user.id);
    seedDemoHistory(db, user.id);

    await db.flush();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider onReady={onDatabaseReady}>
          <SessionProvider>
            <ThemedRoot>
              <AppGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
              </AppGate>
              <StatusBar style="light" />
            </ThemedRoot>
          </SessionProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
