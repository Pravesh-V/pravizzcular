import {
  calculateDelta,
  calculateTrend,
  compareExercise,
  EMPTY_PERIOD,
  movingAverage,
  percentagePointDelta,
  type PeriodStats,
} from './progress';

function period(partial: Partial<PeriodStats>): PeriodStats {
  return { ...EMPTY_PERIOD, ...partial };
}

describe('calculateDelta', () => {
  it('computes an increase', () => {
    const delta = calculateDelta(42800, 51200);
    expect(delta?.absolute).toBe(8400);
    expect(delta?.percent).toBeCloseTo(19.63, 1);
    expect(delta?.direction).toBe('up');
  });

  it('computes a decrease', () => {
    const delta = calculateDelta(100, 90);
    expect(delta?.percent).toBeCloseTo(-10, 5);
    expect(delta?.direction).toBe('down');
  });

  it('reports flat for no change', () => {
    expect(calculateDelta(80, 80)?.direction).toBe('flat');
    expect(calculateDelta(80, 80)?.percent).toBe(0);
  });

  it('returns null percent instead of Infinity when the baseline is zero', () => {
    const delta = calculateDelta(0, 50);
    expect(delta?.percent).toBeNull();
    expect(delta?.absolute).toBe(50);
  });

  it('returns null for non-finite input', () => {
    expect(calculateDelta(Number.NaN, 10)).toBeNull();
    expect(calculateDelta(10, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('uses the magnitude of the baseline so negatives do not flip the sign', () => {
    const delta = calculateDelta(-10, -5);
    expect(delta?.direction).toBe('up');
    expect(delta?.percent).toBeCloseTo(50, 5);
  });
});

describe('percentagePointDelta', () => {
  it('subtracts percentages directly', () => {
    expect(percentagePointDelta(78, 91)).toBe(13);
  });

  it('returns null for non-finite input', () => {
    expect(percentagePointDelta(Number.NaN, 91)).toBeNull();
  });
});

describe('compareExercise', () => {
  it('reports a delta when both periods have enough sessions', () => {
    const result = compareExercise(
      period({ sessions: 4, bestE1RMKg: 95 }),
      period({ sessions: 4, bestE1RMKg: 104 }),
      'estimated_1rm',
    );
    expect(result.status).toBe('ok');
    expect(result.delta?.percent).toBeCloseTo(9.47, 1);
  });

  it('refuses to compare when the previous period is empty', () => {
    const result = compareExercise(
      period({ sessions: 0 }),
      period({ sessions: 4, bestE1RMKg: 104 }),
    );
    expect(result.status).toBe('no_baseline');
    expect(result.delta).toBeNull();
    expect(result.note).toMatch(/no sessions/i);
  });

  it('refuses to compare on a single session', () => {
    const result = compareExercise(
      period({ sessions: 1, bestE1RMKg: 95 }),
      period({ sessions: 4, bestE1RMKg: 104 }),
    );
    expect(result.status).toBe('insufficient_data');
    expect(result.delta).toBeNull();
  });

  it('refuses when the chosen basis has no data', () => {
    const result = compareExercise(
      period({ sessions: 4, bestE1RMKg: null }),
      period({ sessions: 4, bestE1RMKg: null }),
      'estimated_1rm',
    );
    expect(result.status).toBe('insufficient_data');
  });

  it('compares on volume when asked', () => {
    const result = compareExercise(
      period({ sessions: 3, totalVolumeKg: 10000 }),
      period({ sessions: 3, totalVolumeKg: 12000 }),
      'volume',
    );
    expect(result.status).toBe('ok');
    expect(result.delta?.percent).toBeCloseTo(20, 5);
  });
});

describe('calculateTrend', () => {
  it('detects an upward trend', () => {
    const result = calculateTrend([70, 70.5, 71, 71.5, 72]);
    expect(result?.direction).toBe('improving');
    expect(result?.slope).toBeCloseTo(0.5, 5);
  });

  it('detects a downward trend', () => {
    expect(calculateTrend([72, 71.5, 71, 70.5])?.direction).toBe('declining');
  });

  it('detects a flat series', () => {
    expect(calculateTrend([72, 72, 72, 72])?.direction).toBe('flat');
  });

  it('returns null with fewer than two points', () => {
    expect(calculateTrend([])).toBeNull();
    expect(calculateTrend([72])).toBeNull();
  });

  it('never returns NaN for a constant series', () => {
    const result = calculateTrend([0, 0, 0]);
    expect(Number.isFinite(result?.slope as number)).toBe(true);
  });
});

describe('movingAverage', () => {
  it('smooths a series over a trailing window', () => {
    const result = movingAverage([70, 72, 74], 3);
    expect(result[0]).toBe(70);
    expect(result[1]).toBe(71);
    expect(result[2]).toBe(72);
  });

  it('returns nulls for a non-positive window rather than throwing', () => {
    expect(movingAverage([1, 2], 0)).toEqual([null, null]);
  });
});
