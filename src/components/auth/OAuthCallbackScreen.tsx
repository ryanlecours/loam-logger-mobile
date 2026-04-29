import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useOAuthCallback } from '../../hooks/useOAuthCallback';
import { colors } from '../../constants/theme';

interface OAuthCallbackScreenProps {
  /** Human-readable provider name shown in the failure Alert title. */
  providerLabel: string;
  /** Provider brand color used for the loading spinner. */
  brandColor: string;
}

/**
 * Shared landing page for every `app/oauth/<provider>.tsx` route. Renders a
 * brand-colored spinner against the app's dark background while the
 * `useOAuthCallback` hook reads the success/error params, surfaces an
 * Alert if needed, and redirects back to Settings.
 *
 * Backgrounded against the app theme rather than `#fff` so the user
 * doesn't briefly see a white flash on the dark UI during the 300ms
 * dismiss-and-redirect beat.
 */
export function OAuthCallbackScreen({
  providerLabel,
  brandColor,
}: OAuthCallbackScreenProps) {
  const { status, reason } = useLocalSearchParams<{ status?: string; reason?: string }>();
  useOAuthCallback(providerLabel, status, reason);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={brandColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
