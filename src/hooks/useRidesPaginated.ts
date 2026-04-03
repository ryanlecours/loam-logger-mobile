import { useCallback } from 'react';
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

  const rides = data?.rides ?? [];
  const hasMore = rides.length >= PAGE_SIZE && rides.length % PAGE_SIZE === 0;

  const loadMore = useCallback(() => {
    const currentRides = data?.rides ?? [];
    const lastRide = currentRides[currentRides.length - 1];
    if (lastRide && currentRides.length >= PAGE_SIZE && currentRides.length % PAGE_SIZE === 0) {
      fetchMore({
        variables: { after: lastRide.id },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...prev,
            rides: [...prev.rides, ...fetchMoreResult.rides],
          };
        },
      });
    }
  }, [data?.rides, fetchMore]);

  const handleRefetch = useCallback(async () => {
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
