jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('expo-device', () => ({ isDevice: false }));

import * as Notifications from 'expo-notifications';
import {
  getNotificationPermissionStatus,
  registerForPushNotificationsAsync,
} from './notifications';

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getNotificationPermissionStatus', () => {
  it('treats a promptable denial as undetermined', async () => {
    // Android 13+ before the first request, or after a single refusal.
    getPermissions.mockResolvedValue({ status: 'denied', canAskAgain: true });
    await expect(getNotificationPermissionStatus()).resolves.toBe('undetermined');
  });

  it('reports denied only once the OS will not prompt again', async () => {
    getPermissions.mockResolvedValue({ status: 'denied', canAskAgain: false });
    await expect(getNotificationPermissionStatus()).resolves.toBe('denied');
  });

  it('reports granted', async () => {
    getPermissions.mockResolvedValue({ status: 'granted', canAskAgain: true });
    await expect(getNotificationPermissionStatus()).resolves.toBe('granted');
  });
});

describe('registerForPushNotificationsAsync', () => {
  it('still requests permission on a simulator, then skips the token', async () => {
    getPermissions.mockResolvedValue({ status: 'denied', canAskAgain: true });
    requestPermissions.mockResolvedValue({ status: 'granted' });

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});
