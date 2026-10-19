/**
 * What the signup screen should do with a failed POST /auth/mobile/signup.
 *
 * The API puts its text in `error` (`message` is a success-side field), and
 * tags an already-registered email with the EMAIL_EXISTS code so the screen
 * can offer a way forward instead of a dead end.
 */
export type SignupFailure =
  | { kind: 'email-exists' }
  | { kind: 'error'; message: string };

export function describeSignupFailure(status: number, body: unknown): SignupFailure {
  const data = (body && typeof body === 'object' ? body : {}) as {
    error?: unknown;
    message?: unknown;
    code?: unknown;
  };

  if (status === 409 && data.code === 'EMAIL_EXISTS') {
    return { kind: 'email-exists' };
  }

  const text = [data.error, data.message].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return { kind: 'error', message: text ?? 'Signup failed. Please try again.' };
}
