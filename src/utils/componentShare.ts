import { ComponentShareScope } from '../graphql/generated';

// Helpers for component share links: turning picked days into the window the
// API stores, and describing a window in words. Mirrors the web's
// lib/componentShare.ts.

export interface ShareWindow {
  scope: ComponentShareScope;
  rangeStart?: string | null;
  rangeEnd?: string | null;
}

export const SHARE_SCOPES: Array<{ scope: ComponentShareScope; label: string }> = [
  { scope: ComponentShareScope.Lifetime, label: 'Lifetime' },
  { scope: ComponentShareScope.SinceService, label: 'Since last service' },
  { scope: ComponentShareScope.Range, label: 'Date range' },
];

/** Local midnight at the start of the day `date` falls on. */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The ISO start of a range beginning on `day`. */
export function rangeStartIso(day: Date): string {
  return startOfLocalDay(day).toISOString();
}

/**
 * The ISO end of a range whose last day is `day`. The API stores a range as
 * [start, end), so this is local midnight at the start of the day after.
 */
export function rangeEndIso(day: Date): string {
  const d = startOfLocalDay(day);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/**
 * Whether a picked range is one the API accepts: the start on or before the
 * end, no earlier than the component's first install, no later than today.
 * Compared by local day, which is how the rider picked them.
 */
export function isRangeValid(from: Date, to: Date, earliest: Date, today: Date): boolean {
  const f = startOfLocalDay(from).getTime();
  const t = startOfLocalDay(to).getTime();
  return f <= t && f >= startOfLocalDay(earliest).getTime() && t <= startOfLocalDay(today).getTime();
}

/**
 * The earliest day a range may start: the component's first install. Tenures
 * are not guaranteed to arrive sorted, so take the minimum. No tenure and no
 * install date means there is no history to share, so today.
 */
export function earliestShareDay(
  tenures: ReadonlyArray<{ installedAt: string }>,
  componentInstalledAt: string | null | undefined,
  now: Date = new Date()
): Date {
  const times = tenures.map((t) => new Date(t.installedAt).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length > 0) return new Date(Math.min(...times));
  if (componentInstalledAt) {
    const d = new Date(componentInstalledAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return now;
}

export function fmtDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Jan 1, 2026 – Jan 31, 2026" for a stored [start, end) range. */
export function rangeLabel(startIso: string, endIso: string): string {
  // The end is exclusive, so the last day shown is the one before it.
  const lastDay = new Date(new Date(endIso).getTime() - 1);
  return `${fmtDay(startIso)} – ${fmtDay(lastDay)}`;
}

/** A short name for what a link shows, for lists and labels. */
export function shareScopeLabel(share: ShareWindow): string {
  switch (share.scope) {
    case ComponentShareScope.Lifetime:
      return 'Lifetime';
    case ComponentShareScope.SinceService:
      return 'Since last service';
    case ComponentShareScope.Range:
      return share.rangeStart && share.rangeEnd
        ? rangeLabel(share.rangeStart, share.rangeEnd)
        : 'Date range';
  }
}
