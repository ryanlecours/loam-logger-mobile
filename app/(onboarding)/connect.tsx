import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { posthog } from '../../src/lib/posthog';
import { colors } from '../../src/constants/theme';
import { Screen } from '../../src/components/common/Screen';
import { ProviderConnectList } from '../../src/components/integrations/ProviderConnectList';

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

  // Connect is the one onboarding step a rider can pass without the product
  // working for them afterwards, so the skip is recorded. The API fires
  // provider_connect_started when a Connect button is pressed; this is the
  // other branch, so the funnel can tell "never pressed Connect" from
  // "connected and came back". Continue and Skip otherwise do the same thing.
  const skipConnect = useCallback(() => {
    posthog.capture('onboarding_connect_skipped', { step: 'connect' });
    goToNotifications();
  }, [goToNotifications]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Connect Data Sources</Text>
        <Text style={styles.subtitle}>
          Auto-import rides from your devices and backfill previous activity. You can do this anytime in Settings.
        </Text>

        {/* The same rows the dashboard shows a rider who skipped this step. */}
        <ProviderConnectList />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={goToNotifications}
          testID="onboarding-connect-continue"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipConnect}
          testID="onboarding-connect-skip"
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
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
  buttonContainer: {
    gap: 12,
    paddingHorizontal: 24,
    // Design spacing only. Screen adds the home-indicator inset on top.
    paddingBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.onPrimary,
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
