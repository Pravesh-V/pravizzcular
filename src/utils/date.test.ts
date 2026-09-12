import {
  addDays,
  addMonths,
  dayPart,
  daysBetween,
  eachDay,
  endOfMonth,
  formatLongDate,
  formatTime,
  isSameMonth,
  isValidLocalDate,
  parseLocalDate,
  startOfMonth,
  startOfWeek,
  toLocalDate,
  toLocalTime,
  weekdayOf,
} from './date';

describe('toLocalDate', () => {
  it('keeps a late-evening log on the same local day east of UTC', () => {
    // 2026-09-15 23:30 in Kolkata is 18:00 UTC on the same date.
    const instant = new Date('2026-09-15T18:00:00.000Z');
    expect(toLocalDate(instant, 'Asia/Kolkata')).toBe('2026-09-15');
  });

  it('rolls a post-midnight local time into the next day', () => {
    // 2026-09-15 20:00 UTC is 2026-09-16 01:30 in Kolkata.
    const instant = new Date('2026-09-15T20:00:00.000Z');
    expect(toLocalDate(instant, 'Asia/Kolkata')).toBe('2026-09-16');
  });

  it('keeps an early-morning log on the previous local day west of UTC', () => {
    // 2026-09-16 02:00 UTC is 2026-09-15 19:00 in New York.
    const instant = new Date('2026-09-16T02:00:00.000Z');
    expect(toLocalDate(instant, 'America/New_York')).toBe('2026-09-15');
  });

  it('agrees with UTC when the timezone is UTC', () => {
    expect(toLocalDate(new Date('2026-09-15T23:59:59.000Z'), 'UTC')).toBe('2026-09-15');
  });
});

describe('toLocalTime', () => {
  it('renders 24-hour wall clock in the target zone', () => {
    expect(toLocalTime(new Date('2026-09-15T12:30:00.000Z'), 'Asia/Kolkata')).toBe('18:00');
  });

  it('renders midnight as 00:00 rather than 24:00', () => {
    expect(toLocalTime(new Date('2026-09-15T18:30:00.000Z'), 'Asia/Kolkata')).toBe('00:00');
  });
});

describe('isValidLocalDate', () => {
  it.each(['2026-09-15', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isValidLocalDate(value)).toBe(true);
  });

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '26-09-15', 'not-a-date', ''])(
    'rejects %s',
    (value) => {
      expect(isValidLocalDate(value)).toBe(false);
    },
  );
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('subtracts', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('is a no-op for zero', () => {
    expect(addDays('2026-09-15', 0)).toBe('2026-09-15');
  });

  it('stays stable across a DST transition in the anchor zone', () => {
    // US DST ends 2026-11-01; day arithmetic must not lose or gain a day.
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });
});

describe('addMonths', () => {
  it('clamps to the last valid day of the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('moves backward across a year boundary', () => {
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('daysBetween', () => {
  it('counts forward', () => {
    expect(daysBetween('2026-09-01', '2026-09-15')).toBe(14);
  });

  it('returns negative when inverted', () => {
    expect(daysBetween('2026-09-15', '2026-09-01')).toBe(-14);
  });

  it('returns zero for the same day', () => {
    expect(daysBetween('2026-09-15', '2026-09-15')).toBe(0);
  });

  it('spans a leap year correctly', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });
});

describe('weekdayOf', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(weekdayOf('2026-09-14')).toBe(1); // Monday
    expect(weekdayOf('2026-09-20')).toBe(7); // Sunday
  });
});

describe('month and week boundaries', () => {
  it('finds the start and end of a month', () => {
    expect(startOfMonth('2026-09-15')).toBe('2026-09-01');
    expect(endOfMonth('2026-09-15')).toBe('2026-09-30');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
  });

  it('finds the start of a Monday-first week', () => {
    expect(startOfWeek('2026-09-17', 1)).toBe('2026-09-14');
  });

  it('finds the start of a Sunday-first week', () => {
    expect(startOfWeek('2026-09-17', 7)).toBe('2026-09-13');
  });

  it('detects same-month membership', () => {
    expect(isSameMonth('2026-09-01', '2026-09-30')).toBe(true);
    expect(isSameMonth('2026-09-30', '2026-10-01')).toBe(false);
  });
});

describe('eachDay', () => {
  it('is inclusive of both ends', () => {
    expect(eachDay('2026-09-01', '2026-09-03')).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('returns a single day when the range collapses', () => {
    expect(eachDay('2026-09-01', '2026-09-01')).toEqual(['2026-09-01']);
  });

  it('returns empty when the range inverts', () => {
    expect(eachDay('2026-09-03', '2026-09-01')).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats a long date', () => {
    expect(formatLongDate('2026-09-15')).toBe('Tuesday, September 15');
  });

  it('formats 24-hour time', () => {
    expect(formatTime('18:00', '24h')).toBe('18:00');
    expect(formatTime('08:05', '24h')).toBe('08:05');
  });

  it('formats 12-hour time including both midnight and noon', () => {
    expect(formatTime('18:00', '12h')).toBe('6:00 PM');
    expect(formatTime('00:30', '12h')).toBe('12:30 AM');
    expect(formatTime('12:00', '12h')).toBe('12:00 PM');
  });
});

describe('parseLocalDate', () => {
  it('throws on malformed input rather than returning NaN parts', () => {
    expect(() => parseLocalDate('nope')).toThrow();
  });
});

describe('dayPart', () => {
  it('selects the greeting window from local time', () => {
    const zone = 'Asia/Kolkata';
    expect(dayPart(new Date('2026-09-15T03:00:00.000Z'), zone)).toBe('morning'); // 08:30
    expect(dayPart(new Date('2026-09-15T08:30:00.000Z'), zone)).toBe('afternoon'); // 14:00
    expect(dayPart(new Date('2026-09-15T14:00:00.000Z'), zone)).toBe('evening'); // 19:30
  });
});
