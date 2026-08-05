import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './useAuth';
import {
  RideSyncNotificationMode,
  useUpdateUserPreferencesMutation,
} from '../graphql/generated';
import {
  registerForPushNotificationsAsync,
  getNotificationPermissionStatus,
  getDeviceTimezone,
} from '../lib/notifications';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useNotifications() {
  const { user, refetchUser } = useAuth();
  const [updatePreferences] = useUpdateUserPreferencesMutation();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  // Check permission status on mount, and again whenever the app foregrounds.
  // Without the foreground re-check the Settings switch desyncs: a user who
  // taps "Enable in system settings", grants permission there, and returns
  // still sees the switch off until the screen happens to remount.
  useEffect(() => {
    getNotificationPermissionStatus().then(setPermissionStatus);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getNotificationPermissionStatus().then(setPermissionStatus);
      }
    });
    return () => subscription.remove();
  }, []);

  const notifyOnRideUpload = user?.notifyOnRideUpload ?? true;
  // Server default for new accounts is ACTION_NEEDED; mirror it here so the
  // UI doesn't flash a different selection while the user row loads.
  const rideSyncNotificationMode =
    user?.rideSyncNotificationMode ?? RideSyncNotificationMode.ActionNeeded;
  const weeklyDigestEnabled = user?.weeklyDigestEnabled ?? false;

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const token = await registerForPushNotificationsAsync();
    const newStatus = await getNotificationPermissionStatus();
    setPermissionStatus(newStatus);

    if (token) {
      // Send push token to backend, with the device timezone riding along:
      // it's what lets the weekly digest arrive at 8am local instead of 8am
      // somewhere else.
      await updatePreferences({
        variables: { input: { expoPushToken: token, timezone: getDeviceTimezone() } },
      });
      await refetchUser();
      return true;
    }
    return false;
  }, [updatePreferences, refetchUser]);

  const setRideSyncNotificationMode = useCallback(
    async (mode: RideSyncNotificationMode) => {
      await updatePreferences({
        variables: { input: { rideSyncNotificationMode: mode } },
      });
      await refetchUser();
    },
    [updatePreferences, refetchUser]
  );

  const setWeeklyDigestEnabled = useCallback(
    async (enabled: boolean) => {
      await updatePreferences({
        variables: { input: { weeklyDigestEnabled: enabled } },
      });
      await refetchUser();
    },
    [updatePreferences, refetchUser]
  );

  /**
   * Register push token silently (call on app launch when already authorized).
   * Sends token to backend if permissions are granted. The timezone rides
   * along so a rider who moves timezones gets their digest at the new local
   * 8am without ever touching Settings.
   */
  const registerTokenIfGranted = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    if (status === 'granted') {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await updatePreferences({
          variables: { input: { expoPushToken: token, timezone: getDeviceTimezone() } },
        }).catch(() => {}); // Non-fatal
        await refetchUser().catch(() => {}); // Non-fatal
      }
    }
  }, [updatePreferences, refetchUser]);

  return {
    permissionStatus,
    notifyOnRideUpload,
    rideSyncNotificationMode,
    weeklyDigestEnabled,
    requestPermissions,
    setRideSyncNotificationMode,
    setWeeklyDigestEnabled,
    registerTokenIfGranted,
  };
}
