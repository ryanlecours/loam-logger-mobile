import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  useComponentRidesQuery,
  useRidesPageQuery,
  useSetComponentRideAdjustmentMutation,
  useClearComponentRideAdjustmentMutation,
  ComponentRideAdjustmentKind,
} from '../../src/graphql/generated';
import { ComponentRideRow } from '../../src/components/gear/ComponentRideRow';
import { colors } from '../../src/constants/theme';

const PAGE_SIZE = 50;
const ADD_RIDES_TAKE = 300;

function formatAnchorDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ComponentRidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    componentId: string;
    componentLabel?: string;
    bikeId?: string;
  }>();
  const componentId = String(params.componentId);
  const componentLabel = params.componentLabel ?? 'Component';
  // bikeId is passed as a route param string; treat missing/"null" as a spare.
  const bikeId = params.bikeId && params.bikeId !== 'null' ? params.bikeId : null;

  const [tab, setTab] = useState<'counted' | 'add'>('counted');
  const [pendingRideIds, setPendingRideIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [addExhausted, setAddExhausted] = useState(false);

  const { data, loading, fetchMore, refetch } = useComponentRidesQuery({
    variables: { componentId, take: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // Date range is applied SERVER-side via RidesFilterInput (so it reaches rides
  // beyond any loaded window); local-day boundaries like the web modal.
  const addFilter = useMemo(() => {
    if (!dateFrom && !dateTo) return undefined;
    const filter: { startDate?: string; endDate?: string } = {};
    if (dateFrom) {
      const s = new Date(dateFrom);
      s.setHours(0, 0, 0, 0);
      filter.startDate = s.toISOString();
    }
    if (dateTo) {
      const e = new Date(dateTo);
      e.setHours(23, 59, 59, 999);
      filter.endDate = e.toISOString();
    }
    return filter;
  }, [dateFrom, dateTo]);

  const {
    data: ridesData,
    loading: ridesLoading,
    fetchMore: fetchMoreRides,
  } = useRidesPageQuery({
    variables: { take: ADD_RIDES_TAKE, ...(addFilter ? { filter: addFilter } : {}) },
    skip: tab !== 'add',
    fetchPolicy: 'cache-first',
  });

  const payload = data?.componentRides;
  const entries = useMemo(() => payload?.entries ?? [], [payload]);

  // Rides already carrying an adjustment (incl. dormant INCLUDEs) — excluded
  // from the Add tab so a ride can't be applied twice.
  const adjustedRideIds = useMemo(
    () => new Set(entries.filter((e) => e.adjustment != null).map((e) => e.ride.id)),
    [entries]
  );

  const addCandidates = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return (ridesData?.rides ?? []).filter((ride) => {
      // "on the component's bike" only when both sides are real ids — a spare
      // component (bikeId null) must still see unassigned rides (bikeId null).
      if (ride.bikeId != null && ride.bikeId === bikeId) return false;
      if (adjustedRideIds.has(ride.id)) return false;
      if (!needle) return true;
      const hay = `${ride.location ?? ''} ${ride.notes ?? ''} ${ride.rideType}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [ridesData, searchText, bikeId, adjustedRideIds]);

  const [setAdjustment] = useSetComponentRideAdjustmentMutation({ refetchQueries: ['Bike'] });
  const [clearAdjustment] = useClearComponentRideAdjustmentMutation({ refetchQueries: ['Bike'] });

  // Per-row in-flight tracking (a Set, not a single id): clicking a second row
  // must not re-enable the first row's button — that would allow a double-submit.
  const runForRide = useCallback(
    (rideId: string, run: () => Promise<unknown>) => {
      setError(null);
      setPendingRideIds((prev) => new Set(prev).add(rideId));
      run()
        .then(() => refetch())
        .catch((e) => setError((e as Error).message || 'Something went wrong.'))
        .finally(() =>
          setPendingRideIds((prev) => {
            const next = new Set(prev);
            next.delete(rideId);
            return next;
          })
        );
    },
    [refetch]
  );

  const removeFromComponent = useCallback(
    (rideId: string) =>
      runForRide(rideId, () =>
        setAdjustment({
          variables: { componentId, rideId, kind: ComponentRideAdjustmentKind.Exclude },
        })
      ),
    [runForRide, setAdjustment, componentId]
  );

  const clearForRide = useCallback(
    (rideId: string) =>
      runForRide(rideId, () => clearAdjustment({ variables: { componentId, rideId } })),
    [runForRide, clearAdjustment, componentId]
  );

  const applyToComponent = useCallback(
    (rideId: string) =>
      runForRide(rideId, () =>
        setAdjustment({
          variables: { componentId, rideId, kind: ComponentRideAdjustmentKind.Include },
        })
      ),
    [runForRide, setAdjustment, componentId]
  );

  const loadMore = useCallback(() => {
    if (!payload?.hasMore || loading || entries.length === 0) return;
    const last = entries[entries.length - 1];
    fetchMore({
      variables: { componentId, take: PAGE_SIZE, after: last.ride.id },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          componentRides: {
            ...fetchMoreResult.componentRides,
            entries: [
              ...prev.componentRides.entries,
              ...fetchMoreResult.componentRides.entries,
            ],
          },
        };
      },
    });
  }, [payload?.hasMore, loading, entries, fetchMore, componentId]);

  const addMayHaveMore =
    !addExhausted &&
    (ridesData?.rides.length ?? 0) > 0 &&
    (ridesData?.rides.length ?? 0) % ADD_RIDES_TAKE === 0;

  const loadOlderRides = useCallback(async () => {
    if (ridesLoading || !ridesData?.rides.length) return;
    const last = ridesData.rides[ridesData.rides.length - 1];
    const res = await fetchMoreRides({
      variables: {
        take: ADD_RIDES_TAKE,
        after: last.id,
        ...(addFilter ? { filter: addFilter } : {}),
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult || fetchMoreResult.rides.length === 0) return prev;
        return { rides: [...prev.rides, ...fetchMoreResult.rides] };
      },
    });
    if ((res.data?.rides.length ?? 0) < ADD_RIDES_TAKE) setAddExhausted(true);
  }, [ridesLoading, ridesData, fetchMoreRides, addFilter]);

  const onDateChange = useCallback(
    (which: 'from' | 'to') => (_e: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') setPicker(null);
      if (!date) return;
      // A new range means the previous "exhausted" flag no longer applies.
      setAddExhausted(false);
      if (which === 'from') setDateFrom(date);
      else setDateTo(date);
    },
    []
  );

  const countedHours = payload?.countedHours ?? 0;
  const hoursUsed = payload?.hoursUsed ?? 0;
  const totalsDiffer = Math.abs(countedHours - hoursUsed) >= 0.05;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {componentLabel}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'counted' && styles.tabActive]}
          onPress={() => setTab('counted')}
        >
          <Text style={[styles.tabText, tab === 'counted' && styles.tabTextActive]}>
            Counted rides
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'add' && styles.tabActive]}
          onPress={() => setTab('add')}
        >
          <Text style={[styles.tabText, tab === 'add' && styles.tabTextActive]}>Add rides</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {tab === 'counted' ? (
        <>
          <View style={styles.totals}>
            <Text style={styles.totalsHours}>{countedHours.toFixed(1)}h</Text>
            <Text style={styles.totalsSub}>
              from {payload?.countedRideCount ?? 0} rides ·{' '}
              {payload?.anchor ? `since service on ${formatAnchorDate(payload.anchor)}` : '(all time)'}
            </Text>
            {totalsDiffer && (
              <Text style={styles.driftHint}>
                Stored hours ({hoursUsed.toFixed(1)}h) will be recalculated from ride history on
                your first change.
              </Text>
            )}
          </View>

          <FlatList
            style={styles.list}
            data={entries}
            keyExtractor={(e) => e.ride.id}
            renderItem={({ item }) => {
              const isExclude = item.adjustment === ComponentRideAdjustmentKind.Exclude;
              const isInclude = item.adjustment === ComponentRideAdjustmentKind.Include;
              return (
                <ComponentRideRow
                  ride={item.ride}
                  counted={item.counted}
                  suffix={isInclude ? 'applied from another bike' : null}
                  beforeAnchor={item.beforeAnchor}
                  actionLabel={isExclude ? 'Restore' : 'Remove'}
                  busyLabel={isExclude ? 'Restoring…' : 'Removing…'}
                  busy={pendingRideIds.has(item.ride.id)}
                  onAction={() =>
                    isExclude || isInclude
                      ? clearForRide(item.ride.id)
                      : removeFromComponent(item.ride.id)
                  }
                />
              );
            }}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={styles.listSpinner} color={colors.primary} />
              ) : (
                <Text style={styles.emptyText}>
                  No rides are counted toward this component yet.
                </Text>
              )
            }
            ListFooterComponent={
              payload?.hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loading}>
                  <Text style={styles.loadMoreText}>Load more</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </>
      ) : (
        <>
          <View style={styles.filters}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search rides"
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setPicker('from')}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {dateFrom ? dateFrom.toLocaleDateString() : 'From'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => setPicker('to')}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {dateTo ? dateTo.toLocaleDateString() : 'To'}
                </Text>
              </TouchableOpacity>
              {(dateFrom || dateTo) && (
                <TouchableOpacity
                  onPress={() => {
                    setDateFrom(null);
                    setDateTo(null);
                    setAddExhausted(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.clearDates}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {picker && (
            <DateTimePicker
              value={(picker === 'from' ? dateFrom : dateTo) ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange(picker)}
              themeVariant="dark"
            />
          )}

          <FlatList
            style={styles.list}
            data={addCandidates}
            keyExtractor={(ride) => ride.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ComponentRideRow
                ride={item}
                suffix={item.bikeId == null ? 'unassigned' : null}
                actionLabel="Apply"
                busyLabel="Applying…"
                busy={pendingRideIds.has(item.id)}
                actionVariant="primary"
                onAction={() => applyToComponent(item.id)}
              />
            )}
            ListEmptyComponent={
              ridesLoading ? (
                <ActivityIndicator style={styles.listSpinner} color={colors.primary} />
              ) : (
                <Text style={styles.emptyText}>
                  {searchText || dateFrom || dateTo
                    ? 'No rides match your filters.'
                    : 'No other rides to apply.'}
                </Text>
              )
            }
            ListFooterComponent={
              addMayHaveMore ? (
                <TouchableOpacity
                  style={styles.loadMore}
                  onPress={loadOlderRides}
                  disabled={ridesLoading}
                >
                  <Text style={styles.loadMoreText}>Load older rides</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabActive: {
    backgroundColor: colors.primaryMuted,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.dangerBg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  totals: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  totalsHours: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalsSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  driftHint: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 8,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  clearDates: {
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
  },
  listSpinner: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 32,
    paddingHorizontal: 24,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
