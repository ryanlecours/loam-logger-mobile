import { resendVerificationEmail, verifyEmailToken } from './emailVerification';

function mockFetch(status: number, body: unknown = {}): jest.Mock {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  global.fetch = fn;
  return fn;
}

describe('resendVerificationEmail', () => {
  it('posts the trimmed address to the resend endpoint', async () => {
    const fetchMock = mockFetch(200, { ok: true });

    await expect(resendVerificationEmail('  rider@example.com ')).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/resend-verification$/);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ email: 'rider@example.com' }) });
  });

  it('reports a rate limit with the wait the API asked for', async () => {
    mockFetch(429, { error: 'Too many attempts', code: 'TOO_MANY_REQUESTS', details: { retryAfter: 42 } });

    await expect(resendVerificationEmail('rider@example.com')).resolves.toEqual({
      ok: false,
      reason: 'rate-limited',
      retryAfter: 42,
    });
  });

  it('reports a server error rather than claiming a link was sent', async () => {
    mockFetch(503, { error: 'Service Unavailable' });

    await expect(resendVerificationEmail('rider@example.com')).resolves.toEqual({ ok: false, reason: 'server' });
  });

  it('treats a 400 as a failure too', async () => {
    mockFetch(400, { error: 'A valid email is required' });

    await expect(resendVerificationEmail('rider@example.com')).resolves.toEqual({ ok: false, reason: 'server' });
  });

  it('reports a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(resendVerificationEmail('rider@example.com')).resolves.toEqual({ ok: false, reason: 'network' });
  });
});

describe('verifyEmailToken', () => {
  it('posts the token and returns the verified address', async () => {
    const fetchMock = mockFetch(200, { ok: true, email: 'rider@example.com' });

    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'verified', email: 'rider@example.com' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/verify-email$/);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ token: 'tok' }) });
  });

  it('treats a second tap on a used link as verified', async () => {
    mockFetch(200, { ok: true, alreadyVerified: true });
    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'verified' });
  });

  it('tells an expired link from an invalid one', async () => {
    mockFetch(400, { code: 'TOKEN_EXPIRED' });
    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'expired' });

    mockFetch(400, { code: 'TOKEN_INVALID' });
    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'invalid' });
  });

  it('reports a server or network failure as an error', async () => {
    mockFetch(500, {});
    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'error' });

    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(verifyEmailToken('tok')).resolves.toEqual({ status: 'error' });
  });
});
