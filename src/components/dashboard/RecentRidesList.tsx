import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsFragment } from '../../graphql/generated';
import { RideListItem } from '../rides/RideListItem';
import type { RideItem } from '../../hooks/useRidesPaginated';
import type { ApolloError } from '@apollo/client';
import { colors, radius, space, type } from '../../constants/theme';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';
import { ErrorState } from '../common/ErrorState';
import { describeError } from '../../utils/errorCopy';

// Reuse the rides-tab row shape so the dashboard preview renders with the
// same RideListItem component. Single source of truth means visual changes
// to the rides tab automatically propagate to the dashboard preview, and
// the Garmin-notes-as-title behavior at the row level applies in both
// places without per-screen branching.
type Ride = RideItem;

interface RecentRidesListProps {
  rides: Ride[];
  bikes: BikeFieldsFragment[];
  loading?: boolean;
  /** A failed read must not collapse into "no rides yet". */
  error?: ApolloError;
  onRetry?: () => void;
  onSeeAll?: () => void;
  onRidePress?: (ride: Ride) => void;
  onConnectPress?: () => void;
  onRecordPress?: () => void;
  onAddRidePress?: () => void;
  /** A session is already running, so the record action returns to it. */
  recorderLive?: boolean;
}

export function RecentRidesList({
  rides,
  bikes,
  loading,
  error,
  onRetry,
  onSeeAll,
  onRidePress,
  onConnectPress,
  onRecordPress,
  onAddRidePress,
  recorderLive = false,
}: RecentRidesListProps) {
  const getBikeName = (bikeId: string | null | undefined): string | undefined => {
    if (!bikeId) return undefined;
    const bike = bikes.find((b) => b.id === bikeId);
    if (!bike) return undefined;
    return bike.nickname || `${bike.manufacturer} ${bike.model}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>RECENT RIDES</Text>
        </View>
        <SkeletonGroup label="Loading your recent rides" style={styles.card}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={36} height={36} />
              <View style={styles.skeletonContent}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </SkeletonGroup>
      </View>
    );
  }

  // Before the empty state, not after it. A failed read rendering as "No rides
  // yet, connect a data source" tells a rider with 400 rides to go connect an
  // account they already connected.
  if (error && rides.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            RECENT RIDES
          </Text>
        </View>
        <View style={styles.errorWrap}>
          <ErrorState variant="card" {...describeError(error, 'rides')} onRetry={onRetry} />
        </View>
      </View>
    );
  }

  if (rides.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>RECENT RIDES</Text>
        </View>
        <View style={styles.emptyCard}>
          <Ionicons name="bicycle-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No rides yet</Text>
          <Text style={styles.emptySubtext}>
            Connect Strava, Garmin, WHOOP, or Suunto to import past rides, or
            record your next one right here.
          </Text>
          {onConnectPress && (
            <TouchableOpacity
              style={styles.emptyPrimaryButton}
              onPress={onConnectPress}
              accessibilityRole="button"
              accessibilityLabel="Connect a data source"
            >
              <Ionicons
                name="link-outline"
                size={16}
                color={colors.onPrimary}
                accessibilityElementsHidden
              />
              <Text style={styles.emptyPrimaryButtonText}>Connect a data source</Text>
            </TouchableOpacity>
          )}
          {onRecordPress && (
            <TouchableOpacity
              style={styles.emptyRecordButton}
              onPress={onRecordPress}
              accessibilityRole="button"
              accessibilityLabel={recorderLive ? 'Back to your ride in progress' : 'Record a ride'}
            >
              <Ionicons
                name={recorderLive ? 'radio-button-on' : 'play'}
                size={16}
                color={colors.primary}
                accessibilityElementsHidden
              />
              <Text style={styles.emptyRecordButtonText}>
                {recorderLive ? 'Back to your ride' : 'Record a ride'}
              </Text>
            </TouchableOpacity>
          )}
          {onAddRidePress && (
            <TouchableOpacity
              style={styles.emptySecondaryButton}
              onPress={onAddRidePress}
              accessibilityRole="button"
              accessibilityLabel="Log a ride manually"
            >
              <Text style={styles.emptySecondaryButtonText}>Log a ride manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          RECENT RIDES
        </Text>
        <View style={styles.headerActions}>
          {/* Recording used to live only behind the Rides tab's FAB, inside an
              alert offering two choices, which is three taps and a guess away
              from the screen riders open first. It sits in the header rather
              than as a floating button because the dashboard scrolls and its
              subject is the bike, not the ride. */}
          {onRecordPress && (
            <TouchableOpacity
              onPress={onRecordPress}
              style={styles.headerAction}
              accessibilityRole="button"
              accessibilityLabel={recorderLive ? 'Back to your ride in progress' : 'Record a ride'}
            >
              <Ionicons
                name={recorderLive ? 'radio-button-on' : 'play'}
                size={14}
                color={colors.primary}
                accessibilityElementsHidden
              />
              <Text style={styles.headerActionText}>
                {recorderLive ? 'Back to ride' : 'Record'}
              </Text>
            </TouchableOpacity>
          )}
          {onSeeAll && (
            <TouchableOpacity
              onPress={onSeeAll}
              style={styles.seeAllButton}
              accessibilityRole="button"
              // "See all" alone is meaningless out of context, which is exactly
              // how a screen reader encounters it.
              accessibilityLabel="See all rides"
            >
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primary}
                accessibilityElementsHidden
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.card}>
        {rides.map((ride) => (
          <RideListItem
            key={ride.id}
            ride={ride}
            bikeName={getBikeName(ride.bikeId)}
            onPress={onRidePress ? () => onRidePress(ride) : () => {}}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    marginBottom: space.md,
  },
  title: {
    ...type.eyebrow,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    // The header row is short type; the target has to be tall enough on its own.
    minHeight: 44,
  },
  headerActionText: {
    ...type.footnoteStrong,
    color: colors.primary,
  },
  seeAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    // Bare text needs a real target: the row is only ~17pt tall on its own.
    paddingVertical: space.lg,
    paddingLeft: space.lg,
  },
  seeAllText: {
    ...type.footnote,
    color: colors.primary,
    marginRight: space.hair,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  errorWrap: {
    marginHorizontal: space.xl,
  },
  emptyCard: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.section,
    alignItems: 'center',
  },
  emptyText: {
    ...type.calloutStrong,
    color: colors.textSecondary,
    marginTop: space.lg,
  },
  emptySubtext: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: space.xs,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: space.md,
  },
  emptyPrimaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.full,
    gap: space.sm,
    marginTop: space.xl,
  },
  emptyRecordButton: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: space.sm,
    marginTop: space.lg,
  },
  emptyRecordButtonText: {
    ...type.footnoteStrong,
    color: colors.primary,
  },
  emptyPrimaryButtonText: {
    ...type.footnoteStrong,
    color: colors.onPrimary,
  },
  emptySecondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: space.lg,
    // 8pt clearance from the primary action above it, not 4.
    marginTop: space.md,
  },
  emptySecondaryButtonText: {
    ...type.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.xl,
    gap: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLineShort: {
    marginTop: space.md,
  },
});
