import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import type { Router } from 'expo-router';

/**
 * Configure how notifications are displayed when the app is in the foreground.
 * Call once at module level in the root layout.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if permissions are denied or if not on a physical device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[notifications] Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('[notifications] Missing EAS project ID');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('[notifications] Push token:', tokenData.data); // TEMP: remove after testing
  return tokenData.data;
}

/**
 * Get the current notification permission status.
 */
export async function getNotificationPermissionStatus(): Promise<'undetermined' | 'granted' | 'denied'> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/**
 * Open device settings so the user can enable notifications.
 */
export function openNotificationSettings(): void {
  Linking.openSettings();
}

/**
 * Set up a listener for when the user taps a notification.
 * Routes to the relevant screen based on the notification data.
 */
export function setupNotificationResponseListener(router: Router) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    if (data?.screen === 'ride' && data?.rideId) {
      router.push(`/ride/${data.rideId}` as never);
    } else if (data?.screen === 'bike' && data?.bikeId) {
      router.push(`/bike/${data.bikeId}` as never);
    }
  });
}
