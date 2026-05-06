import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { useIntegrationConnect } from '../../src/hooks/useIntegrationConnect';
import { colors } from '../../src/constants/theme';
import type { IntegrationProvider } from '../../src/api/integrations';

interface ProviderConfig {
  provider: IntegrationProvider;
  label: string;
  brandColor: string;
}

const PROVIDERS: ProviderConfig[] = [
  { provider: 'strava', label: 'Strava', brandColor: '#fc4c02' },
  { provider: 'garmin', label: 'Garmin', brandColor: '#007dc3' },
  { provider: 'whoop', label: 'WHOOP', brandColor: '#00a651' },
  { provider: 'suunto', label: 'Suunto', brandColor: '#0072CE' },
];

function ConnectRow({ provider, label, brandColor }: ProviderConfig) {
  const { status, loading, connecting, connect } = useIntegrationConnect(provider);

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
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.connectButton, { backgroundColor: brandColor }]}
        onPress={connect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.connectButtonText}>Connect</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ConnectScreen() {
  const router = useRouter();
  const { data: onboardingData } = useOnboarding();

  const goToNotifications = useCallback(() => {
    if (!onboardingData.selectedBike) {
      Alert.alert('Error', 'Bike data missing. Please go back and try again.');
      return;
    }
    router.push('/(onboarding)/notifications' as Href);
  }, [onboardingData.selectedBike, router]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Connect Data Sources</Text>
        <Text style={styles.subtitle}>
          Auto-import rides from your devices and backfill previous activity. You can do this anytime in Settings.
        </Text>

        <View style={styles.providers}>
          {PROVIDERS.map((p) => (
            <ConnectRow key={p.provider} {...p} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={goToNotifications}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={goToNotifications}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 76,
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  providers: {
    gap: 12,
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
    borderRadius: 6,
    minWidth: 96,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
