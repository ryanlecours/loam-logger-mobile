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

  // Status only, not the full snapshot. See useRecorderStatus for why.
  const recorderStatus = useRecorderStatus();

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];
    const secondSegment = segments[1];
    const inAuthGroup = firstSegment === '(auth)';
    const inOnboardingGroup = firstSegment === '(onboarding)';

    // 1. AuthGate: Not authenticated -> login
    if (!isAuthenticated) {
      // ...unless a recording is in progress on the recording screens.
      // Recording is local-only work (GPS sampling into SQLite); auth plays
      // no part in it, and replacing the route here would unmount the
      // recording UI and strand the session. Let the rider finish: the save
      // path queues the ride to the durable outbox on UNAUTHENTICATED, and
      // it uploads after the next sign-in. Once they leave these screens
      // (save or discard both navigate away), this gate fires normally.
      const recorderLive = recorderStatus !== 'idle';
      const onRecordingScreens =
        firstSegment === 'ride' &&
        (secondSegment === 'record' || secondSegment === 'save-recording');
      if (recorderLive && onRecordingScreens) return;

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
    <ApolloProvider client={client}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ApolloProvider>
  );
}

export default Sentry.wrap(RootLayout);
