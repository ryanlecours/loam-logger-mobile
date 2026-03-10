import { getAccessToken } from '../lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export type BackfillStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface BackfillRequest {
  id: string;
  provider: string;
  year: string;
  status: BackfillStatus;
  ridesFound: number | null;
  backfilledUpTo: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StravaBackfillResult {
  success: boolean;
  message: string;
  totalActivities: number;
  cyclingActivities: number;
  imported: number;
  skipped: number;
  geocoded: number;
  unmappedGears: { gearId: string; rideCount: number }[];
}

export interface GarminBackfillResult {
  success: boolean;
  message: string;
  queued: { year: string; status: string; jobId: string }[];
  skipped?: string[];
}

export interface DataSourcePreference {
  success: boolean;
  activeDataSource: string | null;
  message?: string;
}

async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Fetch backfill history, optionally filtered by provider.
 */
export async function getBackfillHistory(
  provider?: string
): Promise<BackfillRequest[]> {
  const params = provider ? `?provider=${provider}` : '';
  const response = await authenticatedFetch(`/api/backfill/history${params}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Failed to fetch backfill history');
  }

  const data = await response.json();
  return data.requests || [];
}

/**
 * Trigger a Strava backfill for a given year (synchronous — waits for import).
 */
export async function triggerStravaBackfill(
  year: string
): Promise<StravaBackfillResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await authenticatedFetch(
      `/api/strava/backfill/fetch?year=${encodeURIComponent(year)}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || body.message || 'Failed to import Strava rides');
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Trigger a Garmin backfill for the given year (async — rides arrive via webhooks).
 */
export async function triggerGarminBackfill(
  year: string
): Promise<GarminBackfillResult> {
  const response = await authenticatedFetch('/api/garmin/backfill/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ years: [year] }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Failed to queue Garmin import');
  }

  return await response.json();
}

/**
 * Get the user's active data source preference.
 */
export async function getDataSourcePreference(): Promise<DataSourcePreference> {
  const response = await authenticatedFetch('/api/data-source/preference');

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Failed to fetch data source preference');
  }

  return await response.json();
}

/**
 * Set the user's active data source preference.
 */
export async function setDataSourcePreference(
  provider: string
): Promise<DataSourcePreference> {
  const response = await authenticatedFetch('/api/data-source/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Failed to set data source preference');
  }

  return await response.json();
}
