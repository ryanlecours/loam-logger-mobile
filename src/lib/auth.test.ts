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
  completeEmailSignIn,
  completeProviderLink,
  loginWithApple,
  loginWithEmail,
  loginWithGoogle,
  logout,
  refreshAccessToken,
  setTokenRefreshCallback,
} from './auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SIGN_IN_GRANT_KEY = 'email_sign_in_grant';

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

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

describe('loginWithEmail and email verification', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('reports an unverified account so the screen can send the rider to check their email', async () => {
    mockFetchResponse(403, {
      error: 'Check your inbox for a link to verify your email, then sign in.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      details: { email: 'rider@example.com' },
    });

    const result = await loginWithEmail('Rider@Example.com', 'right-password');

    expect(result).toEqual({
      success: false,
      error: 'Check your inbox for a link to verify your email, then sign in.',
      errorCode: 'EMAIL_VERIFICATION_REQUIRED',
      verificationEmail: 'rider@example.com',
      requestId: undefined,
    });
    expect(mockStore.has(ACCESS_TOKEN_KEY)).toBe(false);
  });

  it('keeps the sign-in grant from the refusal, so the app can sign in once the email is verified', async () => {
    const expiresAt = inAnHour();
    mockFetchResponse(403, {
      error: 'Check your inbox for a link to verify your email, then sign in.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      details: { email: 'rider@example.com', signInSecret: 'grant-secret', signInSecretExpiresAt: expiresAt },
    });

    await loginWithEmail('rider@example.com', 'right-password');

    expect(JSON.parse(mockStore.get(SIGN_IN_GRANT_KEY)!)).toEqual({
      secret: 'grant-secret',
      expiresAt,
      email: 'rider@example.com',
    });
  });

  it('drops any leftover grant once a sign-in succeeds', async () => {
    mockStore.set(SIGN_IN_GRANT_KEY, JSON.stringify({ secret: 'old', expiresAt: inAnHour() }));
    mockFetchResponse(200, { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } });

    await expect(loginWithEmail('rider@example.com', 'right-password')).resolves.toEqual({ success: true });

    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(false);
  });

  it('drops a leftover grant for another address before signing in to a different account', async () => {
    mockStore.set(SIGN_IN_GRANT_KEY, JSON.stringify({ secret: 'a', expiresAt: inAnHour(), email: 'a@example.com' }));
    mockFetchResponse(401, { error: 'Invalid email or password' });

    await loginWithEmail('b@example.com', 'wrong');

    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(false);
  });

  it('keeps the grant when the attempt is for the same address', async () => {
    mockStore.set(SIGN_IN_GRANT_KEY, JSON.stringify({ secret: 'a', expiresAt: inAnHour(), email: 'rider@example.com' }));
    mockFetchResponse(401, { error: 'Invalid email or password' });

    await loginWithEmail(' Rider@Example.com', 'wrong');

    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
  });

  it('still reports a wrong password as invalid credentials', async () => {
    mockFetchResponse(401, { error: 'Invalid email or password' });

    const result = await loginWithEmail('rider@example.com', 'wrong');

    expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    expect(result.verificationEmail).toBeUndefined();
  });
});

describe('completeEmailSignIn', () => {
  beforeEach(() => {
    mockStore.clear();
    mockStore.set(SIGN_IN_GRANT_KEY, JSON.stringify({ secret: 'grant-secret', expiresAt: inAnHour() }));
  });

  it('makes no request when the device holds no grant', async () => {
    mockStore.clear();
    global.fetch = jest.fn();

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'unavailable' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('makes no request, and forgets the grant, once it has expired', async () => {
    mockStore.set(SIGN_IN_GRANT_KEY, JSON.stringify({ secret: 'grant-secret', expiresAt: new Date(Date.now() - 1000).toISOString() }));
    global.fetch = jest.fn();

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'unavailable' });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(false);
  });

  it('stores the session and drops the grant once the email is verified', async () => {
    mockFetchResponse(200, { accessToken: 'access-1', refreshToken: 'refresh-1', user: { id: 'u1', email: 'rider@example.com' } });

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'signed-in' });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/auth\/mobile\/verify-email\/complete$/);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ secret: 'grant-secret' }) });
    expect(mockStore.get(ACCESS_TOKEN_KEY)).toBe('access-1');
    expect(mockStore.get(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(false);
  });

  it('keeps the grant while the email is still unverified', async () => {
    mockFetchResponse(202, { pending: true, code: 'EMAIL_VERIFICATION_PENDING' });

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'pending' });
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
    expect(mockStore.has(ACCESS_TOKEN_KEY)).toBe(false);
  });

  it('forgets a grant the API refuses', async () => {
    mockFetchResponse(401, { code: 'SIGN_IN_GRANT_INVALID' });

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'unavailable' });
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(false);
  });

  it('asks to retry after a rate limit, as long as the API said', async () => {
    mockFetchResponse(429, { code: 'TOO_MANY_REQUESTS', details: { retryAfter: 20 } });

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'retry', retryAfterMs: 20_000 });
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
  });

  it('gives up, keeping the grant, on a 4xx that asking again will not change', async () => {
    mockFetchResponse(404, {});

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'unavailable' });
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
  });

  it('asks to retry after a server error', async () => {
    mockFetchResponse(503, {});
    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'retry', retryAfterMs: undefined });
  });

  describe('for a known address', () => {
    beforeEach(() => {
      mockStore.set(
        SIGN_IN_GRANT_KEY,
        JSON.stringify({ secret: 'grant-secret', expiresAt: inAnHour(), email: 'rider@example.com' }),
      );
    });

    it('sends the address along, so the API checks it too', async () => {
      mockFetchResponse(200, { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } });

      await expect(completeEmailSignIn('Rider@example.com')).resolves.toEqual({ status: 'signed-in' });

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.body).toBe(JSON.stringify({ secret: 'grant-secret', email: 'Rider@example.com' }));
    });

    it('never uses a grant for another account, and leaves it in place', async () => {
      global.fetch = jest.fn();

      await expect(completeEmailSignIn('someone-else@example.com')).resolves.toEqual({ status: 'unavailable' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
    });
  });

  it('asks to retry when the network is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(completeEmailSignIn()).resolves.toEqual({ status: 'retry' });
    expect(mockStore.has(SIGN_IN_GRANT_KEY)).toBe(true);
  });
});
