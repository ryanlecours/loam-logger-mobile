import { useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'loam.selectedBikeId';

interface MinimalBike {
  id: string;
}

/**
 * Remembers which bike the rider was last looking at, across cold starts.
 *
 * The dashboard used to hold the selection in component state, so every
 * relaunch dumped a multi-bike rider back on `bikes[0]`. A rider who owns a
 * trail bike and a DH bike opens this screen to check one specific bike; making
 * them re-pick it every time is the app forgetting the only thing it was asked
 * to remember.
 *
 * Persistence uses SecureStore because that is the storage this app already
 * ships (see the upsell dismissal keys); a bike id is not a secret, but adding
 * a second storage dependency for one string is not worth it.
 *
 * Hardening notes:
 * - a persisted bike that no longer exists (deleted, retired, sold, or a
 *   different account) falls back to the first bike and clears the stale key,
 *   rather than resolving to nothing and rendering an empty dashboard;
 * - storage failures are non-fatal. The selection still works for the session,
 *   it just will not survive a relaunch;
 * - writes are fire-and-forget so tapping through the bike picker never blocks
 *   on disk.
 */
export function usePersistedBikeSelection(bikes: MinimalBike[]) {
  const [storedBikeId, setStoredBikeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Callers hold the screen until `hydrated`, so a storage read that never
    // settles would hang the dashboard. Time it out and take the default.
    const timer = setTimeout(() => {
      if (!cancelled) setHydrated(true);
    }, 400);

    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (cancelled) return;
        setStoredBikeId(value);
        setHydrated(true);
      })
      .catch(() => {
        // Storage unavailable. Fall back to the default selection.
        if (!cancelled) setHydrated(true);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const storedBikeExists = useMemo(
    () => !!storedBikeId && bikes.some((b) => b.id === storedBikeId),
    [storedBikeId, bikes]
  );

  // Drop a selection pointing at a bike the rider no longer has, so it cannot
  // keep losing a resolution race against a freshly added bike.
  useEffect(() => {
    if (!hydrated || !storedBikeId || bikes.length === 0 || storedBikeExists) return;
    setStoredBikeId(null);
    SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {
      // Nothing to recover from: the value is already ignored in memory.
    });
  }, [hydrated, storedBikeId, storedBikeExists, bikes.length]);

  const activeBikeId = useMemo(() => {
    if (storedBikeExists) return storedBikeId;
    return bikes[0]?.id ?? null;
  }, [storedBikeExists, storedBikeId, bikes]);

  const selectBike = useCallback((bikeId: string) => {
    setStoredBikeId(bikeId);
    SecureStore.setItemAsync(STORAGE_KEY, bikeId).catch(() => {
      // Selection holds for this session; it just will not persist.
    });
  }, []);

  return {
    activeBikeId,
    selectBike,
    /** False until the persisted value has been read, to avoid a wrong-bike flash. */
    hydrated,
  };
}
