import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideItem } from '../../hooks/useRidesPaginated';
import {
  formatDuration,
  formatRideDate,
  formatElevation,
} from '../../utils/greetingMessages';
import { useDistanceUnit } from '../../hooks/useDistanceUnit';
import { colors } from '../../constants/theme';
import { WeatherBadge } from '../weather/WeatherBadge';

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
    return { label: 'Strava', color: colors.strava };
  }
  if (ride.garminActivityId) {
    return { label: 'Garmin', color: colors.garmin };
  }
  if (ride.whoopWorkoutId) {
    return { label: 'WHOOP', color: colors.whoop };
  }
  if (ride.suuntoWorkoutId) {
    return { label: 'Suunto', color: colors.suunto };
  }
  return null;
}

export function RideListItem({ ride, bikeName, onPress }: RideListItemProps) {
  const { formatDistance, distanceUnit } = useDistanceUnit();
  const dateStr = formatRideDate(ride.startTime);
  const durationStr = formatDuration(ride.durationSeconds);
  const distanceStr = formatDistance(ride.distanceMeters);
  const elevationStr = formatElevation(ride.elevationGainMeters, distanceUnit);
  const sourceBadge = getSourceBadge(ride);

  // Garmin's activity name lands in our `notes` column during ingest (Garmin
  // doesn't reliably populate `location`, so for those rides this is the only
  // human-meaningful identifier the user has). Surface it in the title slot
  // for Garmin rides; everyone else keeps the existing `location` behavior.
  const titleText = ride.garminActivityId
    ? ride.notes ?? ride.location
    : ride.location;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={getRideTypeIcon(ride.rideType)} size={22} color={colors.textSecondary} />
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
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.statText}>{durationStr}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
            <Text style={styles.statText}>{distanceStr}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="trending-up-outline" size={14} color={colors.textMuted} />
            <Text style={styles.statText}>{elevationStr}</Text>
          </View>
          <WeatherBadge weather={ride.weather} distanceUnit={distanceUnit as 'mi' | 'km'} />
        </View>

        {(titleText || bikeName) && (
          <View style={styles.bottomRow}>
            {titleText && (
              <Text style={styles.location} numberOfLines={1}>
                {titleText}
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

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  bikeName: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
