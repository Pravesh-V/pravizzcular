import type { SetType, WorkoutSet } from '@/database/schema';

import {
  bestE1RM,
  calculateE1RM,
  calculateVolume,
  countWorkingSets,
  e1rmConfidence,
  E1RM_REP_LIMIT,
  heaviestSet,
  suggestProgression,
  totalReps,
} from './strength';

let counter = 0;

function makeSet(partial: Partial<WorkoutSet> = {}): WorkoutSet {
  counter += 1;
  return {
    id: `set-${counter}`,
    userId: 'user-1',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
    deletedAt: null,
    workoutExerciseId: 'we-1',
    setIndex: counter,
    setType: 'working' as SetType,
    weightKg: 80,
    reps: 8,
    durationSec: null,
    distanceM: null,
    rpe: null,
    rir: null,
    isComplete: true,
    loggedAt: '2026-09-15T10:00:00.000Z',
    ...partial,
  };
}

describe('calculateE1RM', () => {
  it('applies the Epley formula by default', () => {
    // 80 × (1 + 8/30) = 101.33
    expect(calculateE1RM({ weightKg: 80, reps: 8 })).toBeCloseTo(101.33, 2);
  });

  it('returns the load itself for a single rep', () => {
    expect(calculateE1RM({ weightKg: 100, reps: 1 })).toBe(100);
  });

  it('supports alternative formulas', () => {
    // Brzycki: 80 × 36/(37-8) = 99.31
    expect(calculateE1RM({ weightKg: 80, reps: 8, formula: 'brzycki' })).toBeCloseTo(
      99.31,
      2,
    );
    // Lombardi: 80 × 8^0.1 = 98.49
    expect(calculateE1RM({ weightKg: 80, reps: 8, formula: 'lombardi' })).toBeCloseTo(
      98.49,
      2,
    );
  });

  it('refuses to estimate beyond the rep limit rather than printing nonsense', () => {
    expect(calculateE1RM({ weightKg: 60, reps: E1RM_REP_LIMIT })).not.toBeNull();
    expect(calculateE1RM({ weightKg: 60, reps: E1RM_REP_LIMIT + 1 })).toBeNull();
    expect(calculateE1RM({ weightKg: 20, reps: 100 })).toBeNull();
  });

  it('returns null for zero and negative inputs instead of NaN', () => {
    expect(calculateE1RM({ weightKg: 0, reps: 8 })).toBeNull();
    expect(calculateE1RM({ weightKg: 80, reps: 0 })).toBeNull();
    expect(calculateE1RM({ weightKg: -80, reps: 8 })).toBeNull();
    expect(calculateE1RM({ weightKg: 80, reps: -5 })).toBeNull();
  });

  it('returns null for non-finite inputs', () => {
    expect(calculateE1RM({ weightKg: Number.NaN, reps: 8 })).toBeNull();
    expect(calculateE1RM({ weightKg: 80, reps: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it('never returns NaN or Infinity for any valid rep count', () => {
    for (let reps = 1; reps <= E1RM_REP_LIMIT; reps += 1) {
      for (const formula of ['epley', 'brzycki', 'lombardi'] as const) {
        const result = calculateE1RM({ weightKg: 80, reps, formula });
        expect(result).not.toBeNull();
        expect(Number.isFinite(result as number)).toBe(true);
      }
    }
  });

  it('grades confidence by how far it extrapolates', () => {
    expect(e1rmConfidence(3)).toBe('high');
    expect(e1rmConfidence(8)).toBe('moderate');
    expect(e1rmConfidence(13)).toBe('low');
  });
});

describe('bestE1RM', () => {
  it('picks the highest estimate across sets', () => {
    const sets = [
      makeSet({ weightKg: 80, reps: 8 }), // 101.33
      makeSet({ weightKg: 90, reps: 5 }), // 105.00
      makeSet({ weightKg: 75, reps: 10 }), // 100.00
    ];
    expect(bestE1RM(sets)).toBeCloseTo(105, 2);
  });

  it('ignores incomplete sets', () => {
    const sets = [
      makeSet({ weightKg: 80, reps: 8, isComplete: true }),
      makeSet({ weightKg: 200, reps: 5, isComplete: false }),
    ];
    expect(bestE1RM(sets)).toBeCloseTo(101.33, 2);
  });

  it('returns null when nothing qualifies', () => {
    expect(bestE1RM([])).toBeNull();
    expect(bestE1RM([makeSet({ weightKg: null, reps: null })])).toBeNull();
  });
});

describe('calculateVolume', () => {
  it('sums weight times reps over working sets', () => {
    const sets = [
      makeSet({ weightKg: 60, reps: 10 }), // 600
      makeSet({ weightKg: 70, reps: 8 }), // 560
      makeSet({ weightKg: 70, reps: 8 }), // 560
    ];
    expect(calculateVolume(sets)).toBe(1720);
  });

  it('excludes warm-ups by default but can include them', () => {
    const sets = [
      makeSet({ weightKg: 40, reps: 10, setType: 'warmup' }), // 400
      makeSet({ weightKg: 80, reps: 5 }), // 400
    ];
    expect(calculateVolume(sets)).toBe(400);
    expect(calculateVolume(sets, { includeWarmups: true })).toBe(800);
  });

  it('ignores incomplete sets and sets missing a measurement', () => {
    const sets = [
      makeSet({ weightKg: 80, reps: 5, isComplete: false }),
      makeSet({ weightKg: null, reps: 5 }),
      makeSet({ weightKg: 80, reps: null }),
      makeSet({ weightKg: 80, reps: 5 }),
    ];
    expect(calculateVolume(sets)).toBe(400);
  });

  it('returns 0 rather than NaN for an empty or degenerate list', () => {
    expect(calculateVolume([])).toBe(0);
    expect(calculateVolume([makeSet({ weightKg: 0, reps: 0 })])).toBe(0);
  });

  it('ignores negative values', () => {
    expect(calculateVolume([makeSet({ weightKg: -80, reps: 5 })])).toBe(0);
  });
});

describe('set aggregates', () => {
  it('counts only completed working sets', () => {
    const sets = [
      makeSet({ setType: 'warmup' }),
      makeSet({ setType: 'working' }),
      makeSet({ setType: 'drop' }),
      makeSet({ setType: 'working', isComplete: false }),
    ];
    expect(countWorkingSets(sets)).toBe(2);
  });

  it('totals reps across completed sets', () => {
    expect(totalReps([makeSet({ reps: 10 }), makeSet({ reps: 8 })])).toBe(18);
    expect(totalReps([makeSet({ reps: null })])).toBe(0);
  });

  it('finds the heaviest completed set', () => {
    const heavy = makeSet({ weightKg: 100, reps: 3 });
    expect(heaviestSet([makeSet({ weightKg: 80 }), heavy])?.id).toBe(heavy.id);
    expect(heaviestSet([])).toBeNull();
  });
});

describe('suggestProgression', () => {
  it('adds load when every top set held its reps', () => {
    const lastSessionSets = [
      makeSet({ weightKg: 80, reps: 8 }),
      makeSet({ weightKg: 80, reps: 8 }),
      makeSet({ weightKg: 80, reps: 8 }),
    ];
    const suggestion = suggestProgression({ lastSessionSets, style: 'weight' });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.weightKg).toBe(82.5);
    expect(suggestion?.reps).toBe(8);
  });

  it('holds weight when the top sets were uneven', () => {
    const lastSessionSets = [
      makeSet({ weightKg: 80, reps: 8 }),
      makeSet({ weightKg: 80, reps: 6 }),
    ];
    const suggestion = suggestProgression({ lastSessionSets, style: 'weight' });
    expect(suggestion?.weightKg).toBe(80);
    expect(suggestion?.reason).toMatch(/repeat/i);
  });

  it('adds a rep under rep progression', () => {
    const lastSessionSets = [
      makeSet({ weightKg: 70, reps: 8 }),
      makeSet({ weightKg: 70, reps: 9 }),
    ];
    const suggestion = suggestProgression({ lastSessionSets, style: 'reps' });
    expect(suggestion?.weightKg).toBe(70);
    expect(suggestion?.reps).toBe(9);
  });

  it('adds load and resets reps once the rep window is topped out', () => {
    const lastSessionSets = [
      makeSet({ weightKg: 70, reps: 10 }),
      makeSet({ weightKg: 70, reps: 10 }),
    ];
    const suggestion = suggestProgression({
      lastSessionSets,
      style: 'double',
      repRangeLow: 6,
      repRangeHigh: 10,
    });
    expect(suggestion?.weightKg).toBe(72.5);
    expect(suggestion?.reps).toBe(6);
  });

  it('climbs reps while inside the window', () => {
    const lastSessionSets = [makeSet({ weightKg: 70, reps: 7 })];
    const suggestion = suggestProgression({
      lastSessionSets,
      style: 'double',
      repRangeLow: 6,
      repRangeHigh: 10,
    });
    expect(suggestion?.weightKg).toBe(70);
    expect(suggestion?.reps).toBe(8);
  });

  it('returns null for manual progression and for an empty history', () => {
    expect(
      suggestProgression({ lastSessionSets: [makeSet()], style: 'manual' }),
    ).toBeNull();
    expect(suggestProgression({ lastSessionSets: [], style: 'weight' })).toBeNull();
  });

  it('returns null when the history has no usable load', () => {
    const lastSessionSets = [makeSet({ weightKg: 0, reps: 10 })];
    expect(suggestProgression({ lastSessionSets, style: 'weight' })).toBeNull();
  });

  it('respects a custom increment', () => {
    const lastSessionSets = [
      makeSet({ weightKg: 100, reps: 5 }),
      makeSet({ weightKg: 100, reps: 5 }),
    ];
    const suggestion = suggestProgression({
      lastSessionSets,
      style: 'weight',
      increment: 5,
    });
    expect(suggestion?.weightKg).toBe(105);
  });
});
