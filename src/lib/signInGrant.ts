import * as SecureStore from 'expo-secure-store';

/**
 * A sign-in grant: the API hands one to the app on a password signup, and on
 * a sign-in refused because the email is not verified yet. Once the address
 * is verified (on this phone or anywhere else), the app trades it for a
 * session at /auth/mobile/verify-email/complete, so the rider never has to
 * sign in again. The verification link itself never signs anyone in.
 */
export type SignInGrant = {
  secret: string;
  /** ISO timestamp; the API refuses the grant after this. */
  expiresAt: string;
  /** The account's address, for prefilling sign-in if the grant goes unused. */
  email?: string;
};

const SIGN_IN_GRANT_KEY = 'email_sign_in_grant';

/**
 * Read the grant out of an EMAIL_VERIFICATION_REQUIRED answer's `details`.
 * Null when the API sent none (an API from before grants, or one that could
 * not issue it).
 */
export function signInGrantFromDetails(details: unknown, email?: string | null): SignInGrant | null {
  if (!details || typeof details !== 'object') return null;
  const { signInSecret, signInSecretExpiresAt } = details as Record<string, unknown>;
  if (typeof signInSecret !== 'string' || !signInSecret) return null;
  if (typeof signInSecretExpiresAt !== 'string' || Number.isNaN(Date.parse(signInSecretExpiresAt))) return null;
  return { secret: signInSecret, expiresAt: signInSecretExpiresAt, ...(email ? { email } : {}) };
}

/**
 * Keep the grant for later. Only the newest one is kept: it is the one the
 * API issued last, and older ones may already be retired. Never throws, since
 * signup and sign-in still work without it (the rider then signs in by hand).
 */
export async function saveSignInGrant(grant: SignInGrant): Promise<void> {
  try {
    await SecureStore.setItemAsync(SIGN_IN_GRANT_KEY, JSON.stringify(grant));
  } catch {
    // Without the grant the rider signs in with the password after verifying.
  }
}

/** The stored grant, or null when there is none or it has expired. */
export async function readSignInGrant(): Promise<SignInGrant | null> {
  try {
    const raw = await SecureStore.getItemAsync(SIGN_IN_GRANT_KEY);
    if (!raw) return null;
    const grant = JSON.parse(raw) as Partial<SignInGrant>;
    if (typeof grant.secret !== 'string' || typeof grant.expiresAt !== 'string') {
      await clearSignInGrant();
      return null;
    }
    if (Date.parse(grant.expiresAt) <= Date.now()) {
      await clearSignInGrant();
      return null;
    }
    return grant as SignInGrant;
  } catch {
    return null;
  }
}

export async function clearSignInGrant(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SIGN_IN_GRANT_KEY);
  } catch {
    // Nothing to do: an unreadable grant is refused by the API anyway.
  }
}

/**
 * How long to wait before asking again, `elapsedMs` into the wait: every 3s
 * for the first two minutes (the rider is likely opening the email right
 * now), every 10s to ten minutes, then every 30s. The grant's own expiry ends
 * the wait: once it passes, readSignInGrant drops it.
 */
export function emailSignInPollDelay(elapsedMs: number): number {
  if (elapsedMs < 2 * 60 * 1000) return 3_000;
  if (elapsedMs < 10 * 60 * 1000) return 10_000;
  return 30_000;
}
