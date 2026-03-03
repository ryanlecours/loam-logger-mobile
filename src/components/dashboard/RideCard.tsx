import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecentRidesQuery } from '../../graphql/generated';
import {
  formatDuration,
  formatDistance,
  formatRideDate,
} from '../../utils/greetingMessages';

type Ride = RecentRidesQuery['rides'][0];

interface RideCardProps {
  ride: Ride;
  bikeName?: string;
  onPress?: () => void;
}

export function RideCard({ ride, bikeName, onPress }: RideCardProps) {
  const dateStr = formatRideDate(ride.startTime);
  const durationStr = ride.durationSeconds
    ? formatDuration(ride.durationSeconds)
    : null;
  const distanceStr = ride.distanceMiles
    ? formatDistance(ride.distanceMiles)
    : null;

  const getRideTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (ride.rideType) {
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
      default:
        return 'bicycle-outline';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getRideTypeIcon()} size={20} color="#6b7280" />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{dateStr}</Text>
          {ride.location && (
            <Text style={styles.location} numberOfLines={1}>
              {ride.location}
            </Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.stats}>
            {durationStr && (
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.statText}>{durationStr}</Text>
              </View>
            )}
            {distanceStr && (
              <View style={styles.stat}>
                <Ionicons name="navigate-outline" size={14} color="#9ca3af" />
                <Text style={styles.statText}>{distanceStr}</Text>
              </View>
            )}
          </View>
          {bikeName && (
            <Text style={styles.bikeName} numberOfLines={1}>
              {bikeName}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  location: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  bikeName: {
    fontSize: 12,
    color: '#9ca3af',
    maxWidth: 100,
  },
});
