import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/common/Screen';
import { useBikeTriage } from '../../src/hooks/useBikeTriage';
import { useRideStats, type TimeframeOption } from '../../src/hooks/useRideStats';
import {
  BikeFieldsFragment,
  ComponentPrediction,
  useCalibrationStateQuery,
  useMeQuery,
  useRidesPageQuery,
  useUnassignedRideCountQuery,
} from '../../src/graphql/generated';
import {
  DashboardSkeleton,
  EmptyBikeState,
  BikeTriageGroup,
  ComponentActionSheet,
  RecentRidesList,
  RideStatsCard,
  UnassignedRidesBanner,
} from '../../src/components/dashboard';
import { LogServiceSheet } from '../../src/components/gear/LogServiceSheet';
import { ReplaceComponentSheet } from '../../src/components/gear/ReplaceComponentSheet';
import { CalibrationSheet } from '../../src/components/calibration/CalibrationSheet';
import { MaintenanceSummary } from '../../src/components/bike/MaintenanceSummary';
import { UpgradePrompt } from '../../src/components/common/UpgradePrompt';
import { ErrorState } from '../../src/components/common/ErrorState';
import { Skeleton, SkeletonGroup } from '../../src/components/common/Skeleton';
import { useUserTier } from '../../src/hooks/useUserTier';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { usePendingRides } from '../../src/hooks/usePendingRides';
import { PendingRideCard } from '../../src/components/rides';
import { colors, radius, space, type } from '../../src/constants/theme';
import { describeError } from '../../src/utils/errorCopy';
import { dashboardHeadline } from '../../src/utils/dashboardHeadline';
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

/** "Hightower, Chameleon and Stumpjumper" */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const nameOf = (b: BikeFieldsFragment) => b.nickname || `${b.manufacturer} ${b.model}`;

/**
 * The wordmark, and this screen's title.
 *
 * Sage and bold, matching the sign-in screen's treatment, so the brand reads
 * the same way in the two places the app names itself. Left-aligned on the same
 * 16pt gutter as every other block here, and one step larger than the Gear
 * tab's "My Bikes" because this is the app's front door rather than a section
 * label. Tracking tightens as the type grows, per DESIGN.md's Trail Marker
 * Rule.
 *
 * Rendered in all four of this screen's states, including loading and error,
 * so the title does not pop in once data arrives. It scrolls with the content
 * rather than pinning: the triage list is what the rider came for, and a fixed
 * bar would spend permanent vertical space on a name they already know.
 */
function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <Text style={styles.brandTitle} accessibilityRole="header">
        Loam Logger
      </Text>
    </View>
  );
}

/**
 * The dashboard triages; the Gear tab inventories.
 *
 * It answers one question: is the bike I want to ride good to go, or what needs
 * doing? So it lists only bikes that need work, and collapses everything
 * healthy into a single line. Managing what you own lives in Gear, and
 * duplicating that list here would just be a second inventory.
 *
 * Each bike that needs work is one collapsed row carrying its photo, its worst
 * state by name, and a count. Naming the components inline for every bike put
 * a rider with five bikes in front of eleven near-identical rows they could
 * not tell apart, which is triage in name only. The photo comes from Gear so
 * the two tabs agree on what a bike looks like; the parts are one tap away.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { isPro } = useUserTier();
  // AI is opt-in (off by default): the server nulls advisorSummary for
  // non-opted riders, but skipping the render here also skips the per-bike
  // query and its skeleton.
  const { data: meData } = useMeQuery({ fetchPolicy: 'cache-first' });
  const aiFeaturesEnabled = meData?.me?.aiFeaturesEnabled ?? false;
  const {
    needsAttention,
    healthy,
    untracked,
    totalBikes,
    loading: bikesLoading,
    error: bikesError,
    predictionsReady,
    predictionsError,
    refetch: refetchBikes,
  } = useBikeTriage();
  const { spareComponents } = useBikesWithPredictions();

  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('YTD');
  // Which bikes are showing their component rows. Lives here rather than in
  // BikeTriageGroup so it survives Apollo re-renders and remounts, and so the
  // screen can seed it below.
  const [expandedBikes, setExpandedBikes] = useState<Record<string, boolean>>({});
  // The bike travels with the prediction: with every bike on screen, a tapped
  // component no longer belongs to whichever bike happened to be selected.
  const [selected, setSelected] = useState<{
    prediction: ComponentPrediction;
    bike: BikeFieldsFragment;
  } | null>(null);
  const [showLogService, setShowLogService] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const { data: calibrationData } = useCalibrationStateQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Three most recent rides for the preview. Same `RidesPage` query as the
  // rides tab with a smaller `take`, so the row shape matches `RideListItem`
  // exactly and `refetchQueries: ['RidesPage']` from anywhere refreshes both.
  const {
    data: recentRidesData,
    loading: recentRidesLoading,
    error: recentRidesError,
    refetch: refetchRecentRides,
  } = useRidesPageQuery({
    variables: { take: 3 },
    fetchPolicy: 'cache-and-network',
  });

  // Counted server-side across the whole history rather than derived from the
  // three rides above: a rider can have dozens of unassigned rides sitting
  // outside the preview window, and each one's hours are credited to no
  // component until a bike is picked.
  const { data: unassignedData, refetch: refetchUnassigned } = useUnassignedRideCountQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Rides logged offline, waiting in the outbox to upload.
  const { pendingRides } = usePendingRides();

  useEffect(() => {
    if (calibrationData?.calibrationState?.showOverlay) {
      setShowCalibration(true);
    }
  }, [calibrationData]);

  // The bike at the top of the list arrives open. The advisor summary is the
  // screen's only prose and it now hangs inside that bike's group, so shipping
  // every group collapsed would put a Pro feature behind a tap nobody knows to
  // make. One open group still trades a wall of rows for a column of photos.
  //
  // Keyed on presence rather than truthiness: a rider who collapses the top
  // bike must not have it reopened by the next refetch.
  useEffect(() => {
    const topBikeId = needsAttention[0]?.bike.id;
    if (!topBikeId) return;
    setExpandedBikes((prev) => (topBikeId in prev ? prev : { ...prev, [topBikeId]: true }));
  }, [needsAttention]);

  const {
    stats: rideStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useRideStats(timeframe);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // A failing refetch must not strand the spinner. Each read owns its own
    // error surface, so swallowing here is safe.
    await Promise.allSettled([
      refetchBikes(),
      refetchStats(),
      refetchRecentRides(),
      refetchUnassigned(),
    ]);
    setRefreshing(false);
  }, [refetchBikes, refetchStats, refetchRecentRides, refetchUnassigned]);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    await Promise.allSettled([
      refetchBikes(),
      refetchStats(),
      refetchRecentRides(),
      refetchUnassigned(),
    ]);
    setRetrying(false);
  }, [refetchBikes, refetchStats, refetchRecentRides, refetchUnassigned]);

  if (bikesLoading && totalBikes === 0) {
    return (
      <Screen edges={['top']}>
        <BrandHeader />
        <DashboardSkeleton />
      </Screen>
    );
  }

  // Stale cached bikes beat an error screen, so this only takes over when the
  // failure left nothing to show.
  if (bikesError && totalBikes === 0) {
    return (
      <Screen edges={['top']}>
        <BrandHeader />
        <ErrorState {...describeError(bikesError, 'gear')} onRetry={onRetry} retrying={retrying} />
      </Screen>
    );
  }

  if (!bikesError && !bikesLoading && totalBikes === 0) {
    return (
      <Screen edges={['top']}>
        <BrandHeader />
        <EmptyBikeState />
      </Screen>
    );
  }

  const attentionCount = needsAttention.length;
  const headline = dashboardHeadline({
    attentionCount,
    healthyCount: healthy.length,
    untrackedCount: untracked.length,
    totalBikes,
  });

  return (
    // Top edge only: the tab bar already sits above the home indicator.
    <Screen edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // tintColor is iOS-only; without `colors` Android draws a stock
            // blue spinner on an obsidian background.
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <BrandHeader />

        {/* Predictions are the whole answer, and the light query carries none of
            them. Until phase 2 lands there is nothing to say, so this must read
            as waiting rather than as a clean bill of health. Rendering the
            all-clear from an empty array is the bug this ordering exists to
            prevent. */}
        {!predictionsReady && !predictionsError && (
          <SkeletonGroup label="Checking your bikes" style={styles.headlineBlock}>
            <Skeleton width="70%" height={20} />
            <Skeleton width="45%" height={14} style={styles.headlineSkeletonLine} />
          </SkeletonGroup>
        )}

        {/* Bikes loaded, service state did not. Saying nothing here would read
            as "all good" for a question that was never answered. */}
        {!predictionsReady && predictionsError && (
          <View style={styles.headlineBlock}>
            <ErrorState
              variant="card"
              {...describeError(predictionsError, 'service status')}
              onRetry={onRetry}
              retrying={retrying}
            />
          </View>
        )}

        {predictionsReady && (
          <>
            <View style={styles.headlineBlock}>
              <Text
                style={headline.tone === 'good' ? styles.headlineGood : styles.headline}
                accessibilityRole="header"
              >
                {headline.text}
              </Text>
            </View>

            {needsAttention.map(({ bike, components }, index) => (
              <BikeTriageGroup
                key={bike.id}
                bike={bike}
                components={components}
                showStatus={isPro}
                expanded={!!expandedBikes[bike.id]}
                onToggle={() =>
                  setExpandedBikes((prev) => ({ ...prev, [bike.id]: !prev[bike.id] }))
                }
                onComponentPress={(prediction) => setSelected({ prediction, bike })}
                // Advisor prose for the bike at the top of the list only. It is
                // a per-bike query, and firing one per bike on a triage screen
                // would trade the rider's data plan for prose they did not ask
                // for. Rendering it inside the group is what tells the rider
                // which bike it is about.
                footer={
                  index === 0 && isPro && aiFeaturesEnabled ? (
                    <MaintenanceSummary bikeId={bike.id} variant="inset" />
                  ) : null
                }
              />
            ))}

            {/* Healthy bikes are a reassurance, not a list. One line, and it
                links into Gear rather than repeating Gear here. Skipped only
                when the headline already reads "All N bikes are good to go",
                which happens exactly when every bike is in this bucket. */}
            {headline.tone !== 'good' && healthy.length > 0 && (
              <TouchableOpacity
                style={styles.goodRow}
                onPress={() => router.push('/(tabs)/gear' as Href)}
                accessibilityRole="button"
                accessibilityLabel={`${listNames(healthy.map(nameOf))} good to go. Open gear.`}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={colors.health.allGood.on}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.goodText} numberOfLines={2}>
                  {listNames(healthy.map(nameOf))} good to go
                </Text>
              </TouchableOpacity>
            )}

            {/* A frameset with nothing tracked is not healthy; it is unknown,
                and saying "good to go" about it would be a guess. */}
            {untracked.length > 0 && (
              <TouchableOpacity
                style={styles.goodRow}
                onPress={() => router.push('/(tabs)/gear' as Href)}
                accessibilityRole="button"
                accessibilityLabel={`No components tracked on ${listNames(untracked.map(nameOf))}. Open gear to add them.`}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={colors.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.untrackedText} numberOfLines={2}>
                  No components tracked on {listNames(untracked.map(nameOf))}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!isPro && (
          <View style={styles.upgradeBanner}>
            <UpgradePrompt message="Pro tells you how many hours each part has left, and flags what's coming due, so a wrench night beats a trailside fix." />
          </View>
        )}

        {/* Above the rides list, not inside it: the count spans the rider's
            whole history while the list below shows three. */}
        <UnassignedRidesBanner
          count={unassignedData?.unassignedRideCount ?? 0}
          onPress={() => router.push('/(tabs)/rides?unassigned=1' as Href)}
        />

        {/* Rides logged without signal, still on this phone only. Above the
            recent list so the ride the rider just logged at the trailhead is
            the first thing they see, not silently absent. */}
        {pendingRides.map((pendingRide) => (
          <PendingRideCard key={pendingRide.id} pendingRide={pendingRide} />
        ))}

        <RecentRidesList
          rides={recentRidesData?.rides ?? []}
          bikes={needsAttention.map((t) => t.bike).concat(healthy, untracked)}
          loading={recentRidesLoading && !recentRidesData}
          error={recentRidesError}
          onRetry={onRetry}
          onSeeAll={() => router.push('/(tabs)/rides' as Href)}
          onRidePress={(ride) => router.push(`/ride/${ride.id}` as Href)}
          onConnectPress={() => router.push('/(tabs)/settings' as Href)}
          onAddRidePress={() => router.push('/ride/add' as Href)}
        />

        {/* One timeframe control, directly above the only block it governs. */}
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
                <Text style={[styles.timeframeTabText, active && styles.timeframeTabTextActive]}>
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

      <ComponentActionSheet
        visible={!!selected && !showLogService && !showReplace}
        prediction={selected?.prediction ?? null}
        onClose={() => setSelected(null)}
        onLogService={() => setShowLogService(true)}
        onReplace={() => setShowReplace(true)}
        onActionComplete={() => refetchBikes()}
      />

      <LogServiceSheet
        visible={showLogService}
        onClose={() => {
          setShowLogService(false);
          setSelected(null);
        }}
        components={selected?.bike.components ?? []}
        preSelectedId={selected?.prediction.componentId}
        onServiceLogged={() => refetchBikes()}
      />

      {selected && (
        <ReplaceComponentSheet
          visible={showReplace}
          component={
            selected.bike.components.find((c) => c.id === selected.prediction.componentId) ?? null
          }
          bikeId={selected.bike.id}
          spareComponents={spareComponents}
          onClose={() => {
            setShowReplace(false);
            setSelected(null);
          }}
          onReplaced={() => {
            setShowReplace(false);
            setSelected(null);
            refetchBikes();
          }}
        />
      )}

      <CalibrationSheet visible={showCalibration} onClose={() => setShowCalibration(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: space.xxxl,
  },
  brandHeader: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.primary,
  },
  headlineBlock: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  headline: {
    ...type.title,
    color: colors.textPrimary,
  },
  headlineGood: {
    ...type.title,
    color: colors.health.allGood.on,
  },
  headlineSkeletonLine: {
    marginTop: space.md,
  },
  goodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    marginHorizontal: space.xl,
    marginTop: space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  goodText: {
    flex: 1,
    ...type.footnote,
    color: colors.health.allGood.on,
  },
  untrackedText: {
    flex: 1,
    ...type.footnote,
    color: colors.textSecondary,
  },
  upgradeBanner: {
    paddingHorizontal: space.xl,
    marginTop: space.xl,
  },
  timeframeTabs: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    gap: space.md,
    marginTop: space.section,
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
    ...type.captionStrong,
    color: colors.textSecondary,
  },
  timeframeTabTextActive: {
    color: colors.onPrimary,
  },
});
