import { ComponentShareScope } from '../graphql/generated';
import {
  earliestShareDay,
  fmtDay,
  isRangeValid,
  rangeEndIso,
  rangeLabel,
  rangeStartIso,
  shareScopeLabel,
} from './componentShare';

// Local dates, so these hold in any test-runner time zone.
const day = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

describe('range bounds', () => {
  it('starts at local midnight of the first day', () => {
    expect(rangeStartIso(day(2026, 3, 5, 15))).toBe(day(2026, 3, 5).toISOString());
  });

  // The API stores [start, end), so the picked last day has to count.
  it('ends at local midnight after the last day', () => {
    expect(rangeEndIso(day(2026, 3, 31, 9))).toBe(day(2026, 4, 1).toISOString());
  });
});

describe('isRangeValid', () => {
  const earliest = day(2026, 1, 10, 14);
  const today = day(2026, 6, 1, 8);

  it('accepts a range inside the part’s life, including a single day', () => {
    expect(isRangeValid(day(2026, 2, 1), day(2026, 3, 1), earliest, today)).toBe(true);
    expect(isRangeValid(day(2026, 2, 1), day(2026, 2, 1), earliest, today)).toBe(true);
  });

  // Compared by day: the install day itself is allowed whatever its time.
  it('allows the install day and today', () => {
    expect(isRangeValid(day(2026, 1, 10), day(2026, 6, 1, 23), earliest, today)).toBe(true);
  });

  it('rejects a reversed range, one before install, and one past today', () => {
    expect(isRangeValid(day(2026, 3, 2), day(2026, 3, 1), earliest, today)).toBe(false);
    expect(isRangeValid(day(2026, 1, 9), day(2026, 3, 1), earliest, today)).toBe(false);
    expect(isRangeValid(day(2026, 2, 1), day(2026, 6, 2), earliest, today)).toBe(false);
  });
});

describe('earliestShareDay', () => {
  it('takes the earliest tenure, whatever order they arrive in', () => {
    const earliest = earliestShareDay(
      [{ installedAt: '2026-05-01T00:00:00Z' }, { installedAt: '2026-02-01T00:00:00Z' }],
      '2026-04-01T00:00:00Z'
    );
    expect(earliest.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('falls back to the install date, then today', () => {
    expect(earliestShareDay([], '2026-04-01T00:00:00Z').toISOString()).toBe(
      '2026-04-01T00:00:00.000Z'
    );
    const now = day(2026, 6, 1);
    expect(earliestShareDay([], null, now)).toBe(now);
  });
});

describe('shareScopeLabel', () => {
  it('names the live scopes', () => {
    expect(shareScopeLabel({ scope: ComponentShareScope.Lifetime })).toBe('Lifetime');
    expect(shareScopeLabel({ scope: ComponentShareScope.SinceService })).toBe(
      'Since last service'
    );
  });

  it('shows a range by its last included day, not the exclusive end', () => {
    const start = day(2026, 3, 1).toISOString();
    const end = day(2026, 4, 1).toISOString();
    expect(shareScopeLabel({ scope: ComponentShareScope.Range, rangeStart: start, rangeEnd: end }))
      .toBe(`${fmtDay(start)} – ${fmtDay(day(2026, 3, 31))}`);
    expect(rangeLabel(start, end)).toContain(fmtDay(day(2026, 3, 31)));
  });

  it('falls back when a range has no dates', () => {
    expect(shareScopeLabel({ scope: ComponentShareScope.Range })).toBe('Date range');
  });
});
