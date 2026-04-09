import { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRidesPaginated, RideItem } from '../../src/hooks/useRidesPaginated';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { RideListItem } from '../../src/components/rides';
import type { RidesFilterInput } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

type DateRange = '30days' | '3months' | '6months' | '1year' | 'all';

const FILTER_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '30days', label: '30 Days' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

function getDateRangeFilter(range: DateRange): RidesFilterInput | undefined {
  if (range === 'all') return undefined;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  switch (range) {
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function RidesScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const filter = useMemo(() => getDateRangeFilter(dateRange), [dateRange]);
  const { rides, loading, hasMore, loadMore, refetch } = useRidesPaginated(filter);
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

  const handleRidePress = useCallback((ride: RideItem) => {
    router.push(`/ride/${ride.id}` as Href);
  }, [router]);

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
    [getBikeName, handleRidePress]
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="bicycle-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>
          {dateRange === 'all' ? 'No rides yet' : 'No rides in this period'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {dateRange === 'all'
            ? 'Add your first ride manually or sync from Strava/Garmin'
            : 'Try a longer time range or add a ride'}
        </Text>
        {dateRange === 'all' && (
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddRide}>
            <Ionicons name="add" size={20} color={colors.textPrimary} />
            <Text style={styles.emptyButtonText}>Add Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore || rides.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = dateRange === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setDateRange(option.value)}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {rides.length > 0 && (
        <Text style={styles.rideCount}>
          {rides.length}{hasMore ? '+' : ''} {rides.length === 1 ? 'ride' : 'rides'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rides.length === 0 ? styles.emptyList : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      {rides.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddRide}>
          <Ionicons name="add" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.textPrimary,
  },
  rideCount: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingBottom: 4,
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
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  emptyButtonText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
