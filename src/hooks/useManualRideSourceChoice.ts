import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { posthog } from '../lib/posthog';
import { manualRideSourceKey } from '../utils/rideSource';

export interface ManualRideSourceChoice {
  /** The rider has said they do not use a ride tracker. */
  manualOnly: boolean;
  /**
   * The stored choice has been read for this account. Until then the value
   * is a placeholder, and a card that renders from it would guess: an
   * opted-out rider would see the four connect rows for a beat before the
   * manual face replaced them.
   */
  ready: boolean;
  setManualOnly: (manualOnly: boolean) => void;
}

/**
 * The rider's "I don't use a ride tracker" choice.
 *
 * Stored per account on this device rather than on the server: a user column
 * would mean a Prisma migration through staging for a preference that only
 * decides whether one card keeps asking, and the choice is cheap to make again
 * on another device. Connecting a provider later overrides it (see
 * resolveRideSourceState), so a stale "no" never hides a real source.
 *
 * SecureStore is the same per-feature store UpgradePrompt uses for its
 * dismissals. If it is unavailable the choice holds for this session only.
 */
export function useManualRideSourceChoice(userId: string | undefined): ManualRideSourceChoice {
  // Stored with the account it was read for, so a sign-in as someone else is
  // not reported as ready on the strength of the previous rider's answer.
  const [state, setState] = useState<{ userId: string | undefined; manualOnly: boolean; ready: boolean }>({
    userId,
    manualOnly: false,
    ready: false,
  });

  useEffect(() => {
    if (!userId) {
      // No account yet: nothing to read, and nothing to show a card to.
      setState({ userId, manualOnly: false, ready: false });
      return;
    }
    let cancelled = false;
    SecureStore.getItemAsync(manualRideSourceKey(userId))
      .then((value) => {
        if (!cancelled) setState({ userId, manualOnly: value === '1', ready: true });
      })
      .catch(() => {
        if (!cancelled) setState({ userId, manualOnly: false, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = state.userId === userId ? state : { userId, manualOnly: false, ready: false };

  const setManualOnly = useCallback(
    (next: boolean) => {
      setState((prev) => {
        // A repeated tap on the same answer changes nothing and reports nothing.
        if (prev.userId === userId && prev.ready && prev.manualOnly === next) return prev;
        if (userId) {
          const key = manualRideSourceKey(userId);
          (next ? SecureStore.setItemAsync(key, '1') : SecureStore.deleteItemAsync(key)).catch(() => {
            // Storage unavailable: the choice holds until the app restarts.
          });
        }
        // The connect funnel (phase 0) counts riders who never connect; this
        // tells it which of them said so on purpose.
        posthog.capture(next ? 'ride_source_opted_out' : 'ride_source_opt_out_cleared', {
          surface: 'dashboard',
        });
        return { userId, manualOnly: next, ready: true };
      });
    },
    [userId],
  );

  return { manualOnly: current.manualOnly, ready: current.ready, setManualOnly };
}
