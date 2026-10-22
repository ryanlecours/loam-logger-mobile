import { useEffect } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeatureFlagWithPayload } from 'posthog-react-native';
import { posthog } from '../../lib/posthog';
import { useIsOnline } from '../../lib/connectivity';
import { colors } from '../../constants/theme';

/**
 * PostHog feature flag that switches the service outage banner on. Shared
 * with the web app, and deliberately not served by our own API: the banner
 * exists for the moments when that API is down. Toggle it in PostHog
 * (Feature flags, "ops" tag); no release involved.
 */
export const OUTAGE_FLAG_KEY = 'service-outage-banner';

export const DEFAULT_OUTAGE_MESSAGE =
  'Loam Logger is experiencing a service outage. I am aware of the issue and working on restoring functionality as quickly as possible.';

/**
 * Turn a flag evaluation into the message to show, or null when the flag is
 * off. The payload may be `{ message }`, a bare string, or missing; blank
 * copy falls back to the default so an empty payload never renders an empty
 * strip. Mirrors the web app's readOutageNotice.
 */
export function readOutageMessage(enabled: unknown, payload: unknown): string | null {
  if (enabled !== true) return null;
  const raw =
    typeof payload === 'string'
      ? payload
      : payload && typeof payload === 'object'
        ? (payload as { message?: unknown }).message
        : undefined;
  const message = typeof raw === 'string' ? raw.trim() : '';
  return message || DEFAULT_OUTAGE_MESSAGE;
}

/**
 * Global service-outage strip under the status bar. Unlike OfflineBanner this
 * is a warning: the rider's device is fine, our side is not, and they should
 * know someone is on it rather than retry or reinstall. Caution voice
 * (terracotta), never the health ramp: an outage is not a component state.
 *
 * Flags load at launch; the SDK is asked again each time the app returns to
 * the foreground so the strip appears, and clears, without a relaunch. Never
 * shows in dev or preview builds, where PostHog is disabled.
 */
export function OutageBanner() {
  const [enabled, payload] = useFeatureFlagWithPayload(OUTAGE_FLAG_KEY);
  const online = useIsOnline();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void posthog.reloadFeatureFlagsAsync();
    });
    return () => subscription.remove();
  }, []);

  const message = readOutageMessage(enabled, payload);
  if (!message) return null;

  // OfflineBanner renders directly above this one and already reserves the
  // status bar inset while offline; only pad for it when that strip is gone.
  const paddingTop = (online ? insets.top : 0) + 8;

  return (
    <View
      style={[styles.banner, { paddingTop }]}
      accessibilityRole="alert"
      accessibilityLabel={message}
      testID="outage-banner"
    >
      <Ionicons name="warning-outline" size={14} color={colors.cautionOn} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cautionBorder,
  },
  text: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
