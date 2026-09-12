import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';

import { useSession } from '@/services/session/SessionProvider';
import { palettes, ThemeProvider, type ThemePreference } from '@/theme';

/**
 * Binds the theme to the persisted user setting, so a preference change is
 * durable rather than living only in React state.
 */
export function ThemedRoot({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSession();

  const preference: ThemePreference = settings?.theme ?? 'dark';

  const handleChange = useCallback(
    (next: ThemePreference) => updateSettings({ theme: next }),
    [updateSettings],
  );

  return (
    <ThemeProvider preference={preference} onPreferenceChange={handleChange}>
      <View
        style={{
          flex: 1,
          backgroundColor:
            palettes[preference === 'light' ? 'light' : 'dark'].canvas,
        }}
      >
        {children}
      </View>
    </ThemeProvider>
  );
}
