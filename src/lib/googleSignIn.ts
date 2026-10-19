import type { GoogleSignin } from '@react-native-google-signin/google-signin';

export type GoogleSignInResult = { kind: 'success'; idToken: string } | { kind: 'cancelled' };

type GoogleSignInClient = Pick<
  typeof GoogleSignin,
  'hasPlayServices' | 'hasPreviousSignIn' | 'signOut' | 'signIn'
>;

/**
 * Sign in with Google, always letting the rider choose the account.
 *
 * The library remembers the last account and `signIn()` reuses it without
 * asking, so after one Google sign-in every later one, even after logging
 * out of Loam Logger, went to the same account with no way to switch.
 * Forgetting it first brings the account picker back every time.
 *
 * Backing out of the picker resolves `{ type: 'cancelled' }` in this
 * library version rather than throwing, so it is reported as a cancel, not
 * as a missing token.
 */
export async function signInWithAccountPicker(google: GoogleSignInClient): Promise<GoogleSignInResult> {
  await google.hasPlayServices();
  if (google.hasPreviousSignIn()) {
    await google.signOut();
  }

  const response = await google.signIn();
  if (response.type === 'cancelled') {
    return { kind: 'cancelled' };
  }

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token received from Google');
  }
  return { kind: 'success', idToken };
}
