/**
 * Garmin attribution strings and formatters — MIRROR.
 *
 * This is a hand-mirrored copy of
 * `loam-logger/libs/shared/src/garmin/attribution.ts`. loam-logger-mobile is a
 * separate repo with no dependency on @loam/shared (no workspace link, no
 * published package), so the strings cannot be imported. Any change to the web
 * copy MUST be mirrored here in the same session — Garmin reviews the whole
 * product, and web/mobile drifting apart means one of the two apps is shipping
 * noncompliant attribution.
 *
 * Source of truth for the rules themselves: Garmin Developer API Brand
 * Guidelines v6.30.2025 —
 * https://developer.garmin.com/downloads/brand/Garmin-Developer-API-Brand-Guidelines.pdf
 *
 * See the web copy for the full explanation of the four attribution contexts
 * (primary displays, secondary screens, combined/derived data, downstream).
 *
 * PARITY OVER TREE-SHAKING. Two exports below have no mobile call site today:
 * GARMIN_CHART_ATTRIBUTION (mobile renders no charts) and hasGarminData (the
 * screens test ride.garminActivityId inline). They are kept so this file stays
 * a byte-comparable mirror of the web original, which is the only mechanism
 * stopping the two apps from drifting apart on wording Garmin reviews us
 * against. Delete them here only if they also go on web.
 */

/**
 * Full Garmin Connect app name. The guidelines forbid abbreviating, truncating
 * or stylizing it. Use where the *connection or app* is named; use
 * formatGarminSource() for data-source attribution.
 */
export const GARMIN_CONNECT_APP_NAME = 'Garmin Connect™';

/** Verbatim sanctioned phrasing for charts built from Garmin data. */
export const GARMIN_CHART_ATTRIBUTION =
  'This chart was created using data provided by Garmin devices.';

/**
 * Verbatim sanctioned phrasing for insights, predictions and anything routed
 * through analytics or AI — covers component wear, service predictions and the
 * generated maintenance summary.
 */
export const GARMIN_INSIGHT_ATTRIBUTION =
  'Insights derived in part from Garmin device-sourced data.';

/** Garmin's standard trademark notice, for downstream/shared surfaces. */
export const GARMIN_TRADEMARK_NOTICE =
  'Garmin® and the Garmin logo are trademarks of Garmin Ltd. or its subsidiaries, ' +
  'registered in the USA and other countries. Garmin Connect™ is a trademark of ' +
  'Garmin Ltd. or its subsidiaries.';

/** Sanctioned fallback when the device model is unknown. */
export const GARMIN_SOURCE_FALLBACK = 'Garmin';

/**
 * Placeholder device values Garmin sends when there is no real model (e.g.
 * deviceName "unknown" on manually-edited activities). Treat as "no device" so
 * we fall back to plain "Garmin" instead of rendering "Garmin Unknown".
 */
const GARMIN_DEVICE_SENTINELS = new Set([
  'unknown',
  'unknown_device',
  'undefined',
  'null',
  'none',
]);

/** A real model, or undefined for non-strings, blanks, and the sentinels above. */
export function normalizeGarminDeviceName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || GARMIN_DEVICE_SENTINELS.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

/**
 * Normalize a raw Garmin `deviceName` for display. Separators and casing only —
 * no curated model table, and no heuristic splitting of digit-bearing tokens
 * (inventing a model name Garmin does not use is a misrepresentation).
 */
export function humanizeGarminDevice(raw: string): string {
  return raw
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      /[A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

/**
 * "Garmin Edge 840", or plain "Garmin" when the device is unknown — the
 * fallback the guidelines explicitly permit. Safe to call with
 * ride.garminDeviceName directly.
 */
export function formatGarminSource(deviceName?: string | null): string {
  const device = normalizeGarminDeviceName(deviceName);
  if (!device) return GARMIN_SOURCE_FALLBACK;

  const humanized = humanizeGarminDevice(device);
  if (!humanized) return GARMIN_SOURCE_FALLBACK;

  if (/^garmin\b/i.test(humanized)) return humanized;

  return `${GARMIN_SOURCE_FALLBACK} ${humanized}`;
}

/**
 * Whether a device-model string names a Garmin device. Used to recognize a ride
 * recorded on a Garmin unit that reached us via Strava (Strava reports it as
 * e.g. "Garmin Edge 840"). Only meaningful for a foreign device string such as
 * Strava's device_name — not garminDeviceName, which uses unprefixed tokens.
 */
export function isGarminDevice(deviceName?: string | null): boolean {
  const device = normalizeGarminDeviceName(deviceName);
  return device !== undefined && /^garmin\b/i.test(device);
}

/**
 * The device model to attribute to Garmin for this ride, or undefined when it
 * carries no Garmin device-sourced data. Native Garmin ride: Garmin's model.
 * Strava ride recorded on Garmin: the model Strava reported. Feed into
 * formatGarminSource().
 */
export function garminSourceDevice(ride: {
  garminActivityId?: string | null;
  garminDeviceName?: string | null;
  stravaDeviceName?: string | null;
}): string | undefined {
  if (ride.garminActivityId) return ride.garminDeviceName ?? undefined;
  if (isGarminDevice(ride.stravaDeviceName)) return ride.stravaDeviceName ?? undefined;
  return undefined;
}

/**
 * Whether a ride carries Garmin device-sourced data and so requires attribution.
 * True when it came from Garmin directly (garminActivityId) OR was recorded on a
 * Garmin device but imported via Strava (Strava's device_name begins with
 * "Garmin"). Must stay false for non-Garmin rides: the guidelines forbid Garmin
 * branding where Garmin data is not present.
 */
export function hasGarminData(ride: {
  garminActivityId?: string | null;
  stravaDeviceName?: string | null;
}): boolean {
  return Boolean(ride.garminActivityId) || isGarminDevice(ride.stravaDeviceName);
}
