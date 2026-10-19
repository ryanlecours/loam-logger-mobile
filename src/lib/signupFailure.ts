import { EMAIL_VERIFICATION_REQUIRED_CODE } from './emailVerification';

/**
 * What the signup screen should do with a failed POST /auth/mobile/signup.
 *
 * The API puts its text in `error` (`message` is a success-side field), and
 * tags an already-registered email with the EMAIL_EXISTS code so the screen
 * can offer a way forward instead of a dead end.
 *
 * A successful password signup also lands here: the account is created but
 * no tokens are issued until the email is confirmed, so the API answers 403
 * EMAIL_VERIFICATION_REQUIRED (a 2xx would break builds that expect tokens).
 */
export type SignupFailure =
  | { kind: 'email-exists' }
  | { kind: 'verify-email'; email: string | null }
  | { kind: 'error'; message: string };

export function describeSignupFailure(status: number, body: unknown): SignupFailure {
  const data = (body && typeof body === 'object' ? body : {}) as {
    error?: unknown;
    message?: unknown;
    code?: unknown;
    details?: { email?: unknown } | null;
  };

  if (status === 409 && data.code === 'EMAIL_EXISTS') {
    return { kind: 'email-exists' };
  }

  if (data.code === EMAIL_VERIFICATION_REQUIRED_CODE) {
    const email = data.details?.email;
    return { kind: 'verify-email', email: typeof email === 'string' ? email : null };
  }

  const text = [data.error, data.message].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return { kind: 'error', message: text ?? 'Signup failed. Please try again.' };
}
