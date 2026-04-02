import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useUpdateUserPreferencesMutation } from '../graphql/generated';
import {
  registerForPushNotificationsAsync,
  getNotificationPermissionStatus,
} from '../lib/notifications';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useNotifications() {
  const { user, refetchUser } = useAuth();
  const [updatePreferences] = useUpdateUserPreferencesMutation();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  // Check permission status on mount
  useEffect(() => {
    getNotificationPermissionStatus().then(setPermissionStatus);
  }, []);

  const notifyOnRideUpload = user?.notifyOnRideUpload ?? true;

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const token = await registerForPushNotificationsAsync();
    const newStatus = await getNotificationPermissionStatus();
    setPermissionStatus(newStatus);

    if (token) {
      // Send push token to backend
      await updatePreferences({
        variables: { input: { expoPushToken: token } },
      });
      await refetchUser();
      return true;
    }
    return false;
  }, [updatePreferences, refetchUser]);

  const setNotifyOnRideUpload = useCallback(
    async (enabled: boolean) => {
      await updatePreferences({
        variables: { input: { notifyOnRideUpload: enabled } },
      });
      await refetchUser();
    },
    [updatePreferences, refetchUser]
  );

  /**
   * Register push token silently (call on app launch when already authorized).
   * Sends token to backend if permissions are granted.
   */
  const registerTokenIfGranted = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    if (status === 'granted') {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await updatePreferences({
          variables: { input: { expoPushToken: token } },
        }).catch(() => {}); // Non-fatal
      }
    }
  }, [updatePreferences]);

  return {
    permissionStatus,
    notifyOnRideUpload,
    requestPermissions,
    setNotifyOnRideUpload,
    registerTokenIfGranted,
  };
}
