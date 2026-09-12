import { Platform } from 'react-native';

/** 4pt base scale. Generous by default — whitespace is part of the design. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: Platform.select({ ios: 0.5, default: 1 }) as number,
  thin: 1,
  thick: 2,
} as const;

/**
 * Tabular figures keep numbers from jittering while they animate (count-ups,
 * live timers, weight steppers). Used by every numeric readout in the app.
 */
const monoStack = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
}) as string;

const sansStack = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}) as string;

export const fontFamily = {
  sans: sansStack,
  mono: monoStack,
} as const;

export type TypeScaleKey =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
  textTransform?: 'uppercase';
}

export const typeScale: Record<TypeScaleKey, TypeStyle> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  title1: { fontSize: 27, lineHeight: 33, fontWeight: '600', letterSpacing: -0.4 },
  title2: { fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.2 },
  title3: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  // Section labels: TODAY, WORKOUT, NUTRITION.
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
};

/**
 * Motion tokens. Durations are deliberately short — the spec calls for subtle,
 * premium motion, not long loading theatre. Every consumer must route through
 * `useMotion()` so reduced-motion collapses these to 0.
 */
export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 360,
  celebration: 900,
} as const;

export const spring = {
  /** Default for sheets, cards, layout shifts. */
  standard: { damping: 22, stiffness: 210, mass: 1 },
  /** Snappier: toggles, checkmarks, press feedback. */
  snappy: { damping: 26, stiffness: 320, mass: 0.8 },
  /** Softer overshoot: PR celebration, milestone unlocks. */
  expressive: { damping: 16, stiffness: 180, mass: 1 },
} as const;

/** Minimum touch target per accessibility guidance. */
export const minTouchTarget = 44;
