import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { useNotifications } from '../../src/hooks/useNotifications';
import { getAccessToken } from '../../src/lib/auth';
import { isUnauthorizedError } from '../../src/utils/errors';
import { buildSpokesComponentsInput } from '../../src/utils/bikeFormHelpers';
import { colors } from '../../src/constants/theme';

interface BulletProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const BULLETS: BulletProps[] = [
  {
    icon: 'cloud-download-outline',
    title: 'Auto-imported rides',
    description: 'Get a heads-up when new rides sync from Strava, Garmin, WHOOP, or Suunto.',
  },
  {
    icon: 'construct-outline',
    title: 'Service reminders',
    description: 'We’ll let you know when components are due for maintenance.',
  },
  {
    icon: 'bicycle-outline',
    title: 'Bike assignment prompts',
    description: 'If you have multiple bikes, we’ll ask which one a new ride belongs to.',
  },
];

function Bullet({ icon, title, description }: BulletProps) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.bulletText}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.bulletDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function NotificationsOnboardingScreen() {
  const { refetchUser, logout } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const { requestPermissions } = useNotifications();
  const [submitting, setSubmitting] = useState(false);

  const finishOnboarding = useCallback(async () => {
    const bike = onboardingData.selectedBike;
    if (!bike) {
      Alert.alert('Error', 'Bike data missing. Please go back and try again.');
      return;
    }

    const isManual = bike.id.startsWith('manual-');

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

      const spokesComponents = isManual ? undefined : buildSpokesComponentsInput(bike.components);

      const response = await fetch(`${apiUrl}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: onboardingData.age,
          bikeMake: bike.maker,
          bikeModel: bike.model,
          bikeYear: bike.year,
          spokesId: isManual ? undefined : bike.id,
          spokesUrl: bike.spokesUrl,
          thumbnailUrl: onboardingData.selectedImageUrl || bike.thumbnailUrl,
          family: bike.family,
          category: bike.category,
          subcategory: bike.subcategory,
          buildKind: bike.buildKind,
          isFrameset: bike.isFrameset,
          isEbike: bike.isEbike,
          gender: bike.gender,
          frameMaterial: bike.frameMaterial,
          hangerStandard: bike.hangerStandard,
          spokesComponents,
          nickname: onboardingData.nickname?.trim() || undefined,
          notes: onboardingData.notes?.trim() || undefined,
          acquisitionCondition: onboardingData.acquisitionCondition,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to complete onboarding' }));
        throw new Error(error.message || 'Failed to complete onboarding');
      }

      await refetchUser();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await logout();
        return;
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to complete onboarding'
      );
    } finally {
      setSubmitting(false);
    }
  }, [onboardingData, refetchUser, logout]);

  const handleEnable = useCallback(async () => {
    // Trigger the OS permission dialog. We don't gate completion on the
    // result — granted or denied, we still finish onboarding. Users who
    // deny can re-enable later from Settings. finishOnboarding owns the
    // submitting state via its own try/finally.
    try {
      await requestPermissions();
    } catch {
      // Permission request errors are non-fatal — proceed regardless.
    }
    await finishOnboarding();
  }, [requestPermissions, finishOnboarding]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Stay in sync</Text>
        <Text style={styles.subtitle}>
          Notifications keep you on top of rides and component health. You can change these anytime in Settings.
        </Text>

        <View style={styles.bullets}>
          {BULLETS.map((b) => (
            <Bullet key={b.title} {...b} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleEnable}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>Enable Notifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={finishOnboarding}
          disabled={submitting}
        >
          <Text style={styles.skipText}>Not now</Text>
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
  bullets: {
    gap: 16,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bulletDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
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
  buttonDisabled: {
    opacity: 0.6,
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
