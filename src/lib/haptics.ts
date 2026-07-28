import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper over expo-haptics.
 *
 * Two reasons it exists rather than calling Haptics directly at each site.
 * First, haptics are a no-op on web and can reject there, and a failed buzz
 * must never surface as an unhandled rejection in a screen. Second, it keeps
 * the vocabulary small: a selection tick for "you changed what you are looking
 * at", success and warning for outcomes. Scattering the full expo-haptics
 * palette through the app is how a phone ends up buzzing at everything.
 *
 * Anything that changes what is on screen without a visible transition earns a
 * tick. Anything routine does not.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** A value changed: bike switched, timeframe switched, segment picked. */
export function selectionTick() {
  if (!supported) return;
  Haptics.selectionAsync().catch(() => {
    // A device with no taptic engine, or the user disabled it. Not an error.
  });
}

/** A write landed: service logged, component replaced, snooze applied. */
export function successTick() {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A write failed, or an action needs attention before it can proceed. */
export function warningTick() {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
