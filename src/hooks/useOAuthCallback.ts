import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Reason codes the backend can attach to a callback redirect when the
// OAuth round-trip fails. Strava/Garmin/WHOOP/Suunto all use the same
// error vocabulary at /auth/{provider}/mobile/complete, so a single map
// covers every callback page.
const ERROR_MESSAGES: Record<string, string> = {
  invalid_state:
    'Connection session expired or could not be verified. Please try again.',
  token_exchange_failed:
    'Could not complete authentication with the provider. Please try again.',
  account_already_linked:
    'This account is already linked to another Loam Logger user. Disconnect it from the other account first.',
  access_denied: 'You declined to authorize Loam Logger.',
  internal_error: 'Something went wrong on our end. Please try again in a moment.',
};

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try connecting again.';

/**
 * Shared OAuth callback handler used by every `app/oauth/<provider>.tsx`
 * landing page. The backend redirects with `?status=success` or
 * `?status=error&reason=<code>`. This hook:
 *   1. Closes the in-app browser session.
 *   2. If status is anything other than "success", shows an Alert with a
 *      user-friendly message derived from the reason code (or a generic
 *      fallback for unknown codes).
 *   3. Redirects back to Settings after a 300ms beat so the browser
 *      dismiss animation can finish before the screen transitions.
 *
 * Without the explicit error-status check, the previous implementation
 * silently swallowed every failure mode — users would land back on
 * Settings with the provider still disconnected and no feedback.
 */
export function useOAuthCallback(
  providerLabel: string,
  status: string | undefined,
  reason: string | undefined
) {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.dismissBrowser();

    if (status && status !== 'success') {
      const message =
        (reason && ERROR_MESSAGES[reason]) || DEFAULT_ERROR_MESSAGE;
      Alert.alert(`${providerLabel} Connection Failed`, message);
    }

    const timer = setTimeout(() => {
      router.replace('/(tabs)/settings');
    }, 300);

    return () => clearTimeout(timer);
  }, [providerLabel, status, reason, router]);
}
