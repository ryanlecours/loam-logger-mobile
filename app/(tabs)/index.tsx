import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import {
  useRecentRidesQuery,
  BikeFieldsFragment,
} from '../../src/graphql/generated';
import {
  DashboardGreeting,
  BikeCarousel,
  DashboardSkeleton,
  EmptyBikeState,
  RecentRidesList,
} from '../../src/components/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    bikes,
    loading: bikesLoading,
    hasPredictions,
    refetch: refetchBikes,
  } = useBikesWithPredictions();

  const {
    data: ridesData,
    loading: ridesLoading,
    refetch: refetchRides,
  } = useRecentRidesQuery({
    variables: { take: 5 },
    fetchPolicy: 'cache-and-network',
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBikes(), refetchRides()]);
    setRefreshing(false);
  }, [refetchBikes, refetchRides]);

  // Extract first name from user data
  const firstName = user?.name?.split(' ')[0] || 'Rider';

  // Cast bikes to BikeFieldsFragment for type safety
  const typedBikes = bikes as BikeFieldsFragment[];

  // Calculate total due counts across all bikes for greeting
  // Only available when predictions have loaded
  const totalDueNow = hasPredictions
    ? (bikes as BikeFieldsFragment[]).reduce(
        (sum, bike) => sum + (bike.predictions?.dueNowCount || 0),
        0
      )
    : 0;
  const totalDueSoon = hasPredictions
    ? (bikes as BikeFieldsFragment[]).reduce(
        (sum, bike) => sum + (bike.predictions?.dueSoonCount || 0),
        0
      )
    : 0;

  const handleBikePress = (bikeId: string) => {
    router.push(`/bike/${bikeId}` as Href);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <DashboardGreeting
        firstName={firstName}
        dueNowCount={totalDueNow}
        dueSoonCount={totalDueSoon}
      />

      {bikesLoading && !bikes.length ? (
        <DashboardSkeleton />
      ) : typedBikes.length > 0 ? (
        <BikeCarousel bikes={typedBikes} onBikePress={handleBikePress} />
      ) : (
        <EmptyBikeState />
      )}

      <RecentRidesList
        rides={ridesData?.rides || []}
        bikes={bikes}
        loading={ridesLoading && !ridesData}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 24,
  },
});
