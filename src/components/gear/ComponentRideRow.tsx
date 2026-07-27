import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';
import { formatGarminSource } from '../../constants/garminAttribution';
import { formatDuration, formatRideDate } from '../../utils/greetingMessages';

type IconName = keyof typeof Ionicons.glyphMap;

/** Minimal ride shape the row needs — satisfied by both a ComponentRides
 *  entry's `ride` and a RidesPage candidate ride. */
export interface AttributionRide {
  id: string;
  startTime: string;
  durationSeconds: number;
  rideType: string;
  location?: string | null;
  trailSystem?: string | null;
  notes?: string | null;
  bikeId?: string | null;
  garminActivityId?: string | null;
  garminDeviceName?: string | null;
}

interface ComponentRideRowProps {
  ride: AttributionRide;
  /** false → title struck-through/muted (not currently counted). */
  counted?: boolean;
  /** Appended to the subtitle, e.g. "applied from another bike" / "unassigned". */
  suffix?: string | null;
  /** INCLUDE row that predates the anchor — dormant, flagged with a warning. */
  beforeAnchor?: boolean;
  actionLabel: string;
  busyLabel: string;
  busy: boolean;
  actionVariant?: 'default' | 'primary';
  onAction: () => void;
}

function rideTypeIcon(rideType: string): IconName {
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

function rideTitle(ride: AttributionRide): string {
  // Garmin drops its activity name into `notes` (no reliable `location`), so
  // surface that for Garmin rides — mirrors RideListItem.
  const garminTitle = ride.garminActivityId ? ride.notes : null;
  return ride.trailSystem || ride.location || garminTitle || 'Ride';
}

export function ComponentRideRow({
  ride,
  counted = true,
  suffix,
  beforeAnchor,
  actionLabel,
  busyLabel,
  busy,
  actionVariant = 'default',
  onAction,
}: ComponentRideRowProps) {
  const isPrimary = actionVariant === 'primary';
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={rideTypeIcon(ride.rideType)} size={20} color={colors.textSecondary} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, !counted && styles.titleUncounted]} numberOfLines={1}>
          {rideTitle(ride)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatRideDate(ride.startTime)} · {formatDuration(ride.durationSeconds)}
          {suffix ? ` · ${suffix}` : ''}
          {/* Per-entry Garmin attribution. This list is a secondary/detail
              view under the Garmin API Brand Guidelines, which require the
              attribution in expanded views too — per entry or globally in a
              header. Per entry is the honest choice here, since a component's
              hours can mix providers. */}
          {ride.garminActivityId && (
            <Text style={styles.attribution}>
              {' · '}
              {formatGarminSource(ride.garminDeviceName)}
            </Text>
          )}
          {beforeAnchor && <Text style={styles.warning}> · predates last service</Text>}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.action,
          isPrimary ? styles.actionPrimary : styles.actionDefault,
          busy && styles.actionBusy,
        ]}
        onPress={onAction}
        disabled={busy}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionText, isPrimary && styles.actionTextPrimary]}>
          {busy ? busyLabel : actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  titleUncounted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  warning: {
    color: colors.cautionOn,
  },
  // Data-source attribution inline in the row subtitle — visible without
  // interaction, as the Garmin guidelines require.
  attribution: {
    color: colors.garminOnDark,
  },
  action: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    minWidth: 76,
    alignItems: 'center',
  },
  actionDefault: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionBusy: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionTextPrimary: {
    color: colors.onPrimary,
  },
});
