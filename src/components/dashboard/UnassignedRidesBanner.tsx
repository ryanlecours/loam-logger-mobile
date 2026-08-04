import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../../constants/theme';

interface UnassignedRidesBannerProps {
  /** Rides with no bike, across the rider's whole history. */
  count: number;
  onPress: () => void;
}

/**
 * Prompt to assign rides that landed without a bike.
 *
 * Garmin never reports gear, so on a multi-bike account every synced ride
 * arrives unassigned, and an unassigned ride's duration is credited to no
 * component at all. That makes service predictions read healthier than the
 * bike actually is, which is the one number this app exists to get right. The
 * subtitle says so plainly rather than just counting rides: the cost of
 * ignoring this is not obvious from the number alone.
 *
 * Sage interactive voice, never the component-health ramp. An unassigned ride
 * is a missing input, not a worn part, and the ramp is reserved for actual
 * component wear (DESIGN.md).
 */
export function UnassignedRidesBanner({ count, onPress }: UnassignedRidesBannerProps) {
  if (count <= 0) return null;

  const label = count === 1 ? '1 ride needs a bike' : `${count} rides need a bike`;
  const detail = 'Their hours are not counted toward any component yet.';

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail} Open to assign them.`}
    >
      <Ionicons
        name="bicycle-outline"
        size={20}
        color={colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.subtitle}>{detail}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.xl,
    marginHorizontal: space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...type.footnoteStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: space.hair,
  },
});
