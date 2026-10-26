import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { formatElevation } from '../../utils/greetingMessages';
import { liftLapCount, liftNames, liftTagLabel } from '../../utils/rideLift';
import {
  useSetRideLiftElevationMutation,
  type RideLiftFieldsFragment,
} from '../../graphql/generated';
import { OsmCredit } from '../common/OsmCredit';

type Props = {
  rideId: string;
  elevationGainMeters: number;
  countedElevationGainMeters: number;
  lift: RideLiftFieldsFragment | null | undefined;
  distanceUnit: 'mi' | 'km';
};

/**
 * "Chairlift detected" tag for one ride, with the rider's choice about the
 * lift's climb. Renders nothing when no lift was detected. The choice saves on
 * change; the counted climb on this screen, in the rides list and in the stats
 * follows through the normalized Ride in the Apollo cache.
 */
export function RideLiftCard({
  rideId,
  elevationGainMeters,
  countedElevationGainMeters,
  lift,
  distanceUnit,
}: Props) {
  const [saveChoice, { loading: saving, error }] = useSetRideLiftElevationMutation();

  if (!lift || lift.segments.length === 0) return null;

  const names = liftNames(lift.segments);
  const liftClimb = formatElevation(lift.elevationGainMeters, distanceUnit);
  const recordedClimb = formatElevation(elevationGainMeters, distanceUnit);
  const countedClimb = formatElevation(countedElevationGainMeters, distanceUnit);

  const onToggle = (count: boolean) => {
    saveChoice({
      variables: { rideId, count },
      optimisticResponse: {
        setRideLiftElevation: {
          __typename: 'Ride',
          id: rideId,
          elevationGainMeters,
          countedElevationGainMeters: count
            ? elevationGainMeters
            : Math.max(0, elevationGainMeters - lift.elevationGainMeters),
          lift: { ...lift, countElevation: count, countElevationChoice: count },
        },
      },
    }).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.tagRow}>
        <View style={styles.chip}>
          <Ionicons name="trending-up-outline" size={12} color={colors.positiveOn} />
          <Text style={styles.chipText}>{liftTagLabel(lift.segments.map((s) => s.kind))}</Text>
        </View>
        <Text style={styles.laps}>
          {liftLapCount(lift.segments.length)}
          {names.length > 0 ? ` on ${names.join(', ')}` : ''}
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleLabel}>Count the lift climb in this ride</Text>
          <Text style={styles.toggleHint}>
            {lift.countElevation
              ? `The lift climbed ${liftClimb} for you. This ride counts all ${recordedClimb} recorded.`
              : `The lift climbed ${liftClimb} for you, so this ride counts ${countedClimb} of the ${recordedClimb} recorded.`}
          </Text>
        </View>
        <Switch
          value={lift.countElevation}
          onValueChange={onToggle}
          disabled={saving}
          trackColor={{ true: colors.primary, false: colors.cardBorder }}
          accessibilityLabel="Count the lift climb in this ride"
        />
      </View>

      {error && <Text style={styles.error}>Couldn't save your choice. {error.message}</Text>}

      <OsmCredit style={styles.credit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  // Sage wash with mint ink: DESIGN.md's pairing for text on a sage-tinted fill.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.positiveOn,
  },
  laps: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  toggleHint: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: colors.criticalOn,
  },
  credit: {
    marginTop: 12,
  },
});
