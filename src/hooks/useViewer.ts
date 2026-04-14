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
 * Uses `network-only` deliberately. We previously tried `cache-and-network`
 * to eliminate the post-biometric-unlock spinner, but it caused a login
 * redirect loop: Apollo's intermediate render state (data === undefined →
 * resolved=false one tick, then data === {me:null} transiently before the
 * network response lands) made the logout-effect in useAuth fire and
 * immediately bounce freshly-signed-in users back to the login screen.
 *
 * Post-unlock latency deferred to the persistent-cache TODO item instead.
 */
export function useViewer(options: UseViewerOptions = {}) {
  const { data, loading, error, refetch } = useMeQuery({
    skip: options.skip,
    fetchPolicy: 'network-only',
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
