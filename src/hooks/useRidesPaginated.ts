import { useCallback, useEffect, useRef, useState } from 'react';
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

  // The definitive end-of-list signal: a cursor page came back short (or
  // brought nothing new). Until then, a full head is assumed to have more.
  // Deliberately NOT a length % PAGE_SIZE check: dedup below can make the
  // list any length, and a modulo gate would permanently stop pagination
  // after the first overlapping page. A new filter starts over.
  const [reachedEnd, setReachedEnd] = useState(false);
  useEffect(() => {
    setReachedEnd(false);
  }, [filter]);

  // One cursor request at a time. FlatList fires onEndReached repeatedly
  // while the rider sits at the bottom; without this, every fire would issue
  // the same `after` cursor again.
  const loadingMoreRef = useRef(false);

  const rides = data?.rides ?? [];
  const hasMore = !reachedEnd && rides.length >= PAGE_SIZE;

  const loadMore = useCallback(() => {
    const currentRides = data?.rides ?? [];
    const lastRide = currentRides[currentRides.length - 1];
    if (
      !lastRide ||
      reachedEnd ||
      currentRides.length < PAGE_SIZE ||
      loadingMoreRef.current
    ) {
      return;
    }
    loadingMoreRef.current = true;
    fetchMore({
      variables: { after: lastRide.id },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        // Dedupe by id: after a restore-from-disk plus background refetch,
        // the head of the list may already contain rides the cursor page
        // returns again, and a naive concat would render duplicates.
        const seen = new Set(prev.rides.map((r) => r.id));
        const fresh = fetchMoreResult.rides.filter((r) => !seen.has(r.id));
        // A short page is the end. So is a page that deduped to nothing:
        // the cursor did not advance, and asking again with the same cursor
        // would loop forever.
        if (fetchMoreResult.rides.length < PAGE_SIZE || fresh.length === 0) {
          setReachedEnd(true);
        }
        return {
          ...prev,
          rides: [...prev.rides, ...fresh],
        };
      },
    }).finally(() => {
      loadingMoreRef.current = false;
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
