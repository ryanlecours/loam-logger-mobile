import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

const ENTITLEMENT_ID = 'Loam Logger Pro';

let initializedUserId: string | null = null;

/**
 * Initialize RevenueCat SDK with the current user's ID.
 * The appUserID must be the Loam Logger user.id so RevenueCat webhooks
 * can identify which user to upgrade/downgrade.
 * Re-initializes if a different user logs in within the same app session.
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (Platform.OS === 'web' || initializedUserId === userId) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey: RC_API_KEY,
    appUserID: userId,
  });

  initializedUserId = userId;
}

/** Check if the current user has an active Pro entitlement */
export async function checkEntitlement(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/** Restore purchases from the user's App Store / Play Store account */
export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
