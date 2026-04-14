import { useCallback } from 'react';
import { useMeQuery } from '../graphql/generated';

interface UseViewerOptions {
  /**
   * Skip the ME query (e.g., when not authenticated)
   */
  skip?: boolean;
}

/**
 * Wrapper hook around the ME query for fetching the current viewer.
 * Used by useAuth to fetch full user data after login.
 *
 * Uses `cache-and-network` so that flipping `skip: false` (e.g. right after
 * a successful biometric unlock) returns any cached viewer synchronously —
 * the auth gate unblocks on the first render instead of waiting for the
 * network roundtrip to complete. A background refresh still fires so any
 * server-side changes (terms version bump, onboarding flag flip, etc.)
 * arrive within a beat. `nextFetchPolicy: 'cache-first'` prevents repeated
 * network-hitting on subsequent re-renders within the same session.
 *
 * Trade-off: cold boot (no cache yet) behaves identically to network-only.
 * Persistent cache across app launches would require apollo3-cache-persist;
 * that's a separate, larger change.
 */
export function useViewer(options: UseViewerOptions = {}) {
  const { data, loading, error, refetch } = useMeQuery({
    skip: options.skip,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const refetchViewer = useCallback(() => {
    return refetch();
  }, [refetch]);

  // `resolved` flips true once the query has completed (success or null result),
  // so callers can distinguish "query hasn't returned yet" (data === undefined)
  // from "query returned and `me` was null" (data exists, data.me === null).
  // The latter means the token was accepted network-wise but the server
  // couldn't identify a user — usually a deleted account or a token that
  // failed version validation — and the caller should log out.
  const resolved = data !== undefined;

  return {
    viewer: data?.me ?? null,
    loading,
    error,
    resolved,
    refetchViewer,
  };
}
