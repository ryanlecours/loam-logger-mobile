import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIntegrationConnect } from '../../hooks/useIntegrationConnect';
import { colors, radius } from '../../constants/theme';
import { GARMIN_CONNECT_APP_NAME } from '../../constants/garminAttribution';
import type { IntegrationProvider } from '../../api/integrations';
import type { OAuthReturnTarget } from '../../lib/oauthReturn';

export interface ProviderConfig {
  provider: IntegrationProvider;
  label: string;
  brandColor: string;
}

/** Every ride provider, in the order both apps list them. */
export const PROVIDERS: ProviderConfig[] = [
  { provider: 'strava', label: 'Strava', brandColor: colors.strava },
  // Full app name, per the Garmin API Brand Guidelines' rule against
  // abbreviating or stylizing it when displaying a connection.
  { provider: 'garmin', label: GARMIN_CONNECT_APP_NAME, brandColor: colors.garmin },
  { provider: 'whoop', label: 'WHOOP', brandColor: colors.whoop },
  { provider: 'suunto', label: 'Suunto', brandColor: colors.suunto },
];

interface ProviderConnectRowProps extends ProviderConfig {
  /** Prefix for the row's testID, so two surfaces can host the same rows. */
  testIDPrefix?: string;
  /** Where the OAuth callback lands afterwards; see useIntegrationConnect. */
  returnTo?: OAuthReturnTarget;
}

/**
 * One provider: its name, and a Connect button that runs that provider's OAuth
 * in the in-app browser, or a Connected badge. Shared by the onboarding
 * Connect step and the dashboard's "no ride source" card, so a rider gets the
 * same four buttons wherever the product asks for a source. The partner color
 * fills only the partner's own control (the Guest Jersey Rule).
 */
export function ProviderConnectRow({
  provider,
  label,
  brandColor,
  testIDPrefix = 'onboarding-connect',
  returnTo,
}: ProviderConnectRowProps) {
  const { status, loading, connecting, connect, error } = useIntegrationConnect(provider, { returnTo });

  if (loading) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <ActivityIndicator size="small" color={brandColor} />
      </View>
    );
  }

  if (status?.connected) {
    return (
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: brandColor }]}>{label}</Text>
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={brandColor} />
          <Text style={[styles.connectedText, { color: brandColor }]}>Connected</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: brandColor }]}
          onPress={connect}
          disabled={connecting}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${label}`}
          testID={`${testIDPrefix}-${provider}`}
        >
          {connecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.connectButtonText}>Connect</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* A start that fails before the browser opens (rate limit, provider
          not configured, no network) used to be silent: the spinner stopped
          and nothing explained why. */}
      {error && (
        <Text style={styles.errorText} testID={`${testIDPrefix}-${provider}-error`}>
          {error}
        </Text>
      )}
    </View>
  );
}

/** All four providers, stacked. */
export function ProviderConnectList({
  testIDPrefix,
  returnTo,
}: {
  testIDPrefix?: string;
  returnTo?: OAuthReturnTarget;
}) {
  return (
    <View style={styles.list}>
      {PROVIDERS.map((p) => (
        <ProviderConnectRow key={p.provider} {...p} testIDPrefix={testIDPrefix} returnTo={returnTo} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 60,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    // Partner-branded control: the fill is the provider's color, so the shape
    // stays conservative rather than taking our pill. The 8pt floor still applies.
    borderRadius: radius.sm,
    minWidth: 96,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.criticalOn,
    fontSize: 14,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
