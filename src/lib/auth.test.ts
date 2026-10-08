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
  completeProviderLink,
  loginWithApple,
  loginWithGoogle,
  logout,
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

  it('clears the session when the server forbids the refresh token (403)', async () => {
    mockFetchResponse(403, { error: 'Forbidden' });

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

describe('logout', () => {
  beforeEach(() => {
    mockStore.clear();
    mockStore.set(ACCESS_TOKEN_KEY, 'access-1');
    mockStore.set(REFRESH_TOKEN_KEY, 'refresh-1');
  });

  it('revokes the server-side session, then clears local tokens', async () => {
    mockFetchResponse(200, { ok: true });

    await logout();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/mobile/logout'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-1' }),
      }),
    );
    expect(mockStore.has(ACCESS_TOKEN_KEY)).toBe(false);
    expect(mockStore.has(REFRESH_TOKEN_KEY)).toBe(false);
  });

  it('still clears local tokens when the revocation call cannot reach the server', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await logout();

    expect(mockStore.has(ACCESS_TOKEN_KEY)).toBe(false);
    expect(mockStore.has(REFRESH_TOKEN_KEY)).toBe(false);
  });

  it('skips the network call entirely when no refresh token is stored', async () => {
    mockStore.clear();
    global.fetch = jest.fn();

    await logout();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('a Google or Apple sign-in held for the account password', () => {
  const held = {
    error: 'This email already has a Loam Logger account with a password.',
    code: 'LINK_NEEDS_PASSWORD',
    details: { linkToken: 'link-t', email: 'rider@example.com', provider: 'google' },
  };

  beforeEach(() => {
    mockStore.clear();
  });

  it('turns the 409 from Google sign-in into a pending link', async () => {
    mockFetchResponse(409, held);

    const result = await loginWithGoogle('id-token');

    expect(result).toMatchObject({
      success: false,
      errorCode: 'LINK_NEEDS_PASSWORD',
      providerLink: { linkToken: 'link-t', email: 'rider@example.com', provider: 'google' },
    });
    expect(mockStore.size).toBe(0);
  });

  it('does the same for Apple sign-in', async () => {
    mockFetchResponse(409, { ...held, details: { ...held.details, provider: 'apple' } });

    const result = await loginWithApple('identity-token');

    expect(result.providerLink).toMatchObject({ provider: 'apple' });
  });

  it('leaves other sign-in failures as they were', async () => {
    mockFetchResponse(401, { error: 'Invalid Google token', code: 'UNAUTHORIZED' });

    const result = await loginWithGoogle('id-token');

    expect(result).toMatchObject({ success: false, errorCode: 'INVALID_CREDENTIALS', error: 'Invalid Google token' });
    expect(result.providerLink).toBeUndefined();
  });

  it('stores the session once the password links the account', async () => {
    mockFetchResponse(200, {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'u1', email: 'rider@example.com', name: null, avatarUrl: null },
    });

    const result = await completeProviderLink('link-t', 'right');

    expect(result).toEqual({ success: true });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/auth\/mobile\/link-provider$/);
    expect(JSON.parse(init.body)).toEqual({ linkToken: 'link-t', password: 'right' });
    expect(mockStore.get(ACCESS_TOKEN_KEY)).toBe('access-1');
  });

  it('reports a wrong password without storing anything', async () => {
    mockFetchResponse(401, { error: 'Incorrect password', code: 'UNAUTHORIZED' });

    const result = await completeProviderLink('link-t', 'wrong');

    expect(result).toMatchObject({ success: false, error: 'Incorrect password' });
    expect(mockStore.size).toBe(0);
  });
});
