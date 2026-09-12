import {
  cmToFeetInches,
  feetInchesToCm,
  formatDuration,
  formatHeight,
  formatHoursMinutes,
  formatNumber,
  formatSignedPercent,
  formatTimer,
  formatWeight,
  fromKg,
  kgToLb,
  lbToKg,
  plateIncrement,
  roundToIncrement,
  toKg,
} from './units';

describe('weight conversion', () => {
  it('round-trips kg through lb without drift', () => {
    const original = 82.5;
    expect(lbToKg(kgToLb(original))).toBeCloseTo(original, 10);
  });

  it('uses the exact international pound', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462262, 5);
    expect(lbToKg(225)).toBeCloseTo(102.05828325, 5);
  });

  it('passes kg through unchanged when kg is preferred', () => {
    expect(fromKg(82.5, 'kg')).toBe(82.5);
    expect(toKg(82.5, 'kg')).toBe(82.5);
  });

  it('converts when lb is preferred', () => {
    expect(fromKg(100, 'lb')).toBeCloseTo(220.462262, 5);
    expect(toKg(220.462262, 'lb')).toBeCloseTo(100, 5);
  });

  it('handles zero', () => {
    expect(fromKg(0, 'lb')).toBe(0);
    expect(toKg(0, 'lb')).toBe(0);
  });
});

describe('height conversion', () => {
  it('converts 175 cm to 5 feet 9 inches', () => {
    expect(cmToFeetInches(175)).toEqual({ feet: 5, inches: 9 });
  });

  it('round-trips within rounding tolerance', () => {
    expect(feetInchesToCm({ feet: 5, inches: 9 })).toBeCloseTo(175.26, 2);
  });

  it('rolls 12 inches into the next foot', () => {
    // 182.9cm is 71.99in, which must render as 6'0" not 5'12".
    expect(cmToFeetInches(182.9)).toEqual({ feet: 6, inches: 0 });
  });
});

describe('roundToIncrement', () => {
  it('snaps to the nearest loadable plate jump', () => {
    expect(roundToIncrement(82.3333, 2.5)).toBe(82.5);
    expect(roundToIncrement(80.1, 2.5)).toBe(80);
    // 81.2 sits nearer 80 (1.2 away) than 82.5 (1.3 away).
    expect(roundToIncrement(81.2, 2.5)).toBe(80);
    expect(roundToIncrement(81.5, 2.5)).toBe(82.5);
  });

  it('returns 0 rather than NaN for bad input', () => {
    expect(roundToIncrement(Number.NaN, 2.5)).toBe(0);
    expect(roundToIncrement(80, 0)).toBe(0);
    expect(roundToIncrement(80, -5)).toBe(0);
  });

  it('exposes unit-appropriate default increments', () => {
    expect(plateIncrement('kg')).toBe(2.5);
    expect(plateIncrement('lb')).toBe(5);
  });
});

describe('formatNumber', () => {
  it('drops trailing zeros after the decimal point', () => {
    expect(formatNumber(80.0)).toBe('80');
    expect(formatNumber(82.5)).toBe('82.5');
  });

  it('never strips significant trailing zeros from a whole number', () => {
    // Regression: 160 rendered as "16" and 2400 as "24".
    expect(formatNumber(160, 0)).toBe('160');
    expect(formatNumber(2400, 0)).toBe('2400');
    expect(formatNumber(100, 0)).toBe('100');
    expect(formatNumber(70, 0)).toBe('70');
    expect(formatNumber(280.0, 1)).toBe('280');
    expect(formatNumber(0, 0)).toBe('0');
  });

  it('renders an em dash for non-finite values', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatWeight / formatHeight', () => {
  it('formats in the preferred unit', () => {
    expect(formatWeight(82.5, 'kg')).toBe('82.5 kg');
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
  });

  it('renders an em dash for missing values instead of NaN', () => {
    expect(formatWeight(null, 'kg')).toBe('—');
    expect(formatHeight(null, 'cm')).toBe('—');
  });

  it('formats height in both systems', () => {
    expect(formatHeight(175, 'cm')).toBe('175 cm');
    expect(formatHeight(175, 'ft')).toBe("5'9\"");
  });
});

describe('duration formatting', () => {
  it('scales the unit with magnitude', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(58 * 60)).toBe('58 min');
    expect(formatDuration(72 * 60)).toBe('1h 12m');
    expect(formatDuration(120 * 60)).toBe('2h');
  });

  it('guards against negative and missing input', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(-10)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });

  it('formats sleep-style hours and minutes', () => {
    expect(formatHoursMinutes(7 * 3600 + 42 * 60)).toBe('7h 42m');
    expect(formatHoursMinutes(8 * 3600)).toBe('8h 00m');
  });

  it('formats a running timer', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(90)).toBe('01:30');
    expect(formatTimer(3725)).toBe('1:02:05');
    expect(formatTimer(-5)).toBe('00:00');
  });
});

describe('formatSignedPercent', () => {
  it('prefixes positive values with a plus', () => {
    expect(formatSignedPercent(19.6)).toBe('+19.6%');
  });

  it('keeps the minus on negative values', () => {
    expect(formatSignedPercent(-3.2)).toBe('-3.2%');
  });

  it('renders an em dash when undefined', () => {
    expect(formatSignedPercent(null)).toBe('—');
    expect(formatSignedPercent(Number.NaN)).toBe('—');
  });
});
