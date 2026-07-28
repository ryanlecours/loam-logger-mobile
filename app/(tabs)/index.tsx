import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBikeTriage } from '../../src/hooks/useBikeTriage';
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
  BikeTriageGroup,
  ComponentActionSheet,
  RecentRidesList,
  RideStatsCard,
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
 * The dashboard triages; the Gear tab inventories.
 *
 * It answers one question: is the bike I want to ride good to go, or what needs
 * doing? So it lists only bikes that need work, names the components, and
 * collapses everything healthy into a single line. Managing what you own lives
 * in Gear, and duplicating that list here would just be a second inventory.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { isPro } = useUserTier();
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

  useEffect(() => {
    if (calibrationData?.calibrationState?.showOverlay) {
      setShowCalibration(true);
    }
  }, [calibrationData]);

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
    await Promise.allSettled([refetchBikes(), refetchStats(), refetchRecentRides()]);
    setRefreshing(false);
  }, [refetchBikes, refetchStats, refetchRecentRides]);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    await Promise.allSettled([refetchBikes(), refetchStats(), refetchRecentRides()]);
    setRetrying(false);
  }, [refetchBikes, refetchStats, refetchRecentRides]);

  if (bikesLoading && totalBikes === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // Stale cached bikes beat an error screen, so this only takes over when the
  // failure left nothing to show.
  if (bikesError && totalBikes === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState {...describeError(bikesError, 'gear')} onRetry={onRetry} retrying={retrying} />
      </SafeAreaView>
    );
  }

  if (!bikesError && !bikesLoading && totalBikes === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyBikeState />
      </SafeAreaView>
    );
  }

  const single = totalBikes === 1;
  const attentionCount = needsAttention.length;
  const topBike = needsAttention[0]?.bike ?? null;
  const headline = dashboardHeadline({
    attentionCount,
    healthyCount: healthy.length,
    untrackedCount: untracked.length,
    totalBikes,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

            {needsAttention.map(({ bike, components }) => (
              <BikeTriageGroup
                key={bike.id}
                bike={bike}
                components={components}
                showStatus={isPro}
                showBikeName={!single}
                onComponentPress={(prediction) => setSelected({ prediction, bike })}
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

        {/* Advisor prose for the bike at the top of the list only. It is a
            per-bike query, and firing one per bike on a triage screen would
            trade the rider's data plan for prose they did not ask for. */}
        {isPro && topBike && <MaintenanceSummary bikeId={topBike.id} />}

        {!isPro && (
          <View style={styles.upgradeBanner}>
            <UpgradePrompt message="Pro tells you how many hours each part has left, and flags what's coming due, so a wrench night beats a trailside fix." />
          </View>
        )}

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
    paddingBottom: space.xxxl,
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
