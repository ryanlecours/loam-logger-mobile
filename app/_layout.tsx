import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { client, restoreApolloCache } from '../src/lib/apolloClient';
import { initOfflineSync } from '../src/lib/offlineSync';
import { rideRecorder } from '../src/lib/recording/recorder';
// Side-effect import: registers the ride-recording TaskManager task at
// module scope. Must run on every JS launch before the task can deliver a
// batch, including a launch that happens in the background.
import '../src/lib/recording/locationTask';
import { useEffect, useRef, useState } from 'react';
import { colors } from '../src/constants/theme';
import { configureNotificationHandler, setupNotificationResponseListener } from '../src/lib/notifications';
import { useNotifications } from '../src/hooks/useNotifications';
import { useRecorderStatus, isRecorderLive } from '../src/hooks/useRecorderStatus';
import { usePendingNotificationRoute } from '../src/hooks/usePendingNotificationRoute';
import { useUserTier } from '../src/hooks/useUserTier';
import { initializeRevenueCat } from '../src/lib/revenuecat';
import { getStoredUser } from '../src/lib/auth';
import { DowngradeSelectionModal } from '../src/components/common/DowngradeSelectionModal';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { OutageBanner } from '../src/components/common/OutageBanner';
import { LockScreen } from '../src/components/LockScreen';
import { scrubKnownSecrets } from '../src/lib/sentry-scrub';
import { PostHogProvider } from 'posthog-react-native';
import { posthog, posthogAutocapture, screenNameFromSegments } from '../src/lib/posthog';
import { usePostHogScreens, usePostHogUser } from '../src/hooks/usePostHogUser';
import { resolveGateRedirect } from '../src/lib/routeGate';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // No `release` on purpose. Left unset, the SDK reads it from the native
  // build as `bundleId@version+build`, which is also the release the EAS
  // build phase uploads source maps and debug symbols under. A release from
  // the environment never arrived: `eas build` runs on Expo's servers, which
  // do not see the GitHub runner's env, so every event was tagged 'unknown'.
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
    user,
    loading,
    isAuthenticated,
    locked,
    hasAcceptedCurrentTerms,
    onboardingCompleted,
  } = useAuth();
  const { needsDowngradeSelection } = useUserTier();
  const segments = useSegments() as string[];
  const router = useRouter();

  usePostHogUser(user);
  // Skip the launch route while auth loads; the redirect picks the real screen.
  usePostHogScreens(loading ? null : screenNameFromSegments(segments));

  // Status only, not the full snapshot. See useRecorderStatus for why.
  const recorderStatus = useRecorderStatus();

  // The gate order (auth, terms, onboarding, landing) lives in
  // src/lib/routeGate.ts as a pure function so it can be unit tested; this
  // effect only applies its answer.
  useEffect(() => {
    if (loading) return;

    const redirect = resolveGateRedirect({
      segments,
      isAuthenticated,
      hasAcceptedCurrentTerms,
      onboardingCompleted,
      recorderLive: recorderStatus !== 'idle',
    });
    if (redirect) {
      router.replace(redirect);
    }
  }, [loading, isAuthenticated, locked, hasAcceptedCurrentTerms, onboardingCompleted, segments, router, recorderStatus]);

  // A live recorder session with no recording UI on screen means the app
  // relaunched (or navigated away) mid-ride: restoreIfNeeded() rebuilt the
  // session on boot, but the rider is looking at the dashboard with no sign
  // their ride survived. Put the record screen back in front of them once
  // the gates clear. The ref makes the push once-per-liveness so this never
  // fights navigation, and the segments check keeps the normal start flow
  // (already on the record screen) from pushing a duplicate.
  const resurfacedRef = useRef(false);
  useEffect(() => {
    const live = isRecorderLive(recorderStatus);
    if (!live) {
      resurfacedRef.current = false;
      return;
    }
    if (loading || !isAuthenticated || locked || !hasAcceptedCurrentTerms || !onboardingCompleted) {
      return;
    }
    const onRecordingScreens =
      segments[0] === 'ride' && (segments[1] === 'record' || segments[1] === 'save-recording');
    if (onRecordingScreens) {
      resurfacedRef.current = true;
      return;
    }
    if (!resurfacedRef.current) {
      resurfacedRef.current = true;
      router.push('/ride/record');
    }
  }, [recorderStatus, loading, isAuthenticated, locked, hasAcceptedCurrentTerms, onboardingCompleted, segments, router]);

  // Register push token and set up notification tap handler when fully authenticated
  const { registerTokenIfGranted } = useNotifications();

  // Captures cold-start notifications and notifications that arrived while
  // the user was locked / unauthenticated, then replays them once the auth
  // and lock gates clear. Without this, taps that LAUNCH the app (vs. taps
  // received while running) silently drop their deep-link, and warm taps
  // during the lock-screen window navigate a not-yet-mounted Stack. The
  // hook itself self-gates — safe to call unconditionally on every render.
  usePendingNotificationRoute();

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
  //
  // Deliberately NOT guarded by the live-recording check the auth gate
  // above has: `locked` is only ever set during the one-time checkAuth()
  // on mount, before any recording can exist, so the two states cannot
  // overlap today. If a re-lock trigger is ever added (e.g. lock on
  // backgrounding), this branch will replace the recording UI mid-ride
  // and needs the same recorderStatus exemption as the auth gate.
  if (locked) {
    return <LockScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <OfflineBanner />
      <OutageBanner />
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
        <Stack.Screen
          name="component-rides"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="component"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="oauth" />
        <Stack.Screen name="billing-success" options={{ headerShown: false }} />
        <Stack.Screen name="billing-cancelled" options={{ headerShown: false }} />
        <Stack.Screen name="billing-return" options={{ headerShown: false }} />
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
  // Block first render until the persisted Apollo cache is restored.
  // Mounting earlier would let screens fire queries against an empty cache,
  // then have the restore stomp whatever those queries wrote. The restore is
  // a local SQLite read, fast enough to hide inside the existing auth
  // loading state.
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    restoreApolloCache().finally(() => {
      setCacheReady(true);
      // Start connectivity monitoring and drain any rides queued on a
      // previous launch. After the restore: a drain refetches queries, and
      // those results should land in the restored cache, not a cold one.
      initOfflineSync();
      // A recording the previous process did not close out (crash, OS
      // jettison, force-quit mid-ride) is rebuilt from its SQLite rows,
      // paused. RootLayoutNav re-surfaces the record screen once the auth
      // gates clear so the rider decides: resume, finish, or discard.
      void rideRecorder.restoreIfNeeded();
    });
  }, []);

  if (!cacheReady) {
    return <LoadingScreen />;
  }

  return (
    <PostHogProvider client={posthog} autocapture={posthogAutocapture}>
      <ApolloProvider client={client}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ApolloProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
