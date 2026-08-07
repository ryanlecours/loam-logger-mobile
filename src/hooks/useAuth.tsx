import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useApolloClient } from '@apollo/client';
import { UnregisterPushTokenDocument, type UserRole } from '../graphql/generated';
import { getCurrentPushTokenIfGranted } from '../lib/notifications';
import {
  getAccessToken,
  hasValidAccessToken,
  logout as logoutAuth,
  refreshAccessToken,
  setTokenRefreshCallback,
  type User,
} from '../lib/auth';
import {
  authenticateWithBiometric,
  isBiometricAvailable,
  isBiometricEnabled,
  type AuthenticateResult,
} from '../lib/biometric';
import { purgePersistedCache } from '../lib/apolloClient';
import { clearOutbox } from '../lib/outbox';
import { useViewer } from './useViewer';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /**
   * True when the user has a stored session token but hasn't passed the
   * biometric unlock prompt yet. Distinct from `!isAuthenticated`, which
   * means "no session at all, send to login." Locked means "session exists,
   * show biometric prompt screen."
   */
  locked: boolean;
  // Gating flags (derived from user for convenience)
  hasAcceptedCurrentTerms: boolean;
  onboardingCompleted: boolean;
  role: UserRole | null;
  mustChangePassword: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  /**
   * Run the biometric prompt; returns the structured result so callers can
   * distinguish user-cancellation (silent UX) from a real failure (error UX).
   */
  unlock: () => Promise<AuthenticateResult>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useApolloClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [locked, setLocked] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Use ME query to fetch full user data when authenticated
  const { viewer, loading: viewerLoading, error: viewerError, resolved: viewerResolved, refetchViewer } = useViewer({
    skip: !isAuthenticated,
  });

  // Check for existing token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getAccessToken();
      if (!token) return; // Unauthenticated — leave isAuthenticated=false

      // Access tokens are short-lived (15m). For users who reopen the app
      // frequently, the stored token is usually still valid — skip the
      // /auth/mobile/refresh round-trip in that case to keep cold-boot fast.
      // Only pre-refresh when the token is actually stale (or close to it,
      // so we don't send a request that expires mid-flight).
      //
      // If refresh is rejected (refresh token expired/revoked),
      // refreshAccessToken already cleared SecureStore — drop straight to
      // the login screen without showing the biometric prompt. Sending the
      // user through Face ID just to dump them at login is bad UX.
      //
      // 'unavailable' is different: no signal at a trailhead or the API is
      // mid-deploy. The session is probably fine, so proceed as
      // authenticated; the ME query's transient-error retry (below) picks
      // things up when connectivity returns. Bouncing to login here would
      // strand a rider who cannot reach the login endpoint either.
      if (!(await hasValidAccessToken())) {
        const refresh = await refreshAccessToken();
        if (refresh.outcome === 'invalid') return;
      }

      // Session is valid. If the user opted into biometric unlock AND the
      // device still supports it, require a biometric pass before flipping
      // authenticated. Otherwise skip straight in.
      const [enabled, available] = await Promise.all([
        isBiometricEnabled(),
        isBiometricAvailable(),
      ]);

      if (enabled && available) {
        setLocked(true);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
    } finally {
      setInitializing(false);
    }
  }

  /**
   * Run the biometric prompt and flip locked→authenticated on success.
   * Called by the lock screen UI when the user taps the unlock button.
   *
   * Returns the structured AuthenticateResult so the caller can render
   * different UX for cancellation vs lockout vs actual failure — e.g. a
   * tap-Cancel on the Face ID sheet should NOT render a red "failed" error.
   */
  const unlock = useCallback(async (): Promise<AuthenticateResult> => {
    const result = await authenticateWithBiometric('Unlock Loam Logger');
    if (result.ok) {
      setLocked(false);
      setIsAuthenticated(true);
    }
    return result;
  }, []);

  // When viewer data arrives from ME query, update user state
  useEffect(() => {
    if (viewer) {
      // Map ME query response to User type
      const mappedUser: User = {
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
        avatarUrl: viewer.avatarUrl,
        onboardingCompleted: viewer.onboardingCompleted,
        hasAcceptedCurrentTerms: viewer.hasAcceptedCurrentTerms,
        role: viewer.role,
        mustChangePassword: viewer.mustChangePassword,
        isFoundingRider: viewer.isFoundingRider,
        subscriptionTier: viewer.subscriptionTier,
        needsDowngradeSelection: viewer.needsDowngradeSelection,
        hoursDisplayPreference: viewer.hoursDisplayPreference,
        predictionMode: viewer.predictionMode,
        distanceUnit: viewer.distanceUnit,
        // Notification prefs. notifyOnRideUpload is intentionally not
        // mapped here: nothing in the app reads it any more (Settings uses
        // rideSyncNotificationMode, its replacement), so it's dropped from
        // this query and this type rather than carried as a dead field.
        rideSyncNotificationMode: viewer.rideSyncNotificationMode,
        weeklyDigestEnabled: viewer.weeklyDigestEnabled,
        createdAt: viewer.createdAt,
      };
      setUser(mappedUser);

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[useAuth] ME query resolved:', {
          id: mappedUser.id,
          email: mappedUser.email,
          hasAcceptedCurrentTerms: mappedUser.hasAcceptedCurrentTerms,
          onboardingCompleted: mappedUser.onboardingCompleted,
          role: mappedUser.role,
        });
      }
    }
  }, [viewer]);

  // Handle ME query errors - if the query fails, log out the user
  // This handles cases like invalid/expired tokens that can't be refreshed
  const logout = useCallback(async () => {
    // Unregister this device's push token BEFORE dropping auth (the mutation
    // needs an authenticated request). Without this, the server keeps
    // pushing this account's rides and service alerts to a device its owner
    // walked away from; on a shared or handed-down device the next
    // signed-in user reads the previous one's notifications.
    //
    // Uses unregisterPushToken(token), NOT updateUserPreferences(expoPushToken:
    // null): expoPushToken is one column per USER, not per device, so the
    // same account signed into two devices shares a single slot and
    // whichever registers last silently wins it. A blind null would let a
    // logout on the device that already lost that race kill push on a
    // different, currently-active device. Passing our own token makes the
    // server-side clear conditional on it still being the one on file.
    //
    // getCurrentPushTokenIfGranted never prompts, so logout can't pop an OS
    // permission dialog for a user who denied notifications. Best-effort
    // with a hard cap either way: logout is also invoked on already-dead
    // sessions (ME-query failure), where this mutation can only fail, and
    // it must never hold the user hostage offline.
    const token = await getCurrentPushTokenIfGranted().catch(() => null);
    if (token) {
      await Promise.race([
        client
          .mutate({
            mutation: UnregisterPushTokenDocument,
            variables: { token },
          })
          .catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }

    await logoutAuth();
    await client.clearStore(); // Clear Apollo cache
    // The in-memory cache is now empty, but its disk copy and any queued
    // offline mutations would leak this rider's data to the next account
    // on this device. Purge both.
    await purgePersistedCache();
    await clearOutbox().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
    setLocked(false);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[useAuth] Logged out, cleared push token, tokens and Apollo cache');
    }
  }, [client]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (viewerError && !viewerLoading) {
      // Only an auth-shaped rejection means the session is dead. The error
      // link has already tried a token refresh by the time UNAUTHENTICATED
      // reaches here, so seeing it means the refresh token itself was
      // rejected: log out.
      const authRejected = viewerError.graphQLErrors?.some(
        (err) => err.extensions?.code === 'UNAUTHENTICATED',
      );
      if (authRejected) {
        console.error('[useAuth] ME query unauthenticated:', viewerError.message);
        logout();
        return;
      }

      // Network error or server 5xx: transient, and out of cell range is
      // this app's normal operating condition. Logging out here (as an
      // earlier version did) killed sessions mid-ride. Stay signed in and
      // poll until connectivity returns; the OfflineBanner covers the UX.
      console.warn('[useAuth] ME query failed transiently, will retry:', viewerError.message);
      const timer = setTimeout(() => {
        refetchViewer().catch(() => {
          // Failure updates viewerError, which re-runs this effect and
          // arms the next retry.
        });
      }, 10_000);
      return () => clearTimeout(timer);
    }

    // Resolved cleanly but no user: the server answered and couldn't
    // identify one (deleted account). Treat as an auth failure so the user
    // lands on login instead of getting stuck on a loading screen or
    // flashed through gates with default-false flags. The !viewerError
    // guard matters: a transient failure also leaves viewer null, and it
    // must take the retry path above, not this one.
    if (viewerResolved && !viewer && !viewerLoading && !viewerError) {
      console.warn('[useAuth] ME query resolved with no user — logging out');
      logout();
    }
  }, [viewerError, viewerLoading, viewerResolved, viewer, isAuthenticated, logout, refetchViewer]);

  // Register token refresh callback to refetch user when token is refreshed
  const refetchUser = useCallback(async () => {
    try {
      await refetchViewer();
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  }, [refetchViewer]);

  useEffect(() => {
    setTokenRefreshCallback(() => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[useAuth] Token refreshed, refetching user...');
      }
      refetchUser();
    });
    return () => setTokenRefreshCallback(null);
  }, [refetchUser]);

  // Loading while initializing (checking SecureStore), or while authenticated
  // and the ME query hasn't yielded a populated viewer yet.
  //
  // Deliberately NOT gating on `viewerLoading` alone. Apollo has a one-render
  // window between `skip: true → false` where the hook returns
  // `{ loading: false, data: undefined }` before the query actually fires.
  // If we consulted only `viewerLoading`, the gate in app/_layout.tsx would
  // run during that window with `hasAcceptedCurrentTerms = false` (no viewer
  // yet, so the fallback wins) and redirect the user to the Terms screen.
  //
  // The `!viewer` clause covers a second flash window: `viewerResolved` flips
  // true the moment `data !== undefined`, even when `data.me === null` (e.g.
  // server returned null, network error). Without `!viewer`, that single
  // render leaks `hasAcceptedCurrentTerms = false` to the gate and produces
  // a ~1–2s Terms screen flash before the logout-effect cleans up. Keeping
  // `loading = true` until viewer is populated lets the LoadingScreen stay
  // mounted. Auth-rejected/null cases are unblocked by the logout-effect
  // flipping `isAuthenticated` back to false (which short-circuits this
  // expression); a transient ME failure before the first viewer arrives
  // keeps the LoadingScreen up while the retry loop polls for connectivity.
  const loading = initializing || (isAuthenticated && (!viewerResolved || !viewer));

  // Derive gating flags from viewer first (available immediately when query resolves),
  // then user state (set one render later via useEffect). This prevents a flash to
  // the terms screen between viewer resolving and user state being set.
  const hasAcceptedCurrentTerms = viewer?.hasAcceptedCurrentTerms ?? user?.hasAcceptedCurrentTerms ?? false;
  const onboardingCompleted = viewer?.onboardingCompleted ?? user?.onboardingCompleted ?? false;
  const role = user?.role ?? null;
  const mustChangePassword = user?.mustChangePassword ?? false;

  // Allow login screens to trigger authentication state change
  const setAuthenticated = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        locked,
        hasAcceptedCurrentTerms,
        onboardingCompleted,
        role,
        mustChangePassword,
        setUser,
        setAuthenticated,
        unlock,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
