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
 * Pure routing helper for a notification's data payload. Shared between the
 * live tap listener (`setupNotificationResponseListener`) and the cold-start
 * replay path (`usePendingNotificationRoute`) so both arrive at the same
 * screen for the same payload.
 *
 * `data.action` is an optional hint that the destination screen should
 * surface a specific UI affordance on mount. Today the only action is
 * `pickBike`, used by the bike-assignment notification fired for new
 * unassigned rides on multi-bike accounts (see fireRideNotifications in
 * the API). The ride detail screen reads the `?action=pickBike` query
 * param and auto-opens its bike picker.
 *
 * Returns `true` if a route was dispatched, `false` if the payload was
 * unrecognized — useful for the cold-start path to decide whether to clear
 * its queued response.
 */
export function navigateFromNotificationData(
  router: Router,
  data: unknown,
): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (d.screen === 'ride' && typeof d.rideId === 'string') {
    const action = typeof d.action === 'string' ? d.action : null;
    const path = action
      ? `/ride/${d.rideId}?action=${encodeURIComponent(action)}`
      : `/ride/${d.rideId}`;
    router.push(path as never);
    return true;
  }
  if (d.screen === 'bike' && typeof d.bikeId === 'string') {
    // Service-due notifications for a single component carry that
    // component's id in the payload so the bike detail screen can scroll
    // it into view and auto-open its action sheet — saves the user from
    // hunting for the offending row on a bike with many components.
    // Multi-component notifications omit componentId (no single focus).
    const componentId = typeof d.componentId === 'string' ? d.componentId : null;
    const path = componentId
      ? `/bike/${d.bikeId}?componentId=${encodeURIComponent(componentId)}`
      : `/bike/${d.bikeId}`;
    router.push(path as never);
    return true;
  }
  return false;
}

/**
 * Set up a listener for when the user taps a notification while the app is
 * already running (warm path). Cold-start taps — i.e. taps that *launch*
 * the killed app — go through `usePendingNotificationRoute` instead, since
 * the JS runtime hasn't registered this listener yet at that point.
 */
export function setupNotificationResponseListener(router: Router) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromNotificationData(
      router,
      response.notification.request.content.data,
    );
  });
}
