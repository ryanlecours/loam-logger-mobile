import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PendingRide } from '../../hooks/usePendingRides';
import { retryOutboxRow, deleteOutboxRow } from '../../lib/outbox';
import {
  formatDuration,
  formatRideDate,
  formatElevation,
} from '../../utils/greetingMessages';
import { useDistanceUnit } from '../../hooks/useDistanceUnit';
import { colors, radius } from '../../constants/theme';

interface PendingRideCardProps {
  pendingRide: PendingRide;
}

/**
 * A ride that exists only on this phone so far: logged offline, waiting in
 * the outbox. Mirrors RideListItem's layout so the list reads as one list,
 * but it does not navigate anywhere (there is no server ride to open) and it
 * wears a sync chip where the provider badges would be.
 *
 * Chip colors: waiting uses the sage interactive voice (it is progress, not a
 * problem); failed uses the critical feedback tokens, never the
 * component-health ramp (DESIGN.md: the ramp is for component wear only).
 */
export function PendingRideCard({ pendingRide }: PendingRideCardProps) {
  const { formatDistance, distanceUnit } = useDistanceUnit();
  const { input, status, lastError } = pendingRide;

  const dateStr = formatRideDate(input.startTime);
  const durationStr = formatDuration(input.durationSeconds);
  const distanceStr = formatDistance(input.distanceMeters);
  const elevationStr = formatElevation(input.elevationGainMeters, distanceUnit);
  const failed = status === 'failed';

  const handlePress = () => {
    if (!failed) {
      Alert.alert(
        'Waiting to sync',
        'This ride is saved on your phone and will upload automatically when you have signal.',
      );
      return;
    }
    Alert.alert(
      "This ride couldn't sync",
      lastError
        ? 'The server rejected it. You can try again or remove it from the queue.'
        : 'You can try again or remove it from the queue.',
      [
        { text: 'Try again', onPress: () => void retryOutboxRow(pendingRide.id) },
        {
          text: 'Discard ride',
          style: 'destructive',
          onPress: () => void deleteOutboxRow(pendingRide.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const spoken = [
    failed ? 'Ride failed to sync, open for options' : 'Ride waiting to sync',
    dateStr,
    distanceStr,
    durationStr,
  ].join(', ');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={spoken}
    >
      <View style={styles.iconContainer} accessibilityElementsHidden>
        <Ionicons
          name={failed ? 'cloud-offline-outline' : 'cloud-upload-outline'}
          size={22}
          color={failed ? colors.critical : colors.textSecondary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{dateStr}</Text>
          <View style={[styles.syncChip, failed ? styles.syncChipFailed : styles.syncChipPending]}>
            <Text
              style={[styles.syncChipText, failed ? styles.syncChipTextFailed : styles.syncChipTextPending]}
            >
              {failed ? 'Sync failed' : 'Waiting to sync'}
            </Text>
          </View>
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
        </View>

        {input.location ? (
          <View style={styles.bottomRow}>
            <Text style={styles.location} numberOfLines={1}>
              {input.location}
            </Text>
          </View>
        ) : null}
      </View>
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
    borderRadius: radius.full,
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
  syncChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  syncChipPending: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  syncChipFailed: {
    backgroundColor: colors.criticalBg,
    borderColor: colors.criticalBorder,
  },
  syncChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncChipTextPending: {
    color: colors.primary,
  },
  syncChipTextFailed: {
    color: colors.criticalOn,
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
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
});
