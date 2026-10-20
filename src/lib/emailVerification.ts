/**
 * API error code for a password signup or sign-in whose email is not
 * confirmed yet. The account exists, but no tokens are issued until the rider
 * opens the link in the verification email.
 */
export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';

export type ResendResult =
  | { ok: true }
  | { ok: false; reason: 'rate-limited'; retryAfter: number }
  | { ok: false; reason: 'server' }
  | { ok: false; reason: 'network' };

/**
 * Ask the API for a fresh verification link. The API answers 200 whether or
 * not the address is registered, so a 200 is the only success; anything else
 * (a 5xx from the host, a 400) means no link was requested and must not be
 * shown as "on its way". `retryAfter` is in seconds, as the API sends it.
 */
export async function resendVerificationEmail(email: string): Promise<ResendResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const retryAfter = typeof data?.details?.retryAfter === 'number' ? data.details.retryAfter : 60;
      return { ok: false, reason: 'rate-limited', retryAfter };
    }
    return res.ok ? { ok: true } : { ok: false, reason: 'server' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export type VerifyEmailOutcome =
  | { status: 'verified'; email?: string }
  | { status: 'expired' | 'invalid' | 'error' };

/**
 * Confirm an address with the token from the verification email, when the
 * link opened the app. Only verifies: signing in is up to the device's
 * sign-in grant (completeEmailSignIn) or the password. `email` comes back for
 * prefilling sign-in.
 */
export async function verifyEmailToken(token: string): Promise<VerifyEmailOutcome> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      return { status: 'verified', ...(typeof data?.email === 'string' ? { email: data.email } : {}) };
    }
    if (data?.code === 'TOKEN_EXPIRED') return { status: 'expired' };
    if (data?.code === 'TOKEN_INVALID') return { status: 'invalid' };
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
