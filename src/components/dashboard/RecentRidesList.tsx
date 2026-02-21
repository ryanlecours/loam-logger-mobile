import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecentRidesQuery, BikeFieldsFragment } from '../../graphql/generated';
import { RideCard } from './RideCard';

type Ride = RecentRidesQuery['rides'][0];

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
          <Text style={styles.title}>Recent Rides</Text>
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
          <Text style={styles.title}>Recent Rides</Text>
        </View>
        <View style={styles.emptyCard}>
          <Ionicons name="bicycle-outline" size={32} color="#9ca3af" />
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
        <Text style={styles.title}>Recent Rides</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>
        {rides.map((ride, index) => (
          <RideCard
            key={ride.id}
            ride={ride}
            bikeName={getBikeName(ride.bikeId)}
            onPress={onRidePress ? () => onRidePress(ride) : undefined}
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563eb',
    marginRight: 2,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '40%',
    marginBottom: 0,
  },
});
