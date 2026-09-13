/**
 * Restrained colour system.
 *
 * Rules that the rest of the app relies on:
 * - `accent` is the only brand hue. It marks the primary action and nothing else.
 * - `positive` means completed/on-target. Never decorative.
 * - `negative` means missed/over-limit warning. Never decorative.
 * - `attention` (amber) is used sparingly, for "needs a look", not for errors.
 *
 * Colour is never the sole carrier of meaning — every status pairs with an
 * icon, label, or shape (see ACCESSIBILITY in the product spec).
 */

export type ColorScheme = 'dark' | 'light';

export interface Palette {
  /** Page background, furthest back. */
  canvas: string;
  /** Default card/panel background. */
  surface: string;
  /** Raised surfaces: sheets, menus, active rows. */
  elevated: string;
  /** Recessed wells: input fields, track backgrounds. */
  sunken: string;

  /** Hairline dividers between rows. */
  borderSubtle: string;
  /** Visible container edges. */
  border: string;
  /** Focus/selected outlines. */
  borderStrong: string;

  /** Primary reading colour. */
  text: string;
  /** Labels, metadata, supporting copy. */
  textSecondary: string;
  /** De-emphasised hints, placeholders, axis labels. */
  textMuted: string;
  /** Text placed on top of `accent`. */
  textOnAccent: string;

  accent: string;
  /** Second stop for the accent gradient — used on primary CTAs and hero moments only. */
  accentDeep: string;
  /** Two-stop gradient colors, brand moments only: primary button, hero ring, PR celebration. */
  accentGradient: readonly [string, string];
  /** Low-opacity accent for fills and chips. */
  accentSoft: string;
  accentPressed: string;
  /** Soft glow behind hero content. Screen-scale use only, never on small elements. */
  accentGlow: string;

  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  attention: string;
  attentionSoft: string;

  /** Neutral track behind progress indicators. */
  track: string;
  /** Scrim behind modal sheets. */
  scrim: string;
  /** Skeleton loading blocks. */
  skeleton: string;
}

const dark: Palette = {
  canvas: '#0A0A0B',
  surface: '#131315',
  elevated: '#1B1B1E',
  sunken: '#08080A',

  borderSubtle: '#202024',
  border: '#2A2A2F',
  borderStrong: '#3A3A41',

  text: '#F4F4F2',
  textSecondary: '#9C9CA4',
  textMuted: '#6B6B73',
  textOnAccent: '#0A0A0B',

  accent: '#7C6CFF',
  accentDeep: '#4F7DFF',
  accentGradient: ['#9C7CFF', '#4F7DFF'],
  accentSoft: 'rgba(124, 108, 255, 0.16)',
  accentPressed: '#6857EE',
  accentGlow: 'rgba(124, 108, 255, 0.22)',

  positive: '#4CC38A',
  positiveSoft: 'rgba(76, 195, 138, 0.14)',
  negative: '#E5695F',
  negativeSoft: 'rgba(229, 105, 95, 0.14)',
  attention: '#E0B152',
  attentionSoft: 'rgba(224, 177, 82, 0.14)',

  track: '#232328',
  scrim: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1E1E22',
};

const light: Palette = {
  canvas: '#FBFBFA',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  sunken: '#F2F2F0',

  borderSubtle: '#EAEAE7',
  border: '#DEDEDA',
  borderStrong: '#C6C6C1',

  text: '#16161A',
  textSecondary: '#5E5E66',
  textMuted: '#8A8A92',
  textOnAccent: '#FFFFFF',

  accent: '#5B4FE0',
  accentDeep: '#3654D6',
  accentGradient: ['#7A5BEA', '#3654D6'],
  accentSoft: 'rgba(91, 79, 224, 0.10)',
  accentPressed: '#4A3FC8',
  accentGlow: 'rgba(91, 79, 224, 0.14)',

  positive: '#2F9E68',
  positiveSoft: 'rgba(47, 158, 104, 0.10)',
  negative: '#CF4B41',
  negativeSoft: 'rgba(207, 75, 65, 0.10)',
  attention: '#B5841F',
  attentionSoft: 'rgba(181, 132, 31, 0.12)',

  track: '#E7E7E4',
  scrim: 'rgba(0, 0, 0, 0.35)',
  skeleton: '#EFEFEC',
};

export const palettes: Record<ColorScheme, Palette> = { dark, light };
