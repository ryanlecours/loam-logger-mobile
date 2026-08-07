// In-memory SecureStore so the tests can assert what a refresh outcome did
// to the stored session without a device keychain.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
}));

import {
  refreshAccessToken,
  setTokenRefreshCallback,
} from './auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function mockFetchResponse(status: number, body: unknown = {}): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    mockStore.clear();
    mockStore.set(ACCESS_TOKEN_KEY, 'stale-access');
    mockStore.set(REFRESH_TOKEN_KEY, 'refresh-1');
    setTokenRefreshCallback(null);
  });

  it('returns invalid without a network call when no refresh token is stored', async () => {
    mockStore.clear();
    global.fetch = jest.fn();
    const result = await refreshAccessToken();
    expect(result).toEqual({ outcome: 'invalid' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stores the new access token and notifies on success', async () => {
    mockFetchResponse(200, { accessToken: 'fresh-access' });
    const onRefreshed = jest.fn();
    setTokenRefreshCallback(onRefreshed);

    const result = await refreshAccessToken();

    expect(result).toEqual({ outcome: 'refreshed', accessToken: 'fresh-access' });
    expect(mockStore.get(ACCESS_TOKEN_KEY)).toBe('fresh-access');
    expect(mockStore.get(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    expect(onRefreshed).toHaveBeenCalled();
  });

  it('clears the session when the server rejects the refresh token (401)', async () => {
    mockFetchResponse(401, { error: 'Invalid or expired refresh token' });

    const result = await refreshAccessToken();

    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockStore.has(ACCESS_TOKEN_KEY)).toBe(false);
    expect(mockStore.has(REFRESH_TOKEN_KEY)).toBe(false);
  });

  // The regression this file exists for: a rider 50 minutes into a recording
  // hits a token refresh while the API is mid-deploy (5xx) or the trail has
  // no signal (fetch throws). Neither is a verdict on the session, and
  // clearing SecureStore here is what used to log riders out mid-ride and
  // strand the recording.

  it('keeps the session on a server error (500)', async () => {
    mockFetchResponse(500, { error: 'Token refresh failed' });

    const result = await refreshAccessToken();

    expect(result).toEqual({ outcome: 'unavailable' });
    expect(mockStore.get(ACCESS_TOKEN_KEY)).toBe('stale-access');
    expect(mockStore.get(REFRESH_TOKEN_KEY)).toBe('refresh-1');
  });

  it('keeps the session on a rate limit (429)', async () => {
    mockFetchResponse(429, { error: 'Too many requests' });

    const result = await refreshAccessToken();

    expect(result).toEqual({ outcome: 'unavailable' });
    expect(mockStore.get(REFRESH_TOKEN_KEY)).toBe('refresh-1');
  });

  it('keeps the session when the network is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const result = await refreshAccessToken();

    expect(result).toEqual({ outcome: 'unavailable' });
    expect(mockStore.get(ACCESS_TOKEN_KEY)).toBe('stale-access');
    expect(mockStore.get(REFRESH_TOKEN_KEY)).toBe('refresh-1');
  });
});
