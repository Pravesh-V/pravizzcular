import type { HeightUnit, WeightUnit } from '@/database/schema';

/**
 * Unit conversion.
 *
 * Storage is always canonical (kg, cm, m, seconds). These functions run only at
 * the display edge and at the point of capturing user input, never in between —
 * so a value can never be double-converted.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;
const M_PER_KM = 1000;
const M_PER_MILE = 1609.344;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export interface FeetInches {
  feet: number;
  inches: number;
}

export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cmToInches(cm));
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

export function feetInchesToCm({ feet, inches }: FeetInches): number {
  return inchesToCm(feet * INCHES_PER_FOOT + inches);
}

/** Canonical kg → the user's preferred unit. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** The user's preferred unit → canonical kg. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

export function fromCm(cm: number, unit: HeightUnit): number | FeetInches {
  return unit === 'cm' ? cm : cmToFeetInches(cm);
}

export function metresToKm(m: number): number {
  return m / M_PER_KM;
}

export function metresToMiles(m: number): number {
  return m / M_PER_MILE;
}

/**
 * Smallest increment the user can add on a stepper, in their unit.
 * 2.5 kg matches the common plate pair; 5 lb matches the imperial equivalent.
 */
export function plateIncrement(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5;
}

/**
 * Rounds a weight to something actually loadable on a bar.
 * Guards against progression suggestions like "82.3333 kg".
 */
export function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || increment <= 0) return 0;
  return Math.round(value / increment) * increment;
}

// --- Display formatting ---------------------------------------------------

/** Drops trailing zeros after the decimal point: 82.5 → "82.5", 80.0 → "80". */
export function formatNumber(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(maxDecimals);
  // Only strip inside the fractional part — otherwise 160 would become "16".
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

export function formatWeight(kg: number | null, unit: WeightUnit): string {
  if (kg === null || !Number.isFinite(kg)) return '—';
  return `${formatNumber(fromKg(kg, unit))} ${unit}`;
}

export function formatHeight(cm: number | null, unit: HeightUnit): string {
  if (cm === null || !Number.isFinite(cm)) return '—';
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

/** Seconds → "58 min", "1h 12m", or "45s" depending on magnitude. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';

  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;

  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

/** Seconds → "7h 42m", for sleep-style readouts. */
export function formatHoursMinutes(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Clock format for a running timer: "MM:SS" or "H:MM:SS". */
export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatVolume(kg: number, unit: WeightUnit): string {
  const value = fromKg(kg, unit);
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('en-US')} ${unit}`;
}

/** Signed percentage for deltas: +19.6%, -3.2%, or "—" when undefined. */
export function formatSignedPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
