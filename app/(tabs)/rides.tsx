import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRidesPaginated, RideItem } from '../../src/hooks/useRidesPaginated';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { usePendingRides } from '../../src/hooks/usePendingRides';
import { RideListItem, PendingRideCard } from '../../src/components/rides';
import type { RidesFilterInput } from '../../src/graphql/generated';
import { colors, radius } from '../../src/constants/theme';

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

  // The dashboard's "N rides need a bike" banner links here with
  // ?unassigned=1. Mirrored into state so the rider can clear it from the
  // banner row below without navigating away.
  const { unassigned: unassignedParam } = useLocalSearchParams<{ unassigned?: string }>();
  const [unassignedOnly, setUnassignedOnly] = useState(unassignedParam === '1');
  useEffect(() => {
    if (unassignedParam === '1') setUnassignedOnly(true);
  }, [unassignedParam]);

  const filter = useMemo(() => {
    const range = getDateRangeFilter(dateRange);
    // `unassigned` and `bikeId` are mutually exclusive server-side; this screen
    // never sets bikeId, so combining with the date range is safe.
    return unassignedOnly ? { ...(range ?? {}), unassigned: true } : range;
  }, [dateRange, unassignedOnly]);

  const clearUnassignedFilter = useCallback(() => {
    setUnassignedOnly(false);
    // Drop the param too. Left in place, returning to this tab later would
    // re-apply the filter through the effect above.
    router.setParams({ unassigned: undefined });
  }, [router]);

  const { rides, loading, hasMore, loadMore, refetch } = useRidesPaginated(filter);
  const { bikes } = useBikesWithPredictions();
  const { pendingRides } = usePendingRides();
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

  // The FAB offers both paths; the empty-state buttons keep linking straight
  // to manual entry since their copy already says "manually".
  const handleFabPress = () => {
    Alert.alert('Add a ride', undefined, [
      { text: 'Record with GPS', onPress: () => router.push('/ride/record' as Href) },
      { text: 'Enter manually', onPress: handleAddRide },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleConnectPress = () => {
    router.push('/(tabs)/settings' as Href);
  };

  const renderEmpty = () => {
    if (loading) return null;
    // Rides queued offline render in the header above; "No rides yet" under
    // a ride the rider just logged would read as the app losing it.
    if (pendingRides.length > 0) return null;
    // Checked before the date-range branches: with the filter on, an empty
    // list means every ride has a bike, not that the rider has no rides.
    if (unassignedOnly) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Every ride has a bike</Text>
          <Text style={styles.emptySubtitle}>
            All your rides are counting toward component wear.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={clearUnassignedFilter}>
            <Text style={styles.emptyButtonText}>Show all rides</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (dateRange === 'all') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bicycle-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect Strava, Garmin, WHOOP, or Suunto to import past rides — or add one manually.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleConnectPress}>
            <Ionicons name="link-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.emptyButtonText}>Connect a data source</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptySecondaryButton} onPress={handleAddRide}>
            <Text style={styles.emptySecondaryButtonText}>Add a ride manually</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="bicycle-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No rides in this period</Text>
        <Text style={styles.emptySubtitle}>Try a longer time range or add a ride.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => setDateRange('all')}>
          <Text style={styles.emptyButtonText}>Show all time</Text>
        </TouchableOpacity>
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
      {unassignedOnly && (
        <View style={styles.unassignedBar}>
          <Ionicons
            name="bicycle-outline"
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.unassignedText}>Rides with no bike</Text>
          <TouchableOpacity
            onPress={clearUnassignedFilter}
            style={styles.unassignedClear}
            accessibilityRole="button"
            accessibilityLabel="Show all rides"
          >
            <Text style={styles.unassignedClearText}>Show all</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Fixing these one row at a time is the wrong shape of work when a
          Garmin backfill lands hundreds at once. Its own row rather than a
          third control crammed into the bar above: one line, one decision.
          The bulk screen selects server-side, so it reaches rides this
          paginated list has not loaded. */}
      {unassignedOnly && rides.length > 0 && (
        <TouchableOpacity
          style={styles.bulkAssignRow}
          onPress={() => router.push('/assign-rides' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Assign a bike to several rides at once"
        >
          <Ionicons
            name="albums-outline"
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
          />
          <Text style={styles.bulkAssignText}>Assign several at once</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
          />
        </TouchableOpacity>
      )}
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
      {/* Rides logged without signal, waiting in the outbox. Above the synced
          list and outside the date filter: a rider who just logged a ride
          offline needs to see it exists regardless of the active range. */}
      {pendingRides.map((pendingRide) => (
        <PendingRideCard key={pendingRide.id} pendingRide={pendingRide} />
      ))}
      {/* Entry point for streaks, records, heart rate, locations and weather.
          Those used to sit at the bottom of the dashboard; they belong to the
          riding story, not the gear one. A link rather than an inline block so
          this screen keeps one control (the range filter above) governing one
          thing (the list below). */}
      {rides.length > 0 && (
        <TouchableOpacity
          style={styles.insightsRow}
          onPress={() => router.push('/ride-insights' as Href)}
          accessibilityRole="button"
          accessibilityLabel="See riding insights"
        >
          <Ionicons
            name="stats-chart-outline"
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
          />
          <Text style={styles.insightsText}>Riding insights</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
          />
        </TouchableOpacity>
      )}
      {rides.length > 0 && !hasMore && (
        <Text style={styles.rideCount}>
          {rides.length} {rides.length === 1 ? 'ride' : 'rides'}
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
        <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
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
  // Sage interactive voice, not the component-health ramp: an unassigned ride
  // is a missing input, not a worn part (DESIGN.md).
  unassignedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 12,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  unassignedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unassignedClear: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unassignedClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Same shape as insightsRow below: a link to another screen, not a filter.
  bulkAssignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  bulkAssignText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
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
    color: colors.onPrimary,
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  insightsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
    gap: 6,
  },
  emptyButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySecondaryButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  emptySecondaryButtonText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
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
    borderRadius: radius.full,
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
