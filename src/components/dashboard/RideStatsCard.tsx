import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ApolloError } from '@apollo/client';

import type { RideStats } from '../../hooks/useRideStats';
import { useDistanceUnit } from '../../hooks/useDistanceUnit';
import { useShareRideOverlay } from '../../hooks/useShareRideOverlay';
import { formatDuration, formatElevation } from '../../utils/greetingMessages';
import { ErrorState } from '../common/ErrorState';
import { describeError } from '../../utils/errorCopy';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';
import { colors, radius, space } from '../../constants/theme';

interface RideStatsCardProps {
  stats: RideStats;
  loading: boolean;
  error?: ApolloError;
  onRetry: () => void;
  /** Short label for the screen's single timeframe control, e.g. "YTD". */
  timeframeLabel: string;
}

/**
 * The dashboard's ride-metrics block: the totals that turn into component wear,
 * and nothing else.
 *
 * This used to be an 850-line, six-section accordion carrying streaks, personal
 * records, heart rate, top locations and a weather breakdown. Those are real
 * features, but they answer "how have I been riding" on a screen whose job is
 * "what does my bike need", and they made the gear screen end in a weather
 * grid. They now live at /ride-insights, reachable from the Rides tab, and this
 * block keeps the two things that feed gear: timeframe totals, and hours per
 * bike.
 *
 * Timeframe is a prop, not internal state. The screen owns one control; this
 * card used to carry a second one with a different default, so the dashboard
 * showed two different answers to "my hours" on one scroll.
 */
export function RideStatsCard({
  stats,
  loading,
  error,
  onRetry,
  timeframeLabel,
}: RideStatsCardProps) {
  const router = useRouter();
  const { formatDistance, distanceUnit } = useDistanceUnit();
  // shareSurface is a JSX VALUE (rendered inline below as `{shareSurface}`),
  // not a component. See comment in useShareRideOverlay — returning JSX as
  // a component-from-useCallback re-mounts the off-screen capture node on
  // every state change, which corrupts the captureRef snapshot.
  const { sharing, openShareSheet, shareSurface } = useShareRideOverlay();

  const handleShare = () => {
    openShareSheet({
      title: `${timeframeLabel} · all bikes`,
      distance: formatDistance(stats.totalDistance),
      elevation: formatElevation(stats.totalElevation, distanceUnit),
      duration: formatDuration(Math.round(stats.totalHours * 3600)),
      averageHr: stats.ridesWithHr > 0 && stats.averageHr ? `${stats.averageHr} bpm` : null,
    });
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (loading && stats.totalRides === 0) {
    // Placeholders in the shape of the metrics that are coming, rather than the
    // words "Loading your riding...". Raw loading text was the one spot on this
    // screen still telling the rider to wait instead of showing them the shape
    // of the answer.
    return (
      <SkeletonGroup label="Loading your riding totals" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Skeleton width={92} height={12} />
            <Skeleton width={120} height={12} style={styles.captionSkeleton} />
          </View>
        </View>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.metric}>
              <Skeleton width={52} height={20} />
              <Skeleton width={38} height={11} style={styles.metricLabelSkeleton} />
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  }

  // A failed read used to collapse into the same nothing as "no rides yet",
  // which quietly tells a rider with 400 rides that they have none.
  if (error && stats.totalRides === 0) {
    return (
      <View style={styles.errorWrap}>
        <ErrorState variant="card" {...describeError(error, 'ride stats')} onRetry={onRetry} />
      </View>
    );
  }

  // Genuinely no rides. Collapsing is correct: the recent-rides block above
  // already owns the "connect a data source" story, and repeating it here
  // would be the same ask twice on one screen.
  if (stats.totalRides === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Your riding</Text>
            {/* The scope caption. These totals are every bike on the account,
                sitting on a screen that is otherwise about one selected bike,
                and an uncaptioned number here reads as that bike's hours. */}
            <Text style={styles.caption}>All bikes · {timeframeLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            style={styles.shareButton}
            accessibilityRole="button"
            accessibilityLabel="Share these totals"
            accessibilityState={{ disabled: sharing }}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <Metric value={String(stats.totalRides)} label="Rides" />
          <Metric value={formatHours(stats.totalHours)} label="Time" />
          <Metric value={formatDistance(stats.totalDistance)} label="Distance" />
          <Metric value={formatElevation(stats.totalElevation, distanceUnit)} label="Climbing" />
        </View>

        {/* Hours per bike is the one breakdown a gear screen earns: it is the
            input the wear predictions are built from. */}
        {stats.bikeTime.length > 1 && (
          <View style={styles.bikes}>
            {stats.bikeTime.map((bike) => (
              <View key={bike.name} style={styles.bikeRow}>
                <View style={styles.bikeInfo}>
                  <Text style={styles.bikeName} numberOfLines={1}>
                    {bike.name}
                  </Text>
                  <View style={styles.bikeTrack}>
                    <View style={[styles.bikeBar, { width: `${bike.percentage}%` }]} />
                  </View>
                </View>
                <Text style={styles.bikeHours}>{bike.hours}h</Text>
              </View>
            ))}
          </View>
        )}

        {stats.truncated && (
          <Text style={styles.note}>Based on your most recent 500 rides.</Text>
        )}

        <TouchableOpacity
          style={styles.insightsLink}
          onPress={() => router.push('/ride-insights' as Href)}
          accessibilityRole="button"
          accessibilityLabel="See riding insights"
        >
          <Text style={styles.insightsText}>Streaks, records and more</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Share overlay surface: sibling of the card (NOT a child) so it escapes
          the card's `overflow: 'hidden'` clip. The off-screen RideShareCard is
          absolutely positioned at left: -10000, and on Android overflow:hidden
          can suppress render of children outside the parent's clip rect, which
          would make captureRef snapshot an empty view in production builds. */}
      {shareSurface}
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    marginHorizontal: space.xl,
    marginTop: space.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: space.xl,
    marginTop: space.xl,
    padding: space.xl,
    gap: space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.lg,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: space.hair,
  },
  shareButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.xl,
  },
  metric: {
    // Two per row at large Dynamic Type, four when there is room.
    minWidth: 80,
    flexGrow: 1,
    flexBasis: '25%',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: colors.textSecondary,
    marginTop: space.hair,
  },
  captionSkeleton: {
    marginTop: space.hair,
  },
  metricLabelSkeleton: {
    marginTop: space.hair,
  },
  bikes: {
    gap: space.lg,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  bikeInfo: {
    flex: 1,
    minWidth: 0,
    gap: space.sm,
  },
  bikeName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bikeTrack: {
    height: space.sm,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bikeBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  bikeHours: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  insightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: space.lg,
  },
  insightsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
