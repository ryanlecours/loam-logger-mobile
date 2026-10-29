import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { posthog } from '../lib/posthog';
import { manualRideSourceKey } from '../utils/rideSource';

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
export function useManualRideSourceChoice(
  userId: string | undefined,
): [boolean, (manualOnly: boolean) => void] {
  const [manualOnly, setManualOnlyState] = useState(false);

  useEffect(() => {
    if (!userId) {
      setManualOnlyState(false);
      return;
    }
    let cancelled = false;
    SecureStore.getItemAsync(manualRideSourceKey(userId))
      .then((value) => {
        if (!cancelled) setManualOnlyState(value === '1');
      })
      .catch(() => {
        if (!cancelled) setManualOnlyState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setManualOnly = useCallback(
    (next: boolean) => {
      setManualOnlyState(next);
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
    },
    [userId],
  );

  return [manualOnly, setManualOnly];
}
