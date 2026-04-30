import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useApolloClient } from '@apollo/client';
import type { UserRole } from '../graphql/generated';
import {
  getAccessToken,
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

      // Access tokens are short-lived (15m). On any cold-boot beyond that
      // window the stored token is already stale, so the post-unlock ME
      // query would 401 and the errorLink retry path would have to recover.
      // Pre-refresh here so the rest of the session uses a fresh token from
      // the very first request — no retry, no flicker, no risk of the
      // logout-on-error effect firing on a transient refresh failure.
      //
      // If refresh fails (refresh token expired/revoked), refreshAccessToken
      // already cleared SecureStore — drop straight to the login screen
      // without showing the biometric prompt. Sending the user through
      // Face ID just to dump them at login is bad UX.
      const refreshed = await refreshAccessToken();
      if (!refreshed) return;

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
        referralCode: viewer.referralCode,
        needsDowngradeSelection: viewer.needsDowngradeSelection,
        hoursDisplayPreference: viewer.hoursDisplayPreference,
        predictionMode: viewer.predictionMode,
        distanceUnit: viewer.distanceUnit,
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
    await logoutAuth();
    await client.clearStore(); // Clear Apollo cache
    setUser(null);
    setIsAuthenticated(false);
    setLocked(false);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[useAuth] Logged out, cleared tokens and Apollo cache');
    }
  }, [client]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (viewerError && !viewerLoading) {
      console.error('[useAuth] ME query error:', viewerError.message);
      // Token is likely invalid - clear auth state
      logout();
      return;
    }

    // Resolved but no user: token was accepted network-wise but the server
    // couldn't identify a user (deleted account or token version mismatch).
    // Treat the same as an auth failure so the user lands on login instead
    // of getting stuck on a loading screen or flashed through gates with
    // default-false flags.
    if (viewerResolved && !viewer && !viewerLoading) {
      console.warn('[useAuth] ME query resolved with no user — logging out');
      logout();
    }
  }, [viewerError, viewerLoading, viewerResolved, viewer, isAuthenticated, logout]);

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
  // mounted; error/null cases are unblocked by the logout-effect flipping
  // `isAuthenticated` back to false (which short-circuits this expression).
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
