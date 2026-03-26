import { ScrollView, View, Text, Image, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { useRideStats, type TimeframeOption } from '../../src/hooks/useRideStats';
import {
  BikeFieldsFragment,
} from '../../src/graphql/generated';
import {
  DashboardSkeleton,
  EmptyBikeState,
  BikeSelectorSheet,
  DashboardComponentCard,
} from '../../src/components/dashboard';
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
  const { user } = useAuth();
  const { distanceUnit } = useDistanceUnit();
  const {
    bikes,
    loading: bikesLoading,
    hasPredictions,
    refetch: refetchBikes,
  } = useBikesWithPredictions();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [showBikeSelector, setShowBikeSelector] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('YTD');

  const { stats: rideStats, refetch: refetchStats } = useRideStats(timeframe);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBikes(), refetchStats()]);
    setRefreshing(false);
  }, [refetchBikes, refetchStats]);

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

  const displayName = selectedBike
    ? selectedBike.nickname || `${selectedBike.manufacturer} ${selectedBike.model}`
    : 'No Bike Selected';

  const handleBikePress = (bikeId: string) => {
    router.push(`/bike/${bikeId}` as Href);
  };

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
          <Text style={styles.subtitle}>
            {typedBikes.length > 1
              ? `${typedBikes.length} bikes  ·  Component Wear Tracker`
              : 'Component Wear Tracker'}
          </Text>
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

        {/* Log Ride Button */}
        <TouchableOpacity
          style={styles.logRideButton}
          onPress={() => router.push('/ride/add' as Href)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textPrimary} />
          <Text style={styles.logRideText}>Log Ride</Text>
        </TouchableOpacity>

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
                onReset={() => {}}
              />
            ))}
          </View>
        )}

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
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
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
  logRideButton: {
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
  logRideText: {
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
