/**
 * Money helpers, mirrored from `libs/shared/src/currency.ts` in the web
 * monorepo (this app has no dependency on `@loam/shared`). Keep the two in
 * step: the API validates against the same list and the same minor-unit rule.
 *
 * Amounts are integer minor units (cents) beside an ISO 4217 code. Sums never
 * cross currencies; a converted figure would be invented precision.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'CAD',
  'EUR',
  'GBP',
  'AUD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'JPY',
  'ZAR',
  'MXN',
  'BRL',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** What the app assumes until the rider picks a currency in Settings. */
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set(['JPY']);

export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return typeof code === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/** 2 for most currencies, 0 for JPY. */
export function currencyMinorDigits(code: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
}

/**
 * What the rider typed ("12.34", "12,34", "1 200,50", 12.34) to integer minor
 * units; null when it is not a plain amount. Strict on purpose: a mistyped
 * amount must fail, never quietly become a different valid one. The LAST
 * separator is the decimal one; earlier separators and spaces are thousands
 * groups of exactly three digits. A lone "1,200" or "1.005" is rejected
 * rather than guessed at, since the two readings differ a thousandfold.
 */
export function majorToMinor(value: string | number, code: string): number | null {
  const digits = currencyMinorDigits(code);
  const raw = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : value.trim();
  if (!/^[0-9][0-9 .,]*$/.test(raw)) return null;

  const sepIndex = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  const wholePart = sepIndex >= 0 ? raw.slice(0, sepIndex) : raw;
  const fraction = sepIndex >= 0 ? raw.slice(sepIndex + 1) : '';
  if (sepIndex >= 0 && fraction === '') return null;

  const groups = wholePart.split(/[ .,]/);
  if (groups.some((g, i) => !/^[0-9]+$/.test(g) || (i > 0 && g.length !== 3))) return null;
  const whole = groups.join('');
  if (fraction !== '' && (!/^[0-9]+$/.test(fraction) || fraction.length > digits)) return null;

  const minor = Number(whole) * 10 ** digits + (fraction === '' ? 0 : Number(fraction.padEnd(digits, '0')));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Integer minor units to the major-unit number the rider reads. */
export function minorToMajor(minor: number, code: string): number {
  return minor / 10 ** currencyMinorDigits(code);
}

/** Upper bound on one recorded amount, in minor units (1,000,000 units). */
export const MAX_AMOUNT_MINOR = 100_000_000;

/**
 * "$85.00", "€1,200.50", "¥1,200". Falls back to "85.00 USD" where Intl lacks
 * the currency, so a number is never shown without its unit.
 */
export function formatMoney(minor: number, code: string): string {
  const major = minorToMajor(minor, code);
  const digits = currencyMinorDigits(code);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    return `${major.toFixed(digits)} ${code}`;
  }
}

/** "$2.10 / h" for a per-hour rate; null when the rate is not known. */
export function formatPerHour(perHourMinor: number | null | undefined, code: string): string | null {
  if (perHourMinor == null) return null;
  return `${formatMoney(Math.round(perHourMinor), code)} / h`;
}

/** The major-unit text to seed an input with from a stored minor amount. */
export function minorToInput(minor: number | null | undefined, code: string): string {
  if (minor == null) return '';
  return minorToMajor(minor, code).toFixed(currencyMinorDigits(code));
}
