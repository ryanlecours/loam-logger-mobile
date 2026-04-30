import { ScrollView, View, Text, Image, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { useRideStats, type TimeframeOption } from '../../src/hooks/useRideStats';
import {
  BikeFieldsFragment,
  ComponentPrediction,
  useCalibrationStateQuery,
  useRecentRidesQuery,
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
import { useUserTier } from '../../src/hooks/useUserTier';
import { UpgradePrompt } from '../../src/components/common/UpgradePrompt';
import { FREE_LIGHT_COMPONENT_TYPES } from '../../src/constants/tiers';
import { colors } from '../../src/constants/theme';

const TIMEFRAME_OPTIONS: { key: TimeframeOption; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'YTD', label: 'YTD' },
];

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isPro, isFreeLight, isFoundingRider } = useUserTier();
  const { distanceUnit } = useDistanceUnit();
  const {
    bikes,
    spareComponents,
    loading: bikesLoading,
    refetch: refetchBikes,
  } = useBikesWithPredictions();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [showBikeSelector, setShowBikeSelector] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('YTD');
  const [selectedPrediction, setSelectedPrediction] = useState<ComponentPrediction | null>(null);
  const [showLogService, setShowLogService] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const { data: calibrationData } = useCalibrationStateQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Three most recent rides for the dashboard preview. The "See all" button
  // jumps to the rides tab, which renders the full paginated list. Sharing
  // this query name (`RecentRides`) with refetchQueries elsewhere (e.g.
  // pickBike on ride detail) means assignment changes propagate here too.
  const {
    data: recentRidesData,
    loading: recentRidesLoading,
    refetch: refetchRecentRides,
  } = useRecentRidesQuery({
    variables: { take: 3 },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (calibrationData?.calibrationState?.showOverlay) {
      setShowCalibration(true);
    }
  }, [calibrationData]);

  const { stats: rideStats, refetch: refetchStats } = useRideStats(timeframe);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBikes(), refetchStats(), refetchRecentRides()]);
    setRefreshing(false);
  }, [refetchBikes, refetchStats, refetchRecentRides]);

  const typedBikes = bikes as BikeFieldsFragment[];

  // Select first bike by default
  const activeBikeId = selectedBikeId || typedBikes[0]?.id || null;
  const selectedBike = typedBikes.find((b) => b.id === activeBikeId) || null;

  // Attention count from bike predictions
  const attentionCount = useMemo(() => {
    if (!selectedBike?.predictions) return 0;
    return (selectedBike.predictions.dueNowCount || 0) + (selectedBike.predictions.dueSoonCount || 0);
  }, [selectedBike]);

  // Get components needing attention
  const attentionComponents = useMemo(() => {
    if (!selectedBike?.predictions?.components) return [];
    return selectedBike.predictions.components.filter(
      (p) => p.status === 'DUE_NOW' || p.status === 'DUE_SOON' || p.status === 'OVERDUE'
    );
  }, [selectedBike]);

  const hasRestrictedComponents = useMemo(() => {
    if (!isFreeLight || !selectedBike?.predictions?.components) return false;
    return selectedBike.predictions.components.some(
      (p) => !(FREE_LIGHT_COMPONENT_TYPES as readonly string[]).includes(p.componentType)
    );
  }, [isFreeLight, selectedBike]);

  const displayName = selectedBike
    ? selectedBike.nickname || `${selectedBike.manufacturer} ${selectedBike.model}`
    : 'No Bike Selected';

  if (bikesLoading && !bikes.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (typedBikes.length === 0) {
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
            tintColor={colors.primary}
          />
        }
      >
        {/* Bike Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.bikeNameRow}
            onPress={() => setShowBikeSelector(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.bikeName}>{displayName}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>
              {typedBikes.length > 1
                ? `${typedBikes.length} bikes  ·  Component Wear Tracker`
                : 'Component Wear Tracker'}
            </Text>
            <View style={[styles.tierBadge, isPro ? styles.tierBadgePro : styles.tierBadgeFree]}>
              <Text style={[styles.tierBadgeText, isPro ? styles.tierBadgeTextPro : styles.tierBadgeTextFree]}>
                {isFoundingRider ? 'Founding Rider' : isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bike Image */}
        {selectedBike?.thumbnailUrl && (
          <View style={styles.bikeImageContainer}>
            <Image
              source={{ uri: selectedBike.thumbnailUrl }}
              style={styles.bikeImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Timeframe Tabs */}
        <View style={styles.timeframeTabs}>
          {TIMEFRAME_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.timeframeTab,
                timeframe === key && styles.timeframeTabActive,
              ]}
              onPress={() => setTimeframe(key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeframeTabText,
                  timeframe === key && styles.timeframeTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>{rideStats.totalHours.toFixed(1)}</Text>
            <Text style={styles.statLabel}>HRS</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>
              {distanceUnit === 'km'
                ? Math.round(rideStats.totalDistance / 1000).toLocaleString()
                : Math.round(rideStats.totalDistance / 1609.344).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>{distanceUnit === 'km' ? 'KM' : 'MI'}</Text>
          </View>
          <View style={styles.statCard}>
            {attentionCount === 0 ? (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.good} />
                <Text style={[styles.statValue, { fontSize: 15 }]}>Ready to</Text>
                <Text style={[styles.statLabel, { color: colors.good }]}>RIDE</Text>
              </>
            ) : (
              <>
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={styles.statValue}>{attentionCount}</Text>
                <Text style={styles.statLabel}>NEED ATTENTION</Text>
              </>
            )}
          </View>
        </View>

        {/* Inspect Bike Button */}
        {activeBikeId && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/bike/${activeBikeId}` as Href)}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.actionButtonText}>Inspect Bike</Text>
          </TouchableOpacity>
        )}

        {/* Recent Rides — three most recent, with "See all" jumping to the
            rides tab for the full list. */}
        <RecentRidesList
          rides={recentRidesData?.rides ?? []}
          bikes={typedBikes}
          loading={recentRidesLoading && !recentRidesData}
          onSeeAll={() => router.push('/(tabs)/rides' as Href)}
          onRidePress={(ride) => router.push(`/ride/${ride.id}` as Href)}
        />

        {/* Needs Attention Section */}
        {attentionComponents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={16} color={colors.monitor} />
              <Text style={styles.sectionTitle}>NEEDS ATTENTION</Text>
            </View>
            {attentionComponents.map((comp) => (
              <DashboardComponentCard
                key={comp.componentId}
                name={formatComponentType(comp.componentType)}
                installDate={undefined}
                currentHours={comp.currentHours}
                serviceIntervalHours={comp.serviceIntervalHours}
                status={comp.status}
                onPress={() => setSelectedPrediction(comp)}
              />
            ))}
          </View>
        )}

        {/* Upgrade banner for free users with restricted components */}
        {hasRestrictedComponents && (
          <View style={styles.upgradeBanner}>
            <UpgradePrompt
              message="You're only tracking 4 component types. Upgrade to Pro or refer a friend to unlock all 23+ components."
            />
          </View>
        )}

        {/* Ride Stats */}
        <RideStatsCard />

      </ScrollView>

      {/* Bike Selector Sheet */}
      <BikeSelectorSheet
        visible={showBikeSelector}
        bikes={typedBikes}
        selectedBikeId={activeBikeId}
        onSelect={setSelectedBikeId}
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
    paddingBottom: 16,
  },
  bikeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bikeName: {
    fontSize: 26,
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    color: colors.primary,
  },
  tierBadgeTextFree: {
    color: colors.textMuted,
  },
  upgradeBanner: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bikeImageContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  bikeImage: {
    width: '100%',
    height: 160,
  },
  timeframeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  timeframeTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
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
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
