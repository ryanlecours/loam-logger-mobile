import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideItem } from '../../hooks/useRidesPaginated';
import {
  formatDuration,
  formatDistance,
  formatRideDate,
  formatElevation,
} from '../../utils/greetingMessages';

interface RideListItemProps {
  ride: RideItem;
  bikeName?: string;
  onPress: () => void;
}

type IconName = keyof typeof Ionicons.glyphMap;

function getRideTypeIcon(rideType: string): IconName {
  switch (rideType) {
    case 'TRAIL':
      return 'leaf-outline';
    case 'ENDURO':
      return 'flash-outline';
    case 'DOWNHILL':
      return 'arrow-down-outline';
    case 'XC':
      return 'fitness-outline';
    case 'GRAVEL':
      return 'analytics-outline';
    case 'ROAD':
      return 'speedometer-outline';
    case 'COMMUTE':
      return 'briefcase-outline';
    case 'TRAINER':
      return 'home-outline';
    default:
      return 'bicycle-outline';
  }
}

function getSourceBadge(ride: RideItem): { label: string; color: string } | null {
  if (ride.stravaActivityId) {
    return { label: 'Strava', color: '#fc4c02' };
  }
  if (ride.garminActivityId) {
    return { label: 'Garmin', color: '#007dc3' };
  }
  if (ride.whoopWorkoutId) {
    return { label: 'WHOOP', color: '#00a651' };
  }
  return null;
}

export function RideListItem({ ride, bikeName, onPress }: RideListItemProps) {
  const dateStr = formatRideDate(ride.startTime);
  const durationStr = formatDuration(ride.durationSeconds);
  const distanceStr = formatDistance(ride.distanceMiles);
  const elevationStr = formatElevation(ride.elevationGainFeet);
  const sourceBadge = getSourceBadge(ride);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={getRideTypeIcon(ride.rideType)} size={22} color="#6b7280" />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{dateStr}</Text>
          {sourceBadge && (
            <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.color }]}>
              <Text style={styles.sourceBadgeText}>{sourceBadge.label}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={14} color="#9ca3af" />
            <Text style={styles.statText}>{durationStr}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="navigate-outline" size={14} color="#9ca3af" />
            <Text style={styles.statText}>{distanceStr}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="trending-up-outline" size={14} color="#9ca3af" />
            <Text style={styles.statText}>{elevationStr}</Text>
          </View>
        </View>

        {(ride.location || bikeName) && (
          <View style={styles.bottomRow}>
            {ride.location && (
              <Text style={styles.location} numberOfLines={1}>
                {ride.location}
              </Text>
            )}
            {bikeName && (
              <Text style={styles.bikeName} numberOfLines={1}>
                {bikeName}
              </Text>
            )}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sourceBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  location: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  bikeName: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
