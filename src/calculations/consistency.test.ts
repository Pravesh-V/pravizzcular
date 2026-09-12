import {
  averageConsistency,
  calculateConsistency,
  calculateStreak,
  DEFAULT_WEIGHTS,
  trainingScoreForDay,
  type StreakDay,
} from './consistency';

describe('calculateConsistency', () => {
  it('computes a weighted average across all categories', () => {
    const result = calculateConsistency(
      { training: 1, nutrition: 1, sleep: 0, water: 1, habits: 1 },
      DEFAULT_WEIGHTS,
    );
    // Everything but sleep (15 of 100) is met.
    expect(result.score).toBe(85);
  });

  it('excludes a rest day from training rather than scoring it zero', () => {
    const withRest = calculateConsistency({
      training: null,
      nutrition: 1,
      sleep: 1,
      water: 1,
      habits: 1,
    });
    // Training drops out entirely, so the remaining categories are all met.
    expect(withRest.score).toBe(100);

    const withMissedWorkout = calculateConsistency({
      training: 0,
      nutrition: 1,
      sleep: 1,
      water: 1,
      habits: 1,
    });
    expect(withMissedWorkout.score).toBe(70);
  });

  it('renormalises weights over the applicable categories only', () => {
    const result = calculateConsistency({ training: 1, nutrition: 0 });
    // 30 vs 30 → half.
    expect(result.score).toBe(50);

    const entry = result.breakdown.find((b) => b.category === 'training');
    expect(entry?.effectiveWeight).toBeCloseTo(0.5, 5);
  });

  it('reports undefined rather than 0% when nothing applied', () => {
    const result = calculateConsistency({});
    expect(result.isUndefined).toBe(true);
    expect(result.score).toBe(0);
  });

  it('ignores categories whose configured weight is zero', () => {
    const result = calculateConsistency(
      { training: 0, nutrition: 1 },
      { ...DEFAULT_WEIGHTS, training: 0 },
    );
    expect(result.score).toBe(100);
  });

  it('clamps out-of-range scores instead of producing >100%', () => {
    const result = calculateConsistency({ training: 5, nutrition: -2 });
    expect(result.score).toBe(50);
  });

  it('never produces NaN for non-finite input', () => {
    const result = calculateConsistency({ training: Number.NaN, nutrition: 1 });
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBe(50);
  });

  it('always reports every category in the breakdown', () => {
    const result = calculateConsistency({ training: 1 });
    expect(result.breakdown).toHaveLength(5);
    expect(result.breakdown.filter((b) => b.score === null)).toHaveLength(4);
  });
});

describe('trainingScoreForDay', () => {
  it('returns null on a planned rest day', () => {
    expect(
      trainingScoreForDay({
        workoutPlanned: false,
        workoutCompleted: false,
        isRestDay: true,
      }),
    ).toBeNull();
  });

  it('scores a missed planned workout as zero', () => {
    expect(
      trainingScoreForDay({
        workoutPlanned: true,
        workoutCompleted: false,
        isRestDay: false,
      }),
    ).toBe(0);
  });

  it('scores a completed workout as one', () => {
    expect(
      trainingScoreForDay({
        workoutPlanned: true,
        workoutCompleted: true,
        isRestDay: false,
      }),
    ).toBe(1);
  });

  it('credits an unplanned workout done on a rest day', () => {
    expect(
      trainingScoreForDay({
        workoutPlanned: false,
        workoutCompleted: true,
        isRestDay: true,
      }),
    ).toBe(1);
  });
});

describe('calculateStreak', () => {
  function day(date: string, achieved: boolean, excused = false): StreakDay {
    return { date, achieved, excused };
  }

  it('counts a simple run', () => {
    const result = calculateStreak([
      day('2026-09-01', true),
      day('2026-09-02', true),
      day('2026-09-03', true),
    ]);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('does not break a training streak across a planned rest day', () => {
    const result = calculateStreak([
      day('2026-09-01', true),
      day('2026-09-02', true),
      day('2026-09-03', false, true), // planned rest
      day('2026-09-04', true),
    ]);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('breaks on a genuinely missed day', () => {
    const result = calculateStreak([
      day('2026-09-01', true),
      day('2026-09-02', false),
      day('2026-09-03', true),
      day('2026-09-04', true),
    ]);
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it('reports a current streak of zero when the latest day was missed', () => {
    const result = calculateStreak([
      day('2026-09-01', true),
      day('2026-09-02', true),
      day('2026-09-03', false),
    ]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
  });

  it('remembers the longest run even after it breaks', () => {
    const result = calculateStreak([
      day('2026-09-01', true),
      day('2026-09-02', true),
      day('2026-09-03', true),
      day('2026-09-04', false),
      day('2026-09-05', true),
    ]);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(3);
  });

  it('handles an empty history', () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it('handles an all-excused history without inventing a streak', () => {
    const result = calculateStreak([
      day('2026-09-01', false, true),
      day('2026-09-02', false, true),
    ]);
    expect(result).toEqual({ current: 0, longest: 0 });
  });
});

describe('averageConsistency', () => {
  it('averages the days that have a score', () => {
    expect(averageConsistency([1, 0.5, null, 0])).toBeCloseTo(0.5, 5);
  });

  it('returns null when there is nothing to average', () => {
    expect(averageConsistency([])).toBeNull();
    expect(averageConsistency([null, null])).toBeNull();
  });
});
