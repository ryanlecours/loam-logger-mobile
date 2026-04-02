import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications';
import { openNotificationSettings } from '../../lib/notifications';
import { colors } from '../../constants/theme';

export function NotificationPreferences() {
  const router = useRouter();
  const {
    permissionStatus,
    notifyOnRideUpload,
    requestPermissions,
    setNotifyOnRideUpload,
  } = useNotifications();

  const isPushEnabled = permissionStatus === 'granted';

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      await requestPermissions();
    }
    // Can't programmatically disable - user must go to system settings
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
          {/* Ride sync alerts */}
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Ride Sync Alerts</Text>
              <Text style={styles.rowDescription}>
                Notify when rides sync from Strava/Garmin
              </Text>
            </View>
            <Switch
              value={notifyOnRideUpload}
              onValueChange={setNotifyOnRideUpload}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
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
  systemSettingsLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
});
