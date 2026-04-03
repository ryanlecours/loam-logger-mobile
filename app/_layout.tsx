import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { client } from '../src/lib/apolloClient';
import { useEffect } from 'react';
import { colors } from '../src/constants/theme';
import { configureNotificationHandler, setupNotificationResponseListener } from '../src/lib/notifications';
import { useNotifications } from '../src/hooks/useNotifications';
import { useUserTier } from '../src/hooks/useUserTier';
import { DowngradeSelectionModal } from '../src/components/common/DowngradeSelectionModal';

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

    // User IS authenticated - don't let them stay in auth group
    if (inAuthGroup) {
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

    // 4. Fully gated user - redirect to tabs if in onboarding
    if (inOnboardingGroup) {
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

  // Show loading while auth initializes
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
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
            headerShown: true,
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

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ApolloProvider>
  );
}
