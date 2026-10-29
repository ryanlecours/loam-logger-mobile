import { GARMIN_CONNECT_APP_NAME } from '../constants/garminAttribution';

/**
 * Where a bike's hours come from, decided from the `me.rideSource` field.
 *
 * The first-run card used to offer "Connect a data source" to every rider with
 * a bike and no rides, including riders who had already connected one and were
 * waiting on the import. This pure function turns the three facts the API
 * reports (connected providers, the newest automatic import, the account's
 * ride count) plus the rider's own "I don't use a tracker" choice into one
 * state the card renders from. Mirrors apps/web/src/utils/rideSourceState.ts
 * so both dashboards tell the same story.
 */

export type AutoImportStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AutoImportData {
  provider: string;
  status: AutoImportStatus;
  ridesFound?: number | null;
  lookbackDays: number;
  startedAt: string;
  completedAt?: string | null;
}

export interface RideSourceData {
  connectedProviders: string[];
  rideCount: number;
  autoImport?: AutoImportData | null;
}

export interface RideSourceInput extends RideSourceData {
  /** The rider has said they do not use a ride tracker (stored on this device). */
  manualOnly: boolean;
}

export type RideSourceState =
  /** Rides exist, from any source. The card has nothing to say. */
  | { kind: 'has-rides' }
  /** Nothing connected and nothing ridden: ask for a ride source. */
  | { kind: 'none' }
  /** Nothing connected, nothing ridden, and the rider has said they track by hand. */
  | { kind: 'manual' }
  /** Connected, and the import queued at connect time is still pending or running. */
  | { kind: 'importing'; provider: string; ridesFound: number | null; startedAt: string }
  /** Connected, the import finished (or never ran), and still no rides. */
  | { kind: 'empty'; provider: string; lookbackDays: number | null }
  /** Connected, and the import failed before anything landed. */
  | { kind: 'failed'; provider: string };

export function resolveRideSourceState({
  connectedProviders,
  rideCount,
  autoImport,
  manualOnly,
}: RideSourceInput): RideSourceState {
  if (rideCount > 0) return { kind: 'has-rides' };

  if (connectedProviders.length === 0) {
    return manualOnly ? { kind: 'manual' } : { kind: 'none' };
  }

  const provider = autoImport?.provider ?? connectedProviders[0];

  if (autoImport && (autoImport.status === 'PENDING' || autoImport.status === 'RUNNING')) {
    return {
      kind: 'importing',
      provider,
      ridesFound: autoImport.ridesFound ?? null,
      startedAt: autoImport.startedAt,
    };
  }

  if (autoImport?.status === 'FAILED') {
    return { kind: 'failed', provider };
  }

  return { kind: 'empty', provider, lookbackDays: autoImport?.lookbackDays ?? null };
}

/** Whether the state will change on its own, which is when the screen polls. */
export function isRideSourceSettling(state: RideSourceState | null): boolean {
  return state?.kind === 'importing';
}

const PROVIDER_LABELS: Record<string, string> = {
  strava: 'Strava',
  // Full app name, per the Garmin API Brand Guidelines' rule against
  // abbreviating it when naming a connection.
  garmin: GARMIN_CONNECT_APP_NAME,
  whoop: 'WHOOP',
  suunto: 'Suunto',
};

export function rideProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** "the last year", "the last 30 days"; null when the window is unknown. */
export function describeLookback(lookbackDays: number | null): string | null {
  if (lookbackDays === null) return null;
  if (lookbackDays >= 365) return 'the last year';
  return `the last ${lookbackDays} days`;
}

/** "just now", "4 minutes ago", "2 hours ago": how long an import has run. */
export function describeSince(startedAt: string, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 60_000) return 'just now';
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * SecureStore key for the rider's "I don't use a ride tracker" choice. Keyed
 * by account so two riders sharing a phone do not share the answer. SecureStore
 * keys allow letters, digits, ".", "-" and "_", which a uuid satisfies.
 */
export function manualRideSourceKey(userId: string): string {
  return `ride_source_manual_${userId}`;
}
