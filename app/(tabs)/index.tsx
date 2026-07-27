import { ScrollView, View, Text, Image, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { useRideStats, type TimeframeOption } from '../../src/hooks/useRideStats';
import {
  BikeFieldsFragment,
  ComponentPrediction,
  useCalibrationStateQuery,
  useRidesPageQuery,
} from '../../src/graphql/generated';
import {
  DashboardSkeleton,
  EmptyBikeState,
  BikeSelectorSheet,
  DashboardComponentCard,
  ComponentActionSheet,
  RecentRidesList,
  RideStatsCard,
} from '../../src/components/dashboard';
import { LogServiceSheet } from '../../src/components/gear/LogServiceSheet';
import { ReplaceComponentSheet } from '../../src/components/gear/ReplaceComponentSheet';
import { CalibrationSheet } from '../../src/components/calibration/CalibrationSheet';
import { MaintenanceSummary } from '../../src/components/bike/MaintenanceSummary';
import { UpgradePrompt, ProChip } from '../../src/components/common/UpgradePrompt';
import { ErrorState } from '../../src/components/common/ErrorState';
import { useUserTier } from '../../src/hooks/useUserTier';
import { usePersistedBikeSelection } from '../../src/hooks/usePersistedBikeSelection';
import { colors, radius } from '../../src/constants/theme';
import { formatComponentType } from '../../src/utils/formatComponentType';
import { describeError } from '../../src/utils/errorCopy';
import { selectionTick } from '../../src/lib/haptics';

const TIMEFRAME_OPTIONS: { key: TimeframeOption; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'YTD', label: 'YTD' },
];

/** Spoken-out labels: "7D" is fine to read, useless to hear. */
const TIMEFRAME_LABELS: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  YTD: 'Year to date',
};

function HealthTile({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: { on: string; bg: string; border: string };
}) {
  const idle = count === 0;
  return (
    <View
      style={[
        styles.healthTile,
        !idle && { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
      accessible
      accessibilityLabel={`${count} ${label}`}
    >
      <Text style={[styles.healthCount, !idle && { color: tone.on }]}>{count}</Text>
      <Text style={[styles.healthLabel, !idle && { color: tone.on }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isPro, isFoundingRider } = useUserTier();
  const {
    bikes,
    spareComponents,
    loading: bikesLoading,
    error: bikesError,
    refetch: refetchBikes,
  } = useBikesWithPredictions();

  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showBikeSelector, setShowBikeSelector] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('YTD');
  const [selectedPrediction, setSelectedPrediction] = useState<ComponentPrediction | null>(null);
  const [showLogService, setShowLogService] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const { data: calibrationData } = useCalibrationStateQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Three most recent rides for the dashboard preview. Uses the same
  // `RidesPage` query as the rides tab (just with a smaller `take`) so the
  // returned row shape matches `RideListItem` exactly — no shape adapter
  // and no duplicate GraphQL fragment to keep in sync. `refetchQueries:
  // ['RidesPage']` calls scattered around the app (pickBike, addRide,
  // updateRide) refresh this preview alongside the rides tab.
  const {
    data: recentRidesData,
    loading: recentRidesLoading,
    refetch: refetchRecentRides,
  } = useRidesPageQuery({
    variables: { take: 3 },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (calibrationData?.calibrationState?.showOverlay) {
      setShowCalibration(true);
    }
  }, [calibrationData]);

  // One instance for the screen. This hook was previously mounted twice on the
  // dashboard (here and inside RideStatsCard), so every timeframe change
  // recomputed streaks, records and location buckets over up to 500 rides
  // twice on the JS thread.
  const {
    stats: rideStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useRideStats(timeframe);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // A failing refetch must not leave the spinner up forever. Each read owns
    // its own error surface, so swallowing here is safe.
    await Promise.allSettled([refetchBikes(), refetchStats(), refetchRecentRides()]);
    setRefreshing(false);
  }, [refetchBikes, refetchStats, refetchRecentRides]);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    await Promise.allSettled([refetchBikes(), refetchStats(), refetchRecentRides()]);
    setRetrying(false);
  }, [refetchBikes, refetchStats, refetchRecentRides]);

  const typedBikes = bikes as BikeFieldsFragment[];

  const { activeBikeId, selectBike, hydrated: selectionHydrated } =
    usePersistedBikeSelection(typedBikes);
  const selectedBike = typedBikes.find((b) => b.id === activeBikeId) || null;

  // Get components needing attention
  const attentionComponents = useMemo(() => {
    if (!selectedBike?.predictions?.components) return [];
    return selectedBike.predictions.components.filter(
      (p) => p.status === 'DUE_NOW' || p.status === 'DUE_SOON' || p.status === 'OVERDUE'
    );
  }, [selectedBike]);

  /**
   * The top row's counts, derived from the component list rather than from
   * `predictions.dueNowCount` / `dueSoonCount`.
   *
   * Two reasons. The summary has no overdue bucket, so an overdue fork used to
   * be invisible up here; and counting from a different source than the list
   * below meant the badge number and the list length could disagree in front
   * of the rider.
   */
  const healthCounts = useMemo(() => {
    const counts = { overdue: 0, dueNow: 0, dueSoon: 0 };
    for (const c of attentionComponents) {
      if (c.status === 'OVERDUE') counts.overdue += 1;
      else if (c.status === 'DUE_NOW') counts.dueNow += 1;
      else if (c.status === 'DUE_SOON') counts.dueSoon += 1;
    }
    return counts;
  }, [attentionComponents]);

  /**
   * What a free rider is owed: the components they have ridden past their own
   * service interval, by name.
   *
   * The API's `degradeSummaryForFreeTier` nulls only the predictive fields
   * (status, hoursRemaining, confidence, why). It deliberately keeps the raw
   * counters, so "hours since service has passed the interval" is a fact the
   * client can derive without touching the Pro forecast. It is also the exact
   * condition the engine calls OVERDUE (`hoursRemaining <= 0`), just computed
   * from numbers free users already hold.
   *
   * This replaces a fallback to `dueNowCount`, which was wrong twice over: it
   * carries no component names, and the engine counts DUE_NOW as
   * `0 < hoursRemaining <= 2h`, so an overdue fork appears in neither
   * `dueNowCount` nor `dueSoonCount`. A free rider 40 hours past a fork
   * service was being told "Ready to ride".
   */
  const pastIntervalComponents = useMemo(() => {
    const comps = selectedBike?.predictions?.components ?? [];
    return comps.filter(
      (c) => c.serviceIntervalHours > 0 && c.hoursSinceService >= c.serviceIntervalHours
    );
  }, [selectedBike]);

  const attentionCount = isPro
    ? healthCounts.overdue + healthCounts.dueNow + healthCounts.dueSoon
    : pastIntervalComponents.length;

  /** The cards under the health row: real statuses on Pro, derived facts on free. */
  const listedComponents = isPro ? attentionComponents : pastIntervalComponents;

  const displayName = selectedBike
    ? selectedBike.nickname || `${selectedBike.manufacturer} ${selectedBike.model}`
    : 'No Bike Selected';

  // Order matters, and it is the whole point of this block. Loading, then
  // failure, then genuinely-empty. Reading `bikes.length === 0` before ruling
  // out a failed query is what told riders with four bikes that they owned
  // none, and offered to add their first.
  // The hydration gate is unconditional on purpose. On a warm start Apollo has
  // bikes cached immediately, so without it the screen would render the
  // fallback bike's health and then swap to the remembered one. Showing a
  // rider the wrong bike's service state, even for a frame, is worse than a
  // brief skeleton; the read is capped at 400ms in the hook.
  if ((bikesLoading && !typedBikes.length) || !selectionHydrated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // Stale cached bikes beat an error screen, so this only takes over when the
  // failure left us with nothing to show.
  if (bikesError && !typedBikes.length) {
    const copy = describeError(bikesError, 'gear');
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState title={copy.title} body={copy.body} onRetry={onRetry} retrying={retrying} />
      </SafeAreaView>
    );
  }

  if (!bikesError && !bikesLoading && typedBikes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyBikeState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // tintColor is iOS-only. Without `colors` and `progressBackgroundColor`
            // Android drew a platform-default blue spinner on an obsidian
            // background, the one piece of stock Material left in the app.
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Bike header. The photo is part of the identity line rather than a
            160pt band of its own: it was the largest element on a screen about
            service state, carried no information (not tappable, no health), and
            pushed the actual gear signal a full thumb-scroll down. At 56pt it
            still tells a multi-bike rider which bike they are looking at, which
            is the only job it had. */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.identityRow}
            onPress={() => setShowBikeSelector(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Selected bike: ${displayName}. Change bike.`}
          >
            {selectedBike?.thumbnailUrl ? (
              <Image
                source={{ uri: selectedBike.thumbnailUrl }}
                style={styles.avatar}
                resizeMode="cover"
                accessibilityElementsHidden
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="bicycle-outline" size={26} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.identityCopy}>
              <View style={styles.bikeNameRow}>
                <Text style={styles.bikeName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {typedBikes.length > 1
                    ? `${typedBikes.length} bikes  ·  Component Wear Tracker`
                    : 'Component Wear Tracker'}
                </Text>
                <View
                  style={[styles.tierBadge, isPro ? styles.tierBadgePro : styles.tierBadgeFree]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      isPro ? styles.tierBadgeTextPro : styles.tierBadgeTextFree,
                    ]}
                  >
                    {isFoundingRider ? 'Founding Rider' : isPro ? 'Pro' : 'Free'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bike health. This row is the reason the screen exists, so it holds
            nothing else: it used to sit beside account-wide hours and distance,
            which put a number about every bike next to a number about this one,
            under this bike's name and photo. */}
        {attentionCount === 0 ? (
          <View style={[styles.healthRow, styles.healthRowSingle]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.health.allGood.on}
              accessibilityElementsHidden
            />
            {/* Free tier cannot see the due-soon lookahead, so it must not
                claim the bike is ready, only that nothing is past due. */}
            <Text style={styles.readyText} accessibilityRole="header">
              {isPro ? 'Ready to ride' : 'Nothing past due'}
            </Text>
          </View>
        ) : !isPro ? (
          // Free tier gets the fact it can be given (what is past its interval,
          // by name, below) and sees exactly what Pro adds in the slot where it
          // would appear, rather than a withheld answer.
          <View style={styles.healthRow}>
            <HealthTile
              count={pastIntervalComponents.length}
              label="Past due"
              tone={colors.health.overdue}
            />
            <View style={styles.healthTile}>
              <ProChip />
              <Text style={styles.healthLabel}>Due soon</Text>
            </View>
          </View>
        ) : (
          <View style={styles.healthRow}>
            <HealthTile count={healthCounts.overdue} label="Overdue" tone={colors.health.overdue} />
            <HealthTile count={healthCounts.dueNow} label="Due now" tone={colors.health.dueNow} />
            <HealthTile
              count={healthCounts.dueSoon}
              label="Due soon"
              tone={colors.health.dueSoon}
            />
          </View>
        )}

        {/* The components behind the counts above, immediately below them.
            These used to sit under the paywall and the ride list, roughly a
            full screen from the number that summarizes them, so the count and
            its detail could not be read as one thought. */}
        {listedComponents.length > 0 && (
          <View style={styles.section}>
            {listedComponents.map((comp) => (
              <DashboardComponentCard
                key={comp.componentId}
                name={formatComponentType(comp.componentType)}
                installDate={undefined}
                currentHours={comp.currentHours}
                serviceIntervalHours={comp.serviceIntervalHours}
                // On free the status field is null, but every component in this
                // list is past its interval by the engine's own definition of
                // OVERDUE, so labelling it as such states a fact rather than
                // leaking the gated forecast.
                status={isPro ? (comp.status ?? 'UNKNOWN') : 'OVERDUE'}
                onPress={() => setSelectedPrediction(comp)}
              />
            ))}
          </View>
        )}

        {/* AI maintenance summary for the selected bike. Same gate as the
            bike-detail screen (Pro + non-empty components); the widget itself
            renders nothing when the bike is all-good or the advisor returns
            null, so the space just collapses. Re-queries when the selected
            bike changes. */}
        {isPro && activeBikeId && (selectedBike?.predictions?.components?.length ?? 0) > 0 && (
          <MaintenanceSummary bikeId={activeBikeId} />
        )}

        {/* Inspect Bike Button */}
        {activeBikeId && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/bike/${activeBikeId}` as Href)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Inspect ${displayName}`}
          >
            <Ionicons
              name="search-outline"
              size={22}
              color={colors.onPrimary}
              accessibilityElementsHidden
            />
            <Text style={styles.actionButtonText}>Inspect Bike</Text>
          </TouchableOpacity>
        )}

        {/* Names what Pro adds instead of what free lacks. The old copy opened
            with "Unlock", which this project's own tone rules ban, and claimed
            "all 23+ components", a number nothing on this screen substantiates.
            What is actually gated is the forecast: hours remaining, and the
            due-soon lookahead. */}
        {!isPro && (
          <View style={styles.upgradeBanner}>
            <UpgradePrompt message="Pro tells you how many hours each part has left, and flags what's coming due, so a wrench night beats a trailside fix." />
          </View>
        )}

        {/* Recent Rides — three most recent, with "See all" jumping to the
            rides tab for the full list. */}
        <RecentRidesList
          rides={recentRidesData?.rides ?? []}
          bikes={typedBikes}
          loading={recentRidesLoading && !recentRidesData}
          onSeeAll={() => router.push('/(tabs)/rides' as Href)}
          onRidePress={(ride) => router.push(`/ride/${ride.id}` as Href)}
          onConnectPress={() => router.push('/(tabs)/settings' as Href)}
          onAddRidePress={() => router.push('/ride/add' as Href)}
        />

        {/* The screen's one timeframe control, sitting directly above the only
            block it governs. It used to live at the top of the scroll, where it
            appeared to control the health row it does not touch, while a second
            control inside the stats card drove the same hook with a different
            default. */}
        <View style={styles.timeframeTabs}>
          {TIMEFRAME_OPTIONS.map(({ key, label }) => {
            const active = timeframe === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.timeframeTab, active && styles.timeframeTabActive]}
                onPress={() => {
                  // The numbers below change with no transition, so the tick is
                  // the only confirmation the tap registered.
                  selectionTick();
                  setTimeframe(key);
                }}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={TIMEFRAME_LABELS[key]}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.timeframeTabText, active && styles.timeframeTabTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <RideStatsCard
          stats={rideStats}
          loading={statsLoading}
          error={statsError}
          onRetry={refetchStats}
          timeframeLabel={TIMEFRAME_LABELS[timeframe]}
        />

      </ScrollView>

      {/* Bike Selector Sheet */}
      <BikeSelectorSheet
        visible={showBikeSelector}
        bikes={typedBikes}
        selectedBikeId={activeBikeId}
        onSelect={(bikeId) => {
          // Switching bikes rewrites the whole screen's meaning, and the sheet
          // dismisses over it, so the tick is what marks the change as yours.
          selectionTick();
          selectBike(bikeId);
        }}
        onAddBike={() => {
          setShowBikeSelector(false);
          router.push('/bike/add' as Href);
        }}
        onClose={() => setShowBikeSelector(false)}
      />

      {/* Component Action Sheet */}
      <ComponentActionSheet
        visible={!!selectedPrediction && !showLogService && !showReplace}
        prediction={selectedPrediction}
        onClose={() => setSelectedPrediction(null)}
        onLogService={() => setShowLogService(true)}
        onReplace={() => setShowReplace(true)}
        onActionComplete={() => refetchBikes()}
      />

      {/* Log Service Sheet */}
      <LogServiceSheet
        visible={showLogService}
        onClose={() => {
          setShowLogService(false);
          setSelectedPrediction(null);
        }}
        components={selectedBike?.components ?? []}
        preSelectedId={selectedPrediction?.componentId}
        onServiceLogged={() => refetchBikes()}
      />

      {/* Replace Component Sheet */}
      {selectedBike && (
        <ReplaceComponentSheet
          visible={showReplace}
          component={
            selectedPrediction
              ? selectedBike.components.find(
                  (c) => c.id === selectedPrediction.componentId
                ) ?? null
              : null
          }
          bikeId={selectedBike.id}
          spareComponents={spareComponents}
          onClose={() => {
            setShowReplace(false);
            setSelectedPrediction(null);
          }}
          onReplaced={() => {
            setShowReplace(false);
            setSelectedPrediction(null);
            refetchBikes();
          }}
        />
      )}

      {/* Calibration Sheet */}
      <CalibrationSheet
        visible={showCalibration}
        onClose={() => setShowCalibration(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    // Tighter than the gap between blocks: the header and the health row are
    // one thought (this bike, its state), so they sit closer to each other
    // than to anything below.
    paddingBottom: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // The whole row is the bike switcher, so it carries the 44pt floor rather
    // than relying on the text's own height.
    minHeight: 56,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bikeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bikeName: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  subtitle: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tierBadgePro: {
    backgroundColor: colors.primaryMuted,
  },
  tierBadgeFree: {
    backgroundColor: colors.surface,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tierBadgeTextPro: {
    color: colors.positiveOn,
  },
  tierBadgeTextFree: {
    color: colors.textSecondary,
  },
  upgradeBanner: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  timeframeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  timeframeTab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeframeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeframeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  timeframeTabTextActive: {
    color: colors.onPrimary,
  },
  healthRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  healthRowSingle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  readyText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.health.allGood.on,
  },
  healthTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 2,
  },
  healthCount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textMuted,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: colors.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  section: {
    paddingHorizontal: 16,
    // Tight to the health row above: the counts and the cards that explain
    // them are one group. The old "NEEDS ATTENTION" header is gone with it,
    // since the row directly above already names these three states.
    marginTop: 12,
  },
});
