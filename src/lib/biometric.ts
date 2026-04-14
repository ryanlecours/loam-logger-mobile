import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Biometric unlock (Face ID / Touch ID / fingerprint).
 *
 * This sits on top of the existing session-token auth, not in place of it.
 * After a user successfully signs in with email / Google / Apple, they can
 * opt in to "require Face ID on launch" — we store a flag in SecureStore
 * and on every cold boot useAuth prompts for biometric before trusting the
 * persisted tokens.
 *
 * Separate concerns handled here:
 *   1. Hardware availability + enrollment detection
 *   2. Persistent user preference ("enabled / disabled")
 *   3. Actually running the biometric prompt
 */

const BIOMETRIC_ENABLED_KEY = 'biometric_unlock_enabled';
// Tracks "user explicitly declined the post-login enrollment prompt" — separate
// from the enabled flag so we don't keep nagging on every login. Cleared if
// the user later opts in via Settings (then re-prompted only after a future opt-out).
const BIOMETRIC_ENROLLMENT_DECLINED_KEY = 'biometric_enrollment_declined';

export type BiometricCapability = {
  /** Device has biometric hardware (Face ID sensor, fingerprint reader, etc.). */
  hasHardware: boolean;
  /** User has enrolled at least one face / fingerprint in iOS/Android settings. */
  isEnrolled: boolean;
  /** Which biometric types are available (FACIAL_RECOGNITION, FINGERPRINT, IRIS). */
  types: LocalAuthentication.AuthenticationType[];
};

/**
 * Check what biometric auth the device supports and whether the user has
 * enrolled. Safe to call on any platform — returns a negative result on
 * devices without biometrics rather than throwing.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return { hasHardware, isEnrolled, types };
  } catch {
    return { hasHardware: false, isEnrolled: false, types: [] };
  }
}

/** True iff the device supports biometrics AND the user has enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  const { hasHardware, isEnrolled } = await getBiometricCapability();
  return hasHardware && isEnrolled;
}

/**
 * Has the user opted in to biometric unlock on this device? Separate from
 * hardware availability — the preference persists across app launches even
 * if they later disable Face ID in iOS settings (in which case we'd fall
 * back to requiring password on launch).
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    // Opting in clears the prior "declined" mark — if the user later disables
    // and we want to re-prompt them at some future login, that's a fresh decision.
    await SecureStore.deleteItemAsync(BIOMETRIC_ENROLLMENT_DECLINED_KEY);
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

/**
 * Mark the post-login enrollment prompt as dismissed. Called when the user
 * taps "Not now" so we don't re-prompt on every subsequent login.
 */
export async function declineBiometricEnrollment(): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENROLLMENT_DECLINED_KEY, 'true');
}

export type AuthenticateResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'lockout' | 'unavailable' | 'failed'; error?: string };

/**
 * Run the native biometric prompt. Returns a structured result so callers
 * can distinguish user-cancellation (silent — fall back to login screen)
 * from a real failure (show error, let user retry or log in manually).
 *
 * `disableDeviceFallback: true` forces biometric-only (no "enter passcode"
 * fallback) — simpler UX and avoids users inadvertently training themselves
 * to type the device passcode in-app.
 */
export async function authenticateWithBiometric(
  promptMessage = 'Sign in to Loam Logger',
): Promise<AuthenticateResult> {
  const available = await isBiometricAvailable();
  if (!available) {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use password',
      disableDeviceFallback: true,
    });

    if (result.success) return { ok: true };

    // expo-local-authentication surfaces structured errors via `error` string.
    // Map the common ones to categories the caller can react to.
    const err = 'error' in result ? result.error : undefined;
    if (err === 'user_cancel' || err === 'system_cancel' || err === 'app_cancel') {
      return { ok: false, reason: 'cancelled' };
    }
    if (err === 'lockout') {
      return { ok: false, reason: 'lockout', error: err };
    }
    return { ok: false, reason: 'failed', error: err };
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Whether we should offer this user the biometric opt-in. Returns true only
 * if the device supports biometrics, the user has enrolled at least one, AND
 * they haven't already opted in OR explicitly declined.
 *
 * Without the declined-flag check, tapping "Not now" wouldn't be sticky and
 * the prompt would re-fire on every login. Users can still opt in later via
 * Settings — that path clears the declined flag.
 */
export async function shouldPromptForEnrollment(): Promise<boolean> {
  const [available, alreadyEnabled, declined] = await Promise.all([
    isBiometricAvailable(),
    isBiometricEnabled(),
    SecureStore.getItemAsync(BIOMETRIC_ENROLLMENT_DECLINED_KEY).then((v) => v === 'true'),
  ]);
  return available && !alreadyEnabled && !declined;
}

/**
 * Human-readable label for the user's primary biometric method.
 * Used in UI copy ("Unlock with Face ID" / "Unlock with Touch ID").
 */
export function getBiometricLabel(capability: BiometricCapability): string {
  const { types } = capability;
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}
