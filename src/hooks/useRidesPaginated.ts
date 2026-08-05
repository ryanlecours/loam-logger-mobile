import { useCallback, useEffect, useState } from 'react';
import {
  useRidesPageQuery,
  RidesFilterInput,
  RidesPageQuery,
} from '../graphql/generated';

const PAGE_SIZE = 20;

export type RideItem = RidesPageQuery['rides'][0];

export function useRidesPaginated(filter?: RidesFilterInput) {
  const { data, loading, fetchMore, refetch } = useRidesPageQuery({
    variables: { take: PAGE_SIZE, filter },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // "Length is a multiple of PAGE_SIZE" is only a guess at whether more pages
  // exist, and with the cache persisted to disk the restored list can be any
  // length. Keep the guess for the first paint, but once a fetchMore comes
  // back short we know the end definitively; a new filter starts over.
  const [reachedEnd, setReachedEnd] = useState(false);
  useEffect(() => {
    setReachedEnd(false);
  }, [filter]);

  const rides = data?.rides ?? [];
  const hasMore =
    !reachedEnd && rides.length >= PAGE_SIZE && rides.length % PAGE_SIZE === 0;

  const loadMore = useCallback(() => {
    const currentRides = data?.rides ?? [];
    const lastRide = currentRides[currentRides.length - 1];
    if (
      !lastRide ||
      reachedEnd ||
      currentRides.length < PAGE_SIZE ||
      currentRides.length % PAGE_SIZE !== 0
    ) {
      return;
    }
    fetchMore({
      variables: { after: lastRide.id },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        if (fetchMoreResult.rides.length < PAGE_SIZE) setReachedEnd(true);
        // Dedupe by id: after a restore-from-disk plus background refetch,
        // the head of the list may already contain rides the cursor page
        // returns again, and a naive concat would render duplicates.
        const seen = new Set(prev.rides.map((r) => r.id));
        const fresh = fetchMoreResult.rides.filter((r) => !seen.has(r.id));
        return {
          ...prev,
          rides: [...prev.rides, ...fresh],
        };
      },
    });
  }, [data?.rides, fetchMore, reachedEnd]);

  const handleRefetch = useCallback(async () => {
    setReachedEnd(false);
    await refetch({ take: PAGE_SIZE, after: null, filter });
  }, [refetch, filter]);

  return {
    rides,
    loading,
    hasMore,
    loadMore,
    refetch: handleRefetch,
  };
}
