import { getAccessToken } from '../lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export type IntegrationProvider = 'garmin' | 'strava';

export interface IntegrationStatus {
  connected: boolean;
  connectedAt?: string;
  revokedAt?: string | null;
  lastSyncAt?: string | null;
  scopes?: string | null;
}

/**
 * Initiate OAuth flow for a provider. Returns the authorize URL
 * to open in the browser.
 */
export async function startOAuth(
  provider: IntegrationProvider
): Promise<{ authorizeUrl: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/auth/${provider}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start OAuth' }));
    throw new Error(error.message || `Failed to start ${provider} OAuth`);
  }

  const data = await response.json();
  return { authorizeUrl: data.data?.authorizeUrl || data.authorizeUrl };
}

/**
 * Get the connection status for a provider.
 */
export async function getIntegrationStatus(
  provider: IntegrationProvider
): Promise<IntegrationStatus> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/auth/${provider}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get status' }));
    throw new Error(error.message || `Failed to get ${provider} status`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Disconnect a provider integration.
 */
export async function disconnectIntegration(
  provider: IntegrationProvider
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/auth/${provider}/disconnect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to disconnect' }));
    throw new Error(error.message || `Failed to disconnect ${provider}`);
  }
}
