import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { navigateFromNotificationData } from '../lib/notifications';

/**
 * Captures notification taps that arrived before the live response listener
 * could handle them and replays them once the app is in a routable state.
 * Two scenarios this fixes:
 *
 *   1. Cold start — the user taps a notification while the app is killed.
 *      The OS launches the app, but the live `addNotificationResponseReceivedListener`
 *      registered later in app/_layout.tsx wasn't subscribed at the moment of
 *      the tap, so the deep-link is lost. `Notifications.getLastNotificationResponseAsync()`
 *      returns the launch notification on cold boot and lets us recover it.
 *
 *   2. Locked / pre-auth — even with a live listener, `LockScreen` and the
 *      auth gate render in place of the Stack while the user is locked or
 *      not yet onboarded. A `router.push` issued during that window targets
 *      a not-yet-mounted Stack and silently no-ops. By queuing the tap and
 *      gating navigation on `loading || locked || !authed || !onboarded`,
 *      the deep-link fires only after the Stack mounts.
 *
 * Dedup: notification identifiers consumed by this hook are recorded in a
 * module-level set. If the live listener also fires for the same identifier
 * (rare warm-rehydration race), `setupNotificationResponseListener` could
 * be extended to consult this set to skip the duplicate. Today we accept
 * the small risk of a redundant `router.push` to the same path — expo-router
 * deduplicates by URL, so the user-visible effect is unchanged.
 */

type PendingResponse = {
  data: unknown;
  identifier: string;
};

// Track responses already routed by either entry point so a future live-listener
// hand-off doesn't re-dispatch the same notification.
const consumedIdentifiers = new Set<string>();

export function usePendingNotificationRoute(): void {
  const router = useRouter();
  const { loading, isAuthenticated, locked, onboardingCompleted } = useAuth();

  // Single-slot queue. We only replay the most recent unrouted launch
  // notification — there's no use case for replaying a backlog, and
  // `getLastNotificationResponseAsync` returns at most one.
  const pendingRef = useRef<PendingResponse | null>(null);
  // Guards against the cold-start fetch firing twice under React strict-mode
  // dev double-mount. Without this, in dev the same identifier could land
  // in the queue twice and (since it's the same identifier) get marked
  // consumed before the second mount could route it.
  const fetchedRef = useRef(false);

  // Capture the launch notification once on mount.
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const identifier = response.notification.request.identifier;
        if (consumedIdentifiers.has(identifier)) return;
        pendingRef.current = {
          data: response.notification.request.content.data,
          identifier,
        };
      })
      .catch((err) => {
        // A failure here shouldn't crash the app — the live listener still
        // covers warm taps. Log so we have a breadcrumb if cold-start
        // routing silently breaks for everyone.
        console.warn(
          '[usePendingNotificationRoute] getLastNotificationResponseAsync failed',
          err,
        );
      });
  }, []);

  // Drain the queue once auth + lock + onboarding gates are all clear and
  // the Stack is mounted (which happens on the very render where the
  // gates clear, since `RootLayoutNav` returns the Stack at that point).
  useEffect(() => {
    if (loading || locked || !isAuthenticated || !onboardingCompleted) return;

    const queued = pendingRef.current;
    if (!queued) return;

    // Null the queue first so a same-tick re-render of this effect can't
    // re-enter and double-push (the early return above will fire).
    pendingRef.current = null;

    const dispatched = navigateFromNotificationData(router, queued.data);
    if (dispatched) {
      // Only mark consumed on a successful dispatch — the set's job is to
      // prevent the live listener from re-routing the same identifier on
      // a warm-rehydration race. If the payload was unrecognized (e.g. a
      // new `screen` value the navigator doesn't know yet), leaving it
      // un-consumed lets a future app version's listener still route it.
      consumedIdentifiers.add(queued.identifier);
    } else {
      console.warn(
        '[usePendingNotificationRoute] navigateFromNotificationData declined to route',
        queued.data,
      );
    }
  }, [loading, locked, isAuthenticated, onboardingCompleted, router]);
}
