import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { client } from '../src/lib/apolloClient';
import { useEffect } from 'react';
import { colors } from '../src/constants/theme';
import { configureNotificationHandler, setupNotificationResponseListener } from '../src/lib/notifications';
import { useNotifications } from '../src/hooks/useNotifications';
import { useUserTier } from '../src/hooks/useUserTier';
import { initializeRevenueCat } from '../src/lib/revenuecat';
import { getStoredUser } from '../src/lib/auth';
import { DowngradeSelectionModal } from '../src/components/common/DowngradeSelectionModal';
import { LockScreen } from '../src/components/LockScreen';
import { scrubKnownSecrets } from '../src/lib/sentry-scrub';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Tag every event with the build SHA so Sentry can group errors by release.
  // EAS injects EXPO_PUBLIC_SENTRY_RELEASE at build time; local dev falls back
  // to 'unknown' (inert since enabled: !__DEV__).
  release: process.env.EXPO_PUBLIC_SENTRY_RELEASE || 'unknown',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enabled: !__DEV__,
  // Strip secret-looking keys (password, token, cookie, etc.) from every
  // event before it leaves the device.
  beforeSend(event) {
    return scrubKnownSecrets(event);
  },
});

// Configure foreground notification display at module level
configureNotificationHandler();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function RootLayoutNav() {
  const {
    loading,
    isAuthenticated,
    locked,
    hasAcceptedCurrentTerms,
    onboardingCompleted,
  } = useAuth();
  const { needsDowngradeSelection } = useUserTier();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];
    const secondSegment = segments[1];
    const inAuthGroup = firstSegment === '(auth)';
    const inOnboardingGroup = firstSegment === '(onboarding)';

    // 1. AuthGate: Not authenticated -> login
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // User IS authenticated - don't let them stay in auth group, EXCEPT for
    // /reset-password. A user can be logged in on their phone and still tap a
    // reset link from email (e.g. they remembered their password mid-reset, or
    // an admin sent them one). Bouncing them to /(tabs) would discard the
    // token and break the reset flow. The reset screen handles its own
    // session invalidation when the new password is saved.
    if (inAuthGroup && secondSegment !== 'reset-password') {
      // Determine where they should go based on flags
      if (!hasAcceptedCurrentTerms) {
        router.replace('/(onboarding)/terms');
      } else if (!onboardingCompleted) {
        router.replace('/(onboarding)/age');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    // 2. TermsGate: Authenticated but no terms -> terms screen
    if (!hasAcceptedCurrentTerms) {
      if (!inOnboardingGroup || secondSegment !== 'terms') {
        router.replace('/(onboarding)/terms');
      }
      return;
    }

    // 3. OnboardingGate: Terms accepted but onboarding incomplete -> onboarding
    if (!onboardingCompleted) {
      // Allow navigation within onboarding group (age, bike)
      // but not to terms (already accepted)
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)/age');
      } else if (secondSegment === 'terms') {
        router.replace('/(onboarding)/age');
      }
      return;
    }

    // 4. Fully gated user - redirect to tabs from onboarding OR from the
    //    landing index route (firstSegment undefined). Without this clause,
    //    a logged-in, fully-onboarded user landing on `/` would see the
    //    loading spinner forever because none of gates 1–3 fire for them.
    const onIndex = firstSegment === undefined;
    if (inOnboardingGroup || onIndex) {
      router.replace('/(tabs)');
    }
  }, [loading, isAuthenticated, hasAcceptedCurrentTerms, onboardingCompleted, segments, router]);

  // Register push token and set up notification tap handler when fully authenticated
  const { registerTokenIfGranted } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated || !onboardingCompleted) return;

    // Register/refresh push token
    registerTokenIfGranted();

    // Handle notification taps (navigate to relevant screen)
    const subscription = setupNotificationResponseListener(router);
    return () => subscription.remove();
  }, [isAuthenticated, onboardingCompleted, registerTokenIfGranted, router]);

  // Initialize RevenueCat and set Sentry user context
  useEffect(() => {
    if (!isAuthenticated || !onboardingCompleted) return;

    getStoredUser().then((user) => {
      if (user?.id) {
        initializeRevenueCat(user.id);
        Sentry.setUser({ id: user.id });
      }
    });
  }, [isAuthenticated, onboardingCompleted]);

  // Show loading while auth initializes
  if (loading) {
    return <LoadingScreen />;
  }

  // Biometric-unlock opt-in: user has a stored session token but hasn't
  // passed Face ID / Touch ID yet this launch. Show the unlock screen
  // instead of letting the router navigate into the app.
  if (locked) {
    return <LockScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack
        // `index` is a transient landing route (spinner only) so cold-boot
        // navigation is deterministic — see app/index.tsx.
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="bike"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ride"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="oauth" />
        <Stack.Screen name="billing-success" options={{ headerShown: false }} />
        <Stack.Screen name="billing-cancelled" options={{ headerShown: false }} />
        <Stack.Screen name="billing-return" options={{ headerShown: false }} />
        <Stack.Screen name="closed-beta" />
        <Stack.Screen name="waitlist" />
      </Stack>
      {isAuthenticated && needsDowngradeSelection && <DowngradeSelectionModal />}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ApolloProvider>
  );
}

export default Sentry.wrap(RootLayout);
