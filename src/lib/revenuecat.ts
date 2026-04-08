import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY = 'appl_PCpaBxHHtSUMtzvrbyupJifgBgD';

const ENTITLEMENT_ID = 'Loam Logger Pro';

let initialized = false;

/**
 * Initialize RevenueCat SDK with the current user's ID.
 * The appUserID must be the Loam Logger user.id so RevenueCat webhooks
 * can identify which user to upgrade/downgrade.
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (Platform.OS === 'web' || initialized) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey: RC_API_KEY,
    appUserID: userId,
  });

  initialized = true;
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
