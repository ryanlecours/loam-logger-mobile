import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications';
import { useUserTier } from '../../hooks/useUserTier';
import { ProChip } from '../common/UpgradePrompt';
import { openNotificationSettings } from '../../lib/notifications';
import { RideSyncNotificationMode } from '../../graphql/generated';
import { colors } from '../../constants/theme';

/**
 * Ride-sync push modes, in escalating-noise order so the control reads as a
 * volume knob. "Only when needed" = a ride needing a bike assigned, plus the
 * account's first-ever synced ride.
 */
const RIDE_SYNC_MODES: { value: RideSyncNotificationMode; label: string }[] = [
  { value: RideSyncNotificationMode.Off, label: 'Off' },
  { value: RideSyncNotificationMode.ActionNeeded, label: 'Only when needed' },
  { value: RideSyncNotificationMode.All, label: 'All rides' },
];

const MODE_DESCRIPTIONS: Record<RideSyncNotificationMode, string> = {
  [RideSyncNotificationMode.Off]: 'No ride sync notifications',
  [RideSyncNotificationMode.ActionNeeded]:
    'Only rides that need a bike assigned',
  [RideSyncNotificationMode.All]: 'Every ride that syncs from your devices',
};

export function NotificationPreferences() {
  const router = useRouter();
  const { isFree } = useUserTier();
  const {
    permissionStatus,
    rideSyncNotificationMode,
    weeklyDigestEnabled,
    requestPermissions,
    setRideSyncNotificationMode,
    setWeeklyDigestEnabled,
  } = useNotifications();

  const isPushEnabled = permissionStatus === 'granted';

  const handlePushToggle = async (value: boolean) => {
    if (!value) return; // Can't programmatically disable - user must go to system settings
    try {
      await requestPermissions();
    } catch {
      // Permission was granted but the token upload failed (offline, server
      // hiccup). The launch path retries silently; the switch just shouldn't
      // produce an unhandled rejection.
      Alert.alert('Could not enable notifications', 'Please try again.');
    }
  };

  const handleModeChange = async (mode: RideSyncNotificationMode) => {
    try {
      await setRideSyncNotificationMode(mode);
    } catch {
      Alert.alert('Error', 'Failed to update notification preferences.');
    }
  };

  const handleDigestToggle = async (enabled: boolean) => {
    try {
      await setWeeklyDigestEnabled(enabled);
    } catch {
      Alert.alert('Error', 'Failed to update notification preferences.');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>

      {/* Push permission toggle */}
      <View style={styles.row}>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          {permissionStatus === 'denied' && (
            <TouchableOpacity onPress={openNotificationSettings}>
              <Text style={styles.systemSettingsLink}>Enable in system settings</Text>
            </TouchableOpacity>
          )}
        </View>
        <Switch
          value={isPushEnabled}
          onValueChange={handlePushToggle}
          disabled={permissionStatus === 'denied'}
          trackColor={{ false: colors.cardBorder, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {isPushEnabled && (
        <>
          {/* Ride sync alerts: a volume knob, not a switch */}
          <View style={styles.divider} />
          <View style={styles.fieldBlock}>
            <Text style={styles.rowLabel}>Ride Sync Alerts</Text>
            <View style={styles.segmentedControl}>
              {RIDE_SYNC_MODES.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.segment,
                    rideSyncNotificationMode === m.value && styles.segmentActive,
                  ]}
                  onPress={() => handleModeChange(m.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: rideSyncNotificationMode === m.value }}
                  accessibilityLabel={`Ride sync alerts: ${m.label}`}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      rideSyncNotificationMode === m.value && styles.segmentTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rowDescription}>
              {MODE_DESCRIPTIONS[rideSyncNotificationMode]}
            </Text>
          </View>

          {/* Weekly digest: a prediction surface, so Pro only. Free users see
              the row with a Pro chip instead of a toggle: a switch that stores
              but never sends would be a lie, but hiding the row entirely made
              the feature undiscoverable. */}
          <View style={styles.divider} />
          {isFree ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/settings-detail/pricing' as never)}
              accessibilityRole="button"
              accessibilityLabel="Weekend Bike Check, included with Pro, see plans"
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Weekend Bike Check</Text>
                <Text style={styles.rowDescription}>
                  One Friday-morning summary of every bike, before the weekend
                </Text>
              </View>
              <ProChip />
            </TouchableOpacity>
          ) : (
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Weekend Bike Check</Text>
                <Text style={styles.rowDescription}>
                  One Friday-morning summary of every bike, before the weekend
                </Text>
              </View>
              <Switch
                value={weeklyDigestEnabled}
                onValueChange={handleDigestToggle}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          )}

          {/* Service reminders - navigate to per-bike screen */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/settings-detail/service-notifications' as never)}
          >
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Service Reminders</Text>
              <Text style={styles.rowDescription}>Configure per bike</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  fieldBlock: {
    paddingVertical: 12,
    gap: 8,
  },
  // Mirrors the segmented control on the per-bike service-notifications
  // screen so the two notification surfaces read as one system.
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  systemSettingsLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
});
