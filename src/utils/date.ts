import type { LocalDate } from '@/database/schema';

/**
 * Local-calendar-day handling.
 *
 * The rule the whole app follows: an instant is stored as UTC ISO, but the day
 * something *belongs to* is derived in the user's timezone. A 23:30 meal in
 * Asia/Kolkata belongs to that day, not to tomorrow because UTC rolled over.
 *
 * Every function takes the timezone explicitly. Nothing here reads ambient
 * state, which is what makes the behaviour testable and deterministic.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidLocalDate(value: string): value is LocalDate {
  const match = DATE_RE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Reject impossible days (31 Feb, 31 Apr) by round-tripping through UTC.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Formats an instant as the calendar day it falls on in `timezone`. */
export function toLocalDate(instant: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's calendar day in `timezone`. */
export function today(timezone: string, now: Date = new Date()): LocalDate {
  return toLocalDate(now, timezone);
}

/** Wall-clock time 'HH:mm' in `timezone`. */
export function toLocalTime(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function parseLocalDate(date: LocalDate): DateParts {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid LocalDate: "${date}"`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function fromParts({ year, month, day }: DateParts): LocalDate {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Treats a LocalDate as noon UTC.
 *
 * Noon rather than midnight so that adding days can never land on the wrong
 * side of a DST transition when the result is reformatted.
 */
function toUtcAnchor(date: LocalDate): Date {
  const { year, month, day } = parseLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function fromUtcAnchor(instant: Date): LocalDate {
  return fromParts({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  });
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const anchor = toUtcAnchor(date);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return fromUtcAnchor(anchor);
}

export function addMonths(date: LocalDate, months: number): LocalDate {
  const { year, month, day } = parseLocalDate(date);
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  // Clamp to the last valid day, so 31 Jan + 1 month is 28/29 Feb, not 3 March.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();

  return fromParts({
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: Math.min(day, lastDay),
  });
}

/** Whole days from `a` to `b`. Negative when `b` precedes `a`. */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  const ms = toUtcAnchor(b).getTime() - toUtcAnchor(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function weekdayOf(date: LocalDate): number {
  const day = toUtcAnchor(date).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Bitmask position for a date, matching `Weekday` in the schema. */
export function weekdayBit(date: LocalDate): number {
  return 1 << (weekdayOf(date) - 1);
}

export function startOfMonth(date: LocalDate): LocalDate {
  const { year, month } = parseLocalDate(date);
  return fromParts({ year, month, day: 1 });
}

export function endOfMonth(date: LocalDate): LocalDate {
  const { year, month } = parseLocalDate(date);
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return fromParts({ year, month, day: lastDay });
}

export function startOfWeek(date: LocalDate, firstDayOfWeek: 1 | 7 = 1): LocalDate {
  const iso = weekdayOf(date);
  const offset = firstDayOfWeek === 1 ? iso - 1 : iso % 7;
  return addDays(date, -offset);
}

/** Inclusive list of days from `from` to `to`. Empty when the range inverts. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];

  const out: LocalDate[] = [];
  for (let i = 0; i <= span; i += 1) out.push(addDays(from, i));
  return out;
}

export function isBefore(a: LocalDate, b: LocalDate): boolean {
  return a < b;
}

export function isAfter(a: LocalDate, b: LocalDate): boolean {
  return a > b;
}

export function isSameMonth(a: LocalDate, b: LocalDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function monthName(date: LocalDate): string {
  const { month } = parseLocalDate(date);
  return MONTH_NAMES[month - 1] ?? '';
}

export function dayName(date: LocalDate): string {
  return DAY_NAMES[weekdayOf(date) - 1] ?? '';
}

/** e.g. "Tuesday, September 15". */
export function formatLongDate(date: LocalDate): string {
  const { day } = parseLocalDate(date);
  return `${dayName(date)}, ${monthName(date)} ${day}`;
}

/** e.g. "Sep 15". */
export function formatShortDate(date: LocalDate): string {
  const { day } = parseLocalDate(date);
  return `${monthName(date).slice(0, 3)} ${day}`;
}

/** Formats 'HH:mm' for display, honouring the 12/24-hour preference. */
export function formatTime(time: string, format: '12h' | '24h'): string {
  const [rawHour, rawMinute] = time.split(':');
  const hour = Number(rawHour);
  const minute = rawMinute ?? '00';
  if (!Number.isFinite(hour)) return time;

  if (format === '24h') return `${String(hour).padStart(2, '0')}:${minute}`;

  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Drives the "Good morning / afternoon / evening" greeting. */
export function dayPart(instant: Date, timezone: string): DayPart {
  const hour = Number(toLocalTime(instant, timezone).slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Best-effort device timezone. Falls back to UTC where unavailable. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
