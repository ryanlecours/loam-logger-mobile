import { useEffect, useRef } from 'react';
import { posthog } from '../lib/posthog';
import type { User } from '../lib/auth';

/**
 * Keep PostHog's identified user and opt-out state in sync with the session.
 * Port of the web app's usePostHogUser, split the same way:
 *
 *  1. Opt-out enforcement: applies `User.analyticsOptOut` (the account-level
 *     flag, shared with web and the API) to the SDK. The SDK persists it, so
 *     an opted-out rider stays opted out across launches before the ME query
 *     returns.
 *  2. Identity: identify() when an opted-in rider appears, reset() when they
 *     sign out or opt out, so the next rider on this device starts clean.
 *  3. Property freshness: person properties follow tier and profile changes.
 */
export function usePostHogUser(user: User | null): void {
  const lastAppliedIdRef = useRef<string | null>(null);
  const justIdentifiedForIdRef = useRef<string | null>(null);

  // 1) Opt-out enforcement. Waits for the user so a rider who opted out on
  //    another device is never treated as opted in by default.
  useEffect(() => {
    if (!user) return;
    void (user.analyticsOptOut ? posthog.optOut() : posthog.optIn());
    // Only the two fields read here, not the whole user object, so unrelated
    // profile changes don't re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.analyticsOptOut]);

  // 2) Identity. The effective id is null while opted out, so opting out
  //    resets the SDK and opting back in identifies afresh.
  useEffect(() => {
    const id = user?.id ?? null;
    const effectiveId = id && !user?.analyticsOptOut ? id : null;

    if (effectiveId === lastAppliedIdRef.current) return;
    lastAppliedIdRef.current = effectiveId;

    if (effectiveId) {
      posthog.identify(effectiveId, {
        email: user?.email ?? null,
        name: user?.name ?? null,
        subscriptionTier: user?.subscriptionTier ?? null,
        isFoundingRider: user?.isFoundingRider ?? null,
        role: user?.role ?? null,
        onboardingCompleted: user?.onboardingCompleted ?? null,
      });
      justIdentifiedForIdRef.current = effectiveId;
    } else {
      posthog.reset();
      justIdentifiedForIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.analyticsOptOut]);

  // 3) Property freshness. Skipped right after identify(), which already
  //    carried the full snapshot.
  useEffect(() => {
    if (!user?.id || user.analyticsOptOut) return;
    if (justIdentifiedForIdRef.current === user.id) {
      justIdentifiedForIdRef.current = null;
      return;
    }
    posthog.setPersonProperties({
      email: user.email ?? null,
      name: user.name ?? null,
      subscriptionTier: user.subscriptionTier ?? null,
      isFoundingRider: user.isFoundingRider ?? null,
      role: user.role ?? null,
      onboardingCompleted: user.onboardingCompleted ?? null,
    });
  }, [
    user?.id,
    user?.analyticsOptOut,
    user?.email,
    user?.name,
    user?.subscriptionTier,
    user?.isFoundingRider,
    user?.role,
    user?.onboardingCompleted,
  ]);
}

/**
 * Record a `$screen` event whenever the route changes. Takes the screen name
 * rather than reading the router itself so the root layout, which already
 * holds the segments, stays the one place that subscribes to them.
 */
export function usePostHogScreens(screenName: string): void {
  useEffect(() => {
    void posthog.screen(screenName);
  }, [screenName]);
}
