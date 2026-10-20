import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { completeEmailSignIn } from '../lib/auth';
import { emailSignInPollDelay } from '../lib/signInGrant';

/**
 * While `enabled` (the waiting screen is focused), keep asking whether this
 * device's sign-in grant can sign in yet, so opening the verification link
 * anywhere (the phone's mail app, a laptop) signs the app in. Asks only while
 * the app is in the foreground, and straight away when it comes back, which is
 * when a rider returns from their mail app. Stops for good once signed in, or
 * once there is no usable grant (none stored, expired, or refused).
 *
 * `onSignedIn` runs after the tokens are stored; it flips the auth state.
 */
export function useEmailSignInPoll(enabled: boolean, onSignedIn: () => void): void {
  const onSignedInRef = useRef(onSignedIn);
  useEffect(() => {
    onSignedInRef.current = onSignedIn;
  }, [onSignedIn]);

  useEffect(() => {
    if (!enabled) return;

    const startedAt = Date.now();
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (minDelayMs = 0) => {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      const delay = Math.max(emailSignInPollDelay(Date.now() - startedAt), minDelayMs);
      timer = setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      timer = null;
      // In the background, wait for the app to come back instead.
      if (stopped || inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      const result = await completeEmailSignIn();
      inFlight = false;
      if (stopped) return;

      if (result.status === 'signed-in') {
        stop();
        onSignedInRef.current();
      } else if (result.status === 'unavailable') {
        stop();
      } else {
        schedule(result.status === 'retry' ? result.retryAfterMs : 0);
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || stopped) return;
      if (timer) clearTimeout(timer);
      void poll();
    });

    function stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    }

    // Ask once straight away: the link may have been opened while this
    // screen was out of view.
    void poll();
    return stop;
  }, [enabled]);
}
