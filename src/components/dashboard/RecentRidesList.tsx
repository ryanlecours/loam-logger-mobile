import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsFragment } from '../../graphql/generated';
import { RideListItem } from '../rides/RideListItem';
import type { RideItem } from '../../hooks/useRidesPaginated';
import { colors } from '../../constants/theme';

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
}

export function RecentRidesList({
  rides,
  bikes,
  loading,
  onSeeAll,
  onRidePress,
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
          <Text style={styles.emptyText}>No rides logged yet</Text>
          <Text style={styles.emptySubtext}>
            Your recent rides will appear here
          </Text>
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
            onPress={onRidePress ? () => onRidePress(ride) : () => undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 2,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.skeleton,
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.skeleton,
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '40%',
    marginBottom: 0,
  },
});
