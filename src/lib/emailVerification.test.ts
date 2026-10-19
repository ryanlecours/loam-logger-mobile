import { resendVerificationEmail } from './emailVerification';

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

  it('reports a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(resendVerificationEmail('rider@example.com')).resolves.toEqual({ ok: false, reason: 'network' });
  });
});
