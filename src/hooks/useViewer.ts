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

  // `resolved` flips true once the query has settled in ANY terminal state:
  // success (data populated), null-result (data.me === null), or network
  // error (error populated). This makes `resolved` a trustworthy
  // "query has finished" signal regardless of outcome — callers can then
  // inspect `viewer` / `error` to decide what to do next.
  //
  // Tempting to define this as just `data !== undefined`, but under
  // `network-only`, Apollo leaves `data === undefined` on error — so callers
  // gating on `resolved` alone would miss error states entirely.
  const resolved = data !== undefined || error !== undefined;

  return {
    viewer: data?.me ?? null,
    loading,
    error,
    resolved,
    refetchViewer,
  };
}
