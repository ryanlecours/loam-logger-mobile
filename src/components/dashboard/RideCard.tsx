import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecentRidesQuery } from '../../graphql/generated';
import {
  formatRideDate,
} from '../../utils/greetingMessages';
import { useDistanceUnit } from '../../hooks/useDistanceUnit';
import { colors } from '../../constants/theme';

type Ride = RecentRidesQuery['rides'][0];

interface RideCardProps {
  ride: Ride;
  bikeName?: string;
  onPress?: () => void;
}

const RIDE_TYPE_EMOJI: Record<string, string> = {
  TRAIL: '\uD83C\uDF4A',      // orange circle
  ENDURO: '\uD83D\uDD35',     // blue circle
  DOWNHILL: '\u26A1',          // lightning
  XC: '\uD83D\uDFE2',         // green circle
  GRAVEL: '\uD83D\uDFE4',     // brown circle
  ROAD: '\u26AA',              // white circle
  COMMUTE: '\uD83D\uDE8C',    // bus
  TRAINER: '\uD83C\uDFE0',    // house
};

export function RideCard({ ride, bikeName: _bikeName, onPress }: RideCardProps) {
  const { formatDistance } = useDistanceUnit();
  const _dateStr = formatRideDate(ride.startTime);
  const durationHours = ride.durationSeconds ? (ride.durationSeconds / 3600).toFixed(1) : null;
  const distanceDisplay = ride.distanceMeters ? formatDistance(ride.distanceMeters) : null;

  const emoji = RIDE_TYPE_EMOJI[ride.rideType] || '\uD83D\uDEB2'; // default bicycle

  // Generate a ride name from location or ride type
  const rideName = ride.location || formatRideType(ride.rideType);

  // Format date as YYYY-MM-DD
  const formattedDate = new Date(ride.startTime).toISOString().split('T')[0];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.rideName} numberOfLines={1}>{rideName}</Text>
        <View style={styles.statsRow}>
          {durationHours && (
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{durationHours}h</Text>
            </View>
          )}
          {distanceDisplay && (
            <View style={styles.stat}>
              <Ionicons name="navigate-outline" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{distanceDisplay}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.dateText}>{formattedDate}</Text>
    </TouchableOpacity>
  );
}

function formatRideType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  emojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  rideName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
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
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
  },
});
