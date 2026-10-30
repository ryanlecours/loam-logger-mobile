import { formatMoney, formatPerHour, isSupportedCurrency, majorToMinor, minorToInput, minorToMajor } from './money';

describe('majorToMinor', () => {
  it('reads plain amounts with a dot or a comma decimal separator', () => {
    expect(majorToMinor('12.34', 'USD')).toBe(1234);
    expect(majorToMinor('12,34', 'EUR')).toBe(1234);
    expect(majorToMinor('12', 'USD')).toBe(1200);
    expect(majorToMinor('12.5', 'USD')).toBe(1250);
    expect(majorToMinor(' 85 ', 'USD')).toBe(8500);
    expect(majorToMinor(12.34, 'USD')).toBe(1234);
  });

  it('reads thousands groups only when a later separator makes them unambiguous', () => {
    expect(majorToMinor('1 200', 'EUR')).toBe(120000);
    expect(majorToMinor('1,200.50', 'USD')).toBe(120050);
    expect(majorToMinor('1.200,50', 'EUR')).toBe(120050);
  });

  it('respects zero-decimal currencies', () => {
    expect(majorToMinor('1200', 'JPY')).toBe(1200);
    expect(majorToMinor('12.5', 'JPY')).toBeNull();
  });

  it('rejects anything that is not a plain amount instead of guessing', () => {
    for (const bad of ['1e3', '-5', '+5', '1,200', '1.005', '12.345', 'abc', '', '12.', '$12', '12,34.5']) {
      expect(majorToMinor(bad, 'USD')).toBeNull();
    }
  });
});

describe('formatting', () => {
  it('round-trips minor units and seeds inputs', () => {
    expect(minorToMajor(1234, 'USD')).toBe(12.34);
    expect(minorToInput(1234, 'USD')).toBe('12.34');
    expect(minorToInput(1200, 'JPY')).toBe('1200');
    expect(minorToInput(null, 'USD')).toBe('');
  });

  it('always shows the unit with the number', () => {
    expect(formatMoney(8500, 'USD')).toMatch(/85/);
    expect(formatMoney(8500, 'USD')).toMatch(/\$|USD/);
    expect(formatPerHour(210, 'USD')).toMatch(/2\.10.*\/ h$/);
    expect(formatPerHour(null, 'USD')).toBeNull();
  });

  it('knows the supported codes', () => {
    expect(isSupportedCurrency('CAD')).toBe(true);
    expect(isSupportedCurrency('cad')).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
  });
});
