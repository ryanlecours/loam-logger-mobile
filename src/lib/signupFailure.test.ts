import { describeSignupFailure } from './signupFailure';

describe('describeSignupFailure', () => {
  it('recognises an already-registered email by its code', () => {
    expect(
      describeSignupFailure(409, {
        error: 'An account with this email already exists. Please log in.',
        code: 'EMAIL_EXISTS',
      }),
    ).toEqual({ kind: 'email-exists' });
  });

  it('shows the API text from `error`, where the API puts it', () => {
    expect(
      describeSignupFailure(400, { error: 'Invalid email format', code: 'BAD_REQUEST' }),
    ).toEqual({ kind: 'error', message: 'Invalid email format' });
  });

  it('shows the text of a 409 that carries some other code', () => {
    expect(
      describeSignupFailure(409, { error: 'Something else conflicted', code: 'CONFLICT' }),
    ).toEqual({ kind: 'error', message: 'Something else conflicted' });
  });

  it('falls back to `message`, then to a generic line', () => {
    expect(describeSignupFailure(500, { message: 'Server busy' })).toEqual({
      kind: 'error',
      message: 'Server busy',
    });
    expect(describeSignupFailure(500, {})).toEqual({
      kind: 'error',
      message: 'Signup failed. Please try again.',
    });
    expect(describeSignupFailure(502, null)).toEqual({
      kind: 'error',
      message: 'Signup failed. Please try again.',
    });
  });
});

describe('describeSignupFailure and email verification', () => {
  it('sends a created-but-unverified signup to check its email', () => {
    expect(
      describeSignupFailure(403, {
        error: 'Check your inbox for a link to verify your email, then sign in.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        details: { email: 'new@example.com', accountCreated: true },
      }),
    ).toEqual({ kind: 'verify-email', email: 'new@example.com' });
  });

  it('copes with a verification answer that carries no email', () => {
    expect(describeSignupFailure(403, { code: 'EMAIL_VERIFICATION_REQUIRED' })).toEqual({
      kind: 'verify-email',
      email: null,
    });
  });
});
