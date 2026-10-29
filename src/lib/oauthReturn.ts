/**
 * Where an OAuth callback should land the rider.
 *
 * A provider connect opens the in-app browser, the provider redirects to the
 * API, and the API deep-links back into `app/oauth/<provider>`. That route
 * is pushed on top of whichever screen started the connect, but nothing on
 * the deep link says which screen that was. Before phase 2 only Settings and
 * the onboarding Connect step could start one, and `onboardingCompleted`
 * told them apart. The dashboard's ride-source card can now start one too,
 * and an onboarded rider who tapped Connect there was being dropped on
 * Settings.
 *
 * The screen that starts a connect records its origin here; the callback
 * takes it (read once, then cleared) and pops back to that screen. The
 * record lives in process memory on purpose: it is only meaningful for the
 * round-trip in flight, and a cold start straight into the deep link has no
 * origin to return to, so the callback falls back to its old default.
 */

export type OAuthReturnTarget = 'dashboard' | 'settings';

let pending: OAuthReturnTarget | null = null;

/** Called by the screen that is about to open the provider's OAuth page. */
export function setOAuthReturnTarget(target: OAuthReturnTarget | null): void {
  pending = target;
}

/** Read and clear the recorded origin. Null when nothing recorded it. */
export function takeOAuthReturnTarget(): OAuthReturnTarget | null {
  const target = pending;
  pending = null;
  return target;
}
