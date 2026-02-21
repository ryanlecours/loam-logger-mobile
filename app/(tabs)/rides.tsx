import { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRidesPaginated, RideItem } from '../../src/hooks/useRidesPaginated';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { RideListItem } from '../../src/components/rides';

export default function RidesScreen() {
  const router = useRouter();
  const { rides, loading, hasMore, loadMore, refetch } = useRidesPaginated();
  const { bikes } = useBikesWithPredictions();
  const [refreshing, setRefreshing] = useState(false);

  const getBikeName = useCallback(
    (bikeId: string | null | undefined): string | undefined => {
      if (!bikeId) return undefined;
      const bike = bikes.find((b) => b.id === bikeId);
      if (!bike) return undefined;
      return bike.nickname || `${bike.manufacturer} ${bike.model}`;
    },
    [bikes]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRidePress = (ride: RideItem) => {
    router.push(`/ride/${ride.id}` as Href);
  };

  const handleAddRide = () => {
    router.push('/ride/add' as Href);
  };

  const renderItem = useCallback(
    ({ item }: { item: RideItem }) => (
      <RideListItem
        ride={item}
        bikeName={getBikeName(item.bikeId)}
        onPress={() => handleRidePress(item)}
      />
    ),
    [getBikeName]
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="bicycle-outline" size={48} color="#9ca3af" />
        </View>
        <Text style={styles.emptyTitle}>No rides yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first ride manually or sync from Strava/Garmin
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddRide}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Add Ride</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore || rides.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#6b7280" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rides.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {rides.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddRide}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
