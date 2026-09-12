/**
 * Comparison maths shared by the monthly report, exercise progress, and goals.
 *
 * The governing rule: never manufacture progress. When there isn't enough data
 * to make an honest comparison, these functions return null and the UI says so
 * rather than printing a confident-looking zero.
 */

export interface Delta {
  from: number;
  to: number;
  absolute: number;
  /** Percentage change. Null when `from` is 0, where percent change is undefined. */
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
}

/** Signed change between two values. */
export function calculateDelta(from: number, to: number): Delta | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;

  const absolute = to - from;
  // Percent change from zero is undefined, not infinite. Report null.
  const percent = from === 0 ? null : (absolute / Math.abs(from)) * 100;

  let direction: Delta['direction'] = 'flat';
  if (absolute > 0) direction = 'up';
  else if (absolute < 0) direction = 'down';

  return {
    from,
    to,
    absolute: round2(absolute),
    percent: percent === null ? null : round2(percent),
    direction,
  };
}

/** Percentage-point difference, for comparing two percentages. */
export function percentagePointDelta(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return round2(to - from);
}

export type ComparisonBasis =
  | 'max_weight'
  | 'estimated_1rm'
  | 'volume'
  | 'reps'
  | 'best_set';

export interface PeriodStats {
  /** Number of sessions that contributed. Drives the confidence gate. */
  sessions: number;
  maxWeightKg: number | null;
  bestE1RMKg: number | null;
  totalVolumeKg: number;
  bestReps: number | null;
}

export const EMPTY_PERIOD: PeriodStats = {
  sessions: 0,
  maxWeightKg: null,
  bestE1RMKg: null,
  totalVolumeKg: 0,
  bestReps: null,
};

/**
 * Minimum sessions in *each* period before a comparison is reported.
 * One session against one session is noise, not progress.
 */
export const MIN_SESSIONS_FOR_COMPARISON = 2;

export type ComparisonStatus = 'ok' | 'insufficient_data' | 'no_baseline';

export interface ExerciseComparison {
  basis: ComparisonBasis;
  status: ComparisonStatus;
  delta: Delta | null;
  /** Human-readable reason when status is not 'ok'. Shown verbatim. */
  note: string | null;
}

function valueFor(stats: PeriodStats, basis: ComparisonBasis): number | null {
  switch (basis) {
    case 'max_weight':
    case 'best_set':
      return stats.maxWeightKg;
    case 'estimated_1rm':
      return stats.bestE1RMKg;
    case 'volume':
      return stats.totalVolumeKg > 0 ? stats.totalVolumeKg : null;
    case 'reps':
      return stats.bestReps;
    default:
      return null;
  }
}

/**
 * Compares one exercise across two periods.
 *
 * Refuses to report a delta unless both periods carry enough sessions, so the
 * monthly report never claims "+10%" off a single lucky session.
 */
export function compareExercise(
  previous: PeriodStats,
  current: PeriodStats,
  basis: ComparisonBasis = 'estimated_1rm',
): ExerciseComparison {
  if (previous.sessions === 0) {
    return {
      basis,
      status: 'no_baseline',
      delta: null,
      note: 'No sessions last period to compare against.',
    };
  }

  if (
    previous.sessions < MIN_SESSIONS_FOR_COMPARISON ||
    current.sessions < MIN_SESSIONS_FOR_COMPARISON
  ) {
    return {
      basis,
      status: 'insufficient_data',
      delta: null,
      note: `Needs at least ${MIN_SESSIONS_FOR_COMPARISON} sessions in each period for a fair comparison.`,
    };
  }

  const from = valueFor(previous, basis);
  const to = valueFor(current, basis);

  if (from === null || to === null) {
    return {
      basis,
      status: 'insufficient_data',
      delta: null,
      note: 'Not enough logged detail to compare on this basis.',
    };
  }

  return { basis, status: 'ok', delta: calculateDelta(from, to), note: null };
}

// --- Trend detection ------------------------------------------------------

export type TrendDirection = 'improving' | 'flat' | 'declining';

export interface TrendResult {
  direction: TrendDirection;
  /** Least-squares slope per data point, in the series' own units. */
  slope: number;
  /** Null when there are fewer than two points. */
  changePerWeek: number | null;
}

/**
 * Linear least-squares fit over an evenly-spaced series.
 * Used for bodyweight trend and plateau detection.
 */
export function calculateTrend(
  values: number[],
  { pointsPerWeek = 7, flatThreshold = 0.001 }: { pointsPerWeek?: number; flatThreshold?: number } = {},
): TrendResult | null {
  const usable = values.filter((v) => Number.isFinite(v));
  if (usable.length < 2) return null;

  const n = usable.length;
  const meanX = (n - 1) / 2;
  const meanY = usable.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = i - meanX;
    numerator += dx * ((usable[i] as number) - meanY);
    denominator += dx * dx;
  }

  if (denominator === 0) return { direction: 'flat', slope: 0, changePerWeek: 0 };

  const slope = numerator / denominator;
  const relative = meanY !== 0 ? Math.abs(slope / meanY) : Math.abs(slope);

  let direction: TrendDirection = 'flat';
  if (relative > flatThreshold) direction = slope > 0 ? 'improving' : 'declining';

  return {
    direction,
    slope: round2(slope),
    changePerWeek: round2(slope * pointsPerWeek),
  };
}

/** Trailing moving average. Smooths daily noise out of bodyweight. */
export function movingAverage(values: number[], window: number): (number | null)[] {
  if (window < 1) return values.map(() => null);

  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1).filter((v) => Number.isFinite(v));
    if (slice.length === 0) return null;
    return round2(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
