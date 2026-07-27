import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsFragment } from '../../graphql/generated';
import { RideListItem } from '../rides/RideListItem';
import type { RideItem } from '../../hooks/useRidesPaginated';
import { colors, radius, space, type } from '../../constants/theme';

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
  onSeeAll?: () => void;
  onRidePress?: (ride: Ride) => void;
  onConnectPress?: () => void;
  onAddRidePress?: () => void;
}

export function RecentRidesList({
  rides,
  bikes,
  loading,
  onSeeAll,
  onRidePress,
  onConnectPress,
  onAddRidePress,
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
        <View style={styles.card}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              </View>
            </View>
          ))}
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
            Connect Strava, Garmin, WHOOP, or Suunto to import past rides — or log one manually.
          </Text>
          {onConnectPress && (
            <TouchableOpacity style={styles.emptyPrimaryButton} onPress={onConnectPress}>
              <Ionicons name="link-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.emptyPrimaryButtonText}>Connect a data source</Text>
            </TouchableOpacity>
          )}
          {onAddRidePress && (
            <TouchableOpacity style={styles.emptySecondaryButton} onPress={onAddRidePress}>
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
        <Text style={styles.title}>RECENT RIDES</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
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
  seeAllButton: {
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.full,
    gap: space.sm,
    marginTop: space.xl,
  },
  emptyPrimaryButtonText: {
    ...type.footnoteStrong,
    color: colors.onPrimary,
  },
  emptySecondaryButton: {
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
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.skeleton,
    marginRight: space.lg,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.skeleton,
    borderRadius: radius.full,
    width: '60%',
    marginBottom: space.md,
  },
  skeletonLineShort: {
    width: '40%',
    marginBottom: 0,
  },
});
