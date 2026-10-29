import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './useAuth';
import { takeOAuthReturnTarget, type OAuthReturnTarget } from '../lib/oauthReturn';

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
 * Where the rider goes once the callback screen has done its job: the
 * onboarding Connect step until onboarding is complete, otherwise the screen
 * that started the connect (recorded in lib/oauthReturn), or Settings when
 * nothing recorded one (a cold start straight into the deep link).
 */
export function oauthReturnHref(
  onboardingCompleted: boolean,
  returnTo: OAuthReturnTarget | null = null
): Href {
  if (!onboardingCompleted) return '/(onboarding)/connect' as Href;
  return (returnTo === 'dashboard' ? '/(tabs)' : '/(tabs)/settings') as Href;
}

/**
 * Shared OAuth callback handler used by every `app/oauth/<provider>.tsx`
 * landing page. The backend redirects with `?status=success` or
 * `?status=error&reason=<code>`. This hook:
 *   1. Closes the in-app browser session.
 *   2. If status is anything other than "success", shows an Alert with a
 *      user-friendly message derived from the reason code (or a generic
 *      fallback for unknown codes).
 *   3. Returns after a 300ms beat so the browser dismiss animation can
 *      finish before the screen transitions. Lands on `/(onboarding)/connect`
 *      if the user is mid-onboarding (server-side `onboardingCompleted=false`),
 *      otherwise on the screen that started the connect: the dashboard when
 *      its ride-source card did (recorded in lib/oauthReturn), else Settings.
 *
 * The return is a `dismissTo`, not a `replace`. The deep link pushed this
 * callback route on top of the screen that opened the browser, so that screen
 * is still mounted underneath with its state: for onboarding, that state is
 * the OnboardingProvider holding the rider's age and bike. A `replace` from
 * here resolves at the root stack and mounts a fresh `(onboarding)` entry
 * with an empty provider, so Continue on Connect would then fail with "Bike
 * data missing". `dismissTo` pops back to the existing entry instead, and
 * falls back to a replace only when there is nothing to pop to (a cold start
 * straight into the deep link).
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
  const { onboardingCompleted } = useAuth();
  // The effect re-runs if `onboardingCompleted` flips while this screen is
  // mounted (a viewer refetch landing mid-beat). The timer restart is
  // harmless, but the failure alert must not show twice.
  const alertedRef = useRef(false);
  // Taken once per callback screen: the effect can re-run, and a second read
  // would find the record already cleared.
  const returnToRef = useRef<OAuthReturnTarget | null | undefined>(undefined);
  if (returnToRef.current === undefined) returnToRef.current = takeOAuthReturnTarget();
  const returnTo = returnToRef.current;

  useEffect(() => {
    WebBrowser.dismissBrowser();

    if (status && status !== 'success' && !alertedRef.current) {
      alertedRef.current = true;
      const message =
        (reason && ERROR_MESSAGES[reason]) || DEFAULT_ERROR_MESSAGE;
      Alert.alert(`${providerLabel} Connection Failed`, message);
    }

    const timer = setTimeout(() => {
      router.dismissTo(oauthReturnHref(onboardingCompleted, returnTo));
    }, 300);

    return () => clearTimeout(timer);
  }, [providerLabel, status, reason, router, onboardingCompleted, returnTo]);
}
