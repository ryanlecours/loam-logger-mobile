import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Sentry from '@sentry/react-native';

/**
 * Device attestation for password signup: proof for the API that the request
 * comes from this app on a real device (App Attest on iOS, Play Integrity on
 * Android), not a script calling POST /auth/mobile/signup.
 *
 * Flow: fetch a one-time challenge from POST /auth/mobile/attest-challenge,
 * then bind it to the signup email as `${challenge}.${email}`.
 * - iOS: a fresh App Attest key is attested with that string (the native
 *   module hashes it into App Attest's clientDataHash).
 * - Android: hex SHA-256 of that string is the Play Integrity requestHash.
 * The email must be the exact string sent in the signup body; the API
 * recomputes the binding from it. See apps/api/src/services/device-attestation
 * in loam-logger.
 *
 * Nothing here ever blocks signup. A device that cannot attest sends
 * `unsupported`, and any failure sends `clientError`; the API records it and
 * decides what to do.
 */

export type SignupAttestation =
  | { platform: 'ios'; challenge: string; keyId: string; attestation: string }
  | { platform: 'android'; challenge: string; token: string }
  | { platform: 'ios' | 'android'; unsupported: true }
  | { platform: 'ios' | 'android'; clientError: true };

/** Keeps a slow Apple or Google round trip from stalling the signup button. */
export const ATTESTATION_TIMEOUT_MS = 10_000;

type AppIntegrityModule = typeof import('@expo/app-integrity');

/**
 * Loaded lazily: the native module only exists in builds made after it was
 * added, and requiring it in Expo Go or an older dev client throws.
 */
function loadAppIntegrity(): AppIntegrityModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@expo/app-integrity') as AppIntegrityModule;
  } catch {
    return null;
  }
}

let androidPrepared: Promise<boolean> | null = null;

/**
 * Warm up the Play Integrity token provider. Google recommends preparing well
 * before the request, so the signup screen calls this when it opens. Safe to
 * call repeatedly; a failed attempt is retried on the next call.
 */
export function prepareDeviceAttestation(): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(true);
  if (androidPrepared) return androidPrepared;

  const cloudProjectNumber = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
  androidPrepared = (async () => {
    if (!cloudProjectNumber) return false;
    const integrity = loadAppIntegrity();
    if (!integrity) return false;
    await integrity.prepareIntegrityTokenProviderAsync(cloudProjectNumber);
    return true;
  })().catch((error: unknown) => {
    Sentry.addBreadcrumb({
      category: 'attestation',
      level: 'warning',
      message: `Play Integrity prepare failed: ${errorCode(error)}`,
    });
    return false;
  });
  // Let the next call try again rather than caching a failure for the session.
  void androidPrepared.then((ok) => {
    if (!ok) androidPrepared = null;
  });
  return androidPrepared;
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) return String((error as { code: unknown }).code);
  return error instanceof Error ? error.name : 'unknown';
}

async function fetchChallenge(apiUrl: string): Promise<string> {
  const response = await fetch(`${apiUrl}/auth/mobile/attest-challenge`, { method: 'POST' });
  const data = (await response.json().catch(() => null)) as { challenge?: unknown } | null;
  if (!response.ok || typeof data?.challenge !== 'string') {
    throw new Error(`attest-challenge answered ${response.status}`);
  }
  return data.challenge;
}

async function attest(apiUrl: string, email: string, platform: 'ios' | 'android'): Promise<SignupAttestation> {
  const integrity = loadAppIntegrity();
  if (!integrity) return { platform, unsupported: true };

  if (platform === 'ios') {
    // False on the simulator and on devices without the Secure Enclave support.
    if (!integrity.isSupported) return { platform, unsupported: true };
    const challenge = await fetchChallenge(apiUrl);
    // A new key per signup: an attested key cannot be attested again, and
    // signup happens about once per install.
    const keyId = await integrity.generateKeyAsync();
    const attestation = await integrity.attestKeyAsync(keyId, `${challenge}.${email}`);
    return { platform, challenge, keyId, attestation };
  }

  if (!(await prepareDeviceAttestation())) return { platform, clientError: true };
  const challenge = await fetchChallenge(apiUrl);
  const requestHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${challenge}.${email}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  const token = await integrity.requestIntegrityCheckAsync(requestHash);
  return { platform, challenge, token };
}

/**
 * Build the `attestation` field for POST /auth/mobile/signup. `email` must be
 * the exact string the signup body sends. Never throws.
 */
export async function getSignupAttestation(apiUrl: string, email: string): Promise<SignupAttestation | undefined> {
  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') return undefined;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<SignupAttestation>((resolve) => {
    timer = setTimeout(() => resolve({ platform, clientError: true }), ATTESTATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([attest(apiUrl, email, platform), timeout]);
  } catch (error) {
    Sentry.addBreadcrumb({
      category: 'attestation',
      level: 'warning',
      message: `Signup attestation failed: ${errorCode(error)}`,
    });
    return { platform, clientError: true };
  } finally {
    clearTimeout(timer);
  }
}

export const __test = {
  reset: () => {
    androidPrepared = null;
  },
};
