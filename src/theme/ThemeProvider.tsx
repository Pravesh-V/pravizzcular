import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './colors';
import {
  borderWidth,
  duration,
  fontFamily,
  minTouchTarget,
  radius,
  spacing,
  spring,
  typeScale,
} from './tokens';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Theme {
  scheme: ColorScheme;
  color: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  borderWidth: typeof borderWidth;
  type: typeof typeScale;
  fontFamily: typeof fontFamily;
  duration: typeof duration;
  spring: typeof spring;
  minTouchTarget: number;
  /** True when the OS asks for reduced motion. Drives every animation. */
  reduceMotion: boolean;
}

interface ThemeContextValue extends Theme {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Persisted user choice. Defaults to the dark-first product direction. */
  preference?: ThemePreference;
  onPreferenceChange?: (next: ThemePreference) => void;
}

export function ThemeProvider({
  children,
  preference: controlledPreference,
  onPreferenceChange,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [uncontrolled, setUncontrolled] = useState<ThemePreference>('dark');
  const [reduceMotion, setReduceMotion] = useState(false);

  const preference = controlledPreference ?? uncontrolled;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        // Not available on every platform; default of `false` is fine.
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

    return {
      scheme,
      color: palettes[scheme],
      spacing,
      radius,
      borderWidth,
      type: typeScale,
      fontFamily,
      duration,
      spring,
      minTouchTarget,
      reduceMotion,
      preference,
      setPreference: (next) => {
        setUncontrolled(next);
        onPreferenceChange?.(next);
      },
    };
  }, [preference, systemScheme, reduceMotion, onPreferenceChange]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Animation helper. Returns 0 duration when reduced motion is on, so callers
 * can pass the result straight to Reanimated without branching everywhere.
 */
export function useMotion() {
  const { reduceMotion, duration: d, spring: s } = useTheme();
  return useMemo(
    () => ({
      reduceMotion,
      duration: (key: keyof typeof d) => (reduceMotion ? 0 : d[key]),
      spring: (key: keyof typeof s) => s[key],
    }),
    [reduceMotion, d, s],
  );
}
