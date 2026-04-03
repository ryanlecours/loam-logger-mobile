import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRidesPageQuery, useDeleteRideMutation } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import {
  formatDuration,
  formatElevation,
} from '../../src/utils/greetingMessages';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';

type IconName = keyof typeof Ionicons.glyphMap;

function getRideTypeLabel(rideType: string): string {
  const labels: Record<string, string> = {
    TRAIL: 'Trail',
    ENDURO: 'Enduro',
    DOWNHILL: 'Downhill',
    XC: 'Cross Country',
    GRAVEL: 'Gravel',
    ROAD: 'Road',
    COMMUTE: 'Commute',
    TRAINER: 'Trainer',
  };
  return labels[rideType] || rideType;
}

function getRideTypeIcon(rideType: string): IconName {
  const icons: Record<string, IconName> = {
    TRAIL: 'leaf-outline',
    ENDURO: 'flash-outline',
    DOWNHILL: 'arrow-down-outline',
    XC: 'fitness-outline',
    GRAVEL: 'analytics-outline',
    ROAD: 'speedometer-outline',
    COMMUTE: 'briefcase-outline',
    TRAINER: 'home-outline',
  };
  return icons[rideType] || 'bicycle-outline';
}

function getSourceInfo(ride: {
  garminActivityId?: string | null;
  stravaActivityId?: string | null;
  whoopWorkoutId?: string | null;
}): { label: string; color: string } | null {
  if (ride.stravaActivityId) {
    return { label: 'Synced from Strava', color: colors.strava };
  }
  if (ride.garminActivityId) {
    return { label: 'Synced from Garmin', color: colors.garmin };
  }
  if (ride.whoopWorkoutId) {
    return { label: 'Synced from WHOOP', color: colors.whoop };
  }
  return null;
}

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { formatDistance, distanceUnit } = useDistanceUnit();
  const [deleting, setDeleting] = useState(false);

  // Fetch ride from the cached rides query
  const { data, loading } = useRidesPageQuery({
    variables: { take: 100 },
    fetchPolicy: 'cache-first',
  });

  const { bikes } = useBikesWithPredictions();
  const [deleteRide] = useDeleteRideMutation();

  const ride = data?.rides.find((r) => r.id === id);

  const getBikeName = useCallback(
    (bikeId: string | null | undefined): string | undefined => {
      if (!bikeId) return undefined;
      const bike = bikes.find((b) => b.id === bikeId);
      if (!bike) return undefined;
      return bike.nickname || `${bike.manufacturer} ${bike.model}`;
    },
    [bikes]
  );

  const handleEdit = () => {
    router.push(`/ride/edit/${id}` as Href);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRide({
                variables: { id: id! },
                refetchQueries: ['RidesPage', 'RecentRides'],
              });
              router.back();
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete ride');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Ride not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startDate = new Date(ride.startTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const bikeName = getBikeName(ride.bikeId);
  const sourceInfo = getSourceInfo(ride);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={getRideTypeIcon(ride.rideType)}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.typeLabel}>{getRideTypeLabel(ride.rideType)}</Text>
          </View>
          {sourceInfo && (
            <View style={[styles.sourceBadge, { backgroundColor: sourceInfo.color }]}>
              <Text style={styles.sourceBadgeText}>{sourceInfo.label}</Text>
            </View>
          )}
        </View>

        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.time}>{formattedTime}</Text>

        {ride.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.location}>{ride.location}</Text>
          </View>
        )}
      </View>

      {/* Stats Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            <Text style={styles.statValue}>{formatDuration(ride.durationSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={20} color={colors.textMuted} />
            <Text style={styles.statValue}>{formatDistance(ride.distanceMeters)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up-outline" size={20} color={colors.textMuted} />
            <Text style={styles.statValue}>{formatElevation(ride.elevationGainMeters, distanceUnit)}</Text>
            <Text style={styles.statLabel}>Elevation</Text>
          </View>
          {ride.averageHr && (
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
              <Text style={styles.statValue}>{ride.averageHr} bpm</Text>
              <Text style={styles.statLabel}>Avg HR</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bike Card */}
      {bikeName && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bike</Text>
          <View style={styles.bikeRow}>
            <Ionicons name="bicycle" size={20} color={colors.textMuted} />
            <Text style={styles.bikeName}>{bikeName}</Text>
          </View>
        </View>
      )}

      {/* Notes Card */}
      {ride.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{ride.notes}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
          disabled={deleting}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bikeName: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  notes: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
