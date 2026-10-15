import { getAccessToken } from '../lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export type ResendResult = { alreadyVerified: boolean };

/**
 * Ask the API to email a fresh verification link to the signed-in rider.
 * Throws with the server's message (rate limit, auth) so the caller can show it.
 */
export async function resendVerificationEmail(): Promise<ResendResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Could not send the email. Try again later.');
  }
  return { alreadyVerified: !!body.alreadyVerified };
}
