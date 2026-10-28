/**
 * The root navigation gate, as a pure decision.
 *
 * app/_layout.tsx calls this on every segment or auth change and replaces the
 * route with whatever comes back. Keeping the decision out of the component
 * means the ordering of the gates (auth, terms, onboarding, landing) can be
 * unit tested without mounting a router.
 */

export interface GateInput {
  /** expo-router segments for the current route, e.g. ['(onboarding)', 'connect']. */
  segments: string[];
  isAuthenticated: boolean;
  hasAcceptedCurrentTerms: boolean;
  onboardingCompleted: boolean;
  /** True while a ride recording is live (anything but 'idle'). */
  recorderLive: boolean;
}

export type GateRedirect =
  | '/(auth)/login'
  | '/(onboarding)/terms'
  | '/(onboarding)/age'
  | '/(tabs)';

/**
 * Returns the route the user must be sent to, or null to leave them where
 * they are.
 */
export function resolveGateRedirect({
  segments,
  isAuthenticated,
  hasAcceptedCurrentTerms,
  onboardingCompleted,
  recorderLive,
}: GateInput): GateRedirect | null {
  const firstSegment = segments[0];
  const secondSegment = segments[1];
  const inAuthGroup = firstSegment === '(auth)';
  const inOnboardingGroup = firstSegment === '(onboarding)';

  // 1. AuthGate: Not authenticated -> login
  if (!isAuthenticated) {
    // ...unless a recording is in progress on the recording screens.
    // Recording is local-only work (GPS sampling into SQLite); auth plays
    // no part in it, and replacing the route here would unmount the
    // recording UI and strand the session. Let the rider finish: the save
    // path queues the ride to the durable outbox on UNAUTHENTICATED, and
    // it uploads after the next sign-in. Once they leave these screens
    // (save or discard both navigate away), this gate fires normally.
    const onRecordingScreens =
      firstSegment === 'ride' &&
      (secondSegment === 'record' || secondSegment === 'save-recording');
    if (recorderLive && onRecordingScreens) return null;

    return inAuthGroup ? null : '/(auth)/login';
  }

  // User IS authenticated - don't let them stay in auth group, EXCEPT for
  // /reset-password and /verify-email. A user can be logged in on their
  // phone and still tap a reset link from email (e.g. they remembered their
  // password mid-reset, or an admin sent them one). Bouncing them to /(tabs)
  // would discard the token and break the reset flow. The reset screen
  // handles its own session invalidation when the new password is saved.
  // The verify screen signs in with the device's grant and then moves on to
  // /(tabs) itself, so it must not be bounced mid-verify either.
  const linkScreen = secondSegment === 'reset-password' || secondSegment === 'verify-email';
  if (inAuthGroup && !linkScreen) {
    // Determine where they should go based on flags
    if (!hasAcceptedCurrentTerms) return '/(onboarding)/terms';
    if (!onboardingCompleted) return '/(onboarding)/age';
    return '/(tabs)';
  }

  // A provider OAuth round-trip (app/oauth/<provider>.tsx) lands here by deep
  // link from the in-app browser, and the rider may well be mid-onboarding:
  // the Connect step is where most first connections happen. The callback
  // screen owns its own next hop (back to Connect, or to Settings), so the
  // terms and onboarding gates must not get there first. Before this
  // exemption, the onboarding gate replaced the callback route with the age
  // screen within one render, which unmounted the callback screen, cancelled
  // its redirect, and sent the rider back to step one with their answers gone.
  if (firstSegment === 'oauth') return null;

  // 2. TermsGate: Authenticated but no terms -> terms screen
  if (!hasAcceptedCurrentTerms) {
    if (!inOnboardingGroup || secondSegment !== 'terms') return '/(onboarding)/terms';
    return null;
  }

  // 3. OnboardingGate: Terms accepted but onboarding incomplete -> onboarding
  if (!onboardingCompleted) {
    // Allow navigation within onboarding group (age, bike)
    // but not to terms (already accepted)
    if (!inOnboardingGroup) return '/(onboarding)/age';
    if (secondSegment === 'terms') return '/(onboarding)/age';
    return null;
  }

  // 4. Fully gated user - redirect to tabs from onboarding OR from the
  //    landing index route (firstSegment undefined). Without this clause,
  //    a logged-in, fully-onboarded user landing on `/` would see the
  //    loading spinner forever because none of gates 1–3 fire for them.
  const onIndex = firstSegment === undefined;
  if (inOnboardingGroup || onIndex) return '/(tabs)';

  return null;
}
