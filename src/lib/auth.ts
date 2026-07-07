import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import type { UserRole } from '../graphql/generated';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

/**
 * Full user type matching ME query response.
 * Includes all gating flags needed for navigation (hasAcceptedCurrentTerms, onboardingCompleted, role).
 */
export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  onboardingCompleted: boolean;
  hasAcceptedCurrentTerms: boolean;
  role: UserRole;
  mustChangePassword: boolean;
  isFoundingRider: boolean;
  subscriptionTier?: string | null;
  needsDowngradeSelection?: boolean;
  hoursDisplayPreference?: string | null;
  predictionMode?: string | null;
  distanceUnit?: string | null;
  notifyOnRideUpload?: boolean;
  createdAt: string;
}

/**
 * Minimal user info returned by login endpoints.
 * This is stored in SecureStore for quick hydration, but full user is fetched via ME query.
 */
export interface LoginUser {
  id: string;
  email?: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Token refresh callback - allows useAuth to be notified when token is refreshed
type TokenRefreshCallback = () => void;
let onTokenRefreshed: TokenRefreshCallback | null = null;

export function setTokenRefreshCallback(cb: TokenRefreshCallback | null): void {
  onTokenRefreshed = cb;
}

export async function storeTokens(
  accessToken: string,
  refreshToken: string,
  user?: LoginUser
): Promise<void> {
  // Validate tokens are real strings before handing them to SecureStore.
  // A malformed/partial auth response (e.g. a server that omits a field) would
  // otherwise reach setItemAsync as `undefined` and throw the opaque
  // "Invalid value provided to SecureStore" error — surface a clear message
  // instead. This guards every auth entry point (signup + all login helpers).
  if (typeof accessToken !== 'string' || !accessToken ||
      typeof refreshToken !== 'string' || !refreshToken) {
    throw new Error('Malformed auth response: missing tokens');
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  // `user` is a hydration cache only — the ME query populates the real user
  // state — so a response without it is not fatal. Skip the write rather than
  // JSON.stringify(undefined), which returns the value `undefined` (not a
  // string) and crashes SecureStore.
  if (user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Pull the `exp` claim out of a JWT access token without verifying the
 * signature. Verification is the server's job; the client only needs the
 * expiry to decide whether a proactive refresh is worth the round-trip.
 *
 * Returns the expiry as a unix-ms timestamp, or null if the token isn't a
 * recognizable JWT — in which case callers should treat it as expired and
 * fall through to a refresh, which will either succeed (we get a fresh
 * token) or fail and clear SecureStore (we land on login).
 */
function decodeJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // JWT payloads are base64url. Convert to standard base64 and pad before
    // decoding — atob doesn't handle the url-safe alphabet or missing padding.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * True iff a stored access token exists and won't expire in the next
 * `bufferSeconds`. The buffer guards against the token expiring mid-flight
 * on a request that just left the device — better to refresh slightly
 * early than to send a doomed request and rely on errorLink to recover.
 */
export async function hasValidAccessToken(bufferSeconds = 60): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const expiryMs = decodeJwtExpiryMs(token);
  if (expiryMs == null) return false;
  return expiryMs > Date.now() + bufferSeconds * 1000;
}

export async function getStoredUser(): Promise<LoginUser | null> {
  const userJson = await SecureStore.getItemAsync(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/auth/mobile/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const data = await response.json();
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    // The current server is stateless (HMAC-signed refresh tokens, no
    // invalidation list) and only returns `{ accessToken }` here, so this
    // branch is a no-op today. It's a forward-compat hook: if the server
    // ever adopts refresh-token rotation (rotate on every use to shrink
    // the replay window), the client will pick up the new refresh token
    // automatically without needing a coordinated mobile release. Without
    // this, the next refresh would send a dead token and the user would
    // be silently logged out.
    if (data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    // Notify listener that token was refreshed (so useAuth can refetch ME)
    onTokenRefreshed?.();
    return data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearTokens();
    return null;
  }
}

export interface AuthResult {
  success: boolean;
  error?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR';
  /**
   * The backend's x-request-id header, when available. Surface this in user-facing
   * error messages so a bug report ties to an exact log line in Railway.
   */
  requestId?: string;
}

// Read an error response defensively: the API returns JSON (`{ error, code }`),
// but historically some endpoints returned plain text. `response.json()` throws
// on non-JSON, and the throw used to be caught as NETWORK_ERROR — masking real
// failures behind a misleading "Network error" alert.
async function parseErrorResponse(
  response: Response
): Promise<{ message: string; code?: string; requestId?: string }> {
  const requestId = response.headers.get('x-request-id') ?? undefined;
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: string; message?: string; code?: string };
    return { message: json.error ?? json.message ?? text, code: json.code, requestId };
  } catch {
    return { message: text || `HTTP ${response.status}`, requestId };
  }
}

/**
 * Add a Sentry breadcrumb so a later captured event includes the auth context.
 * For NETWORK_ERROR (no response received), additionally capture a message so
 * the failure is independently visible in Sentry.
 */
function recordAuthFailure(
  endpoint: 'apple' | 'google' | 'email' | 'refresh',
  errorCode: string,
  requestId?: string,
  status?: number
): void {
  Sentry.addBreadcrumb({
    category: 'auth',
    type: 'error',
    level: 'warning',
    message: `Mobile auth failed: ${endpoint}`,
    data: { errorCode, requestId, status, endpoint },
  });
  if (errorCode === 'NETWORK_ERROR') {
    Sentry.captureMessage(`Mobile auth network error: ${endpoint}`, 'warning');
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/auth/mobile/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const { message, requestId } = await parseErrorResponse(response);

      recordAuthFailure('email', 'INVALID_CREDENTIALS', requestId, response.status);
      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS', requestId };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
    recordAuthFailure('email', 'NETWORK_ERROR');
    return { success: false, error: 'Network error', errorCode: 'NETWORK_ERROR' };
  }
}

export async function loginWithGoogle(
  idToken: string
): Promise<AuthResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/auth/mobile/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const { message, requestId } = await parseErrorResponse(response);

      recordAuthFailure('google', 'INVALID_CREDENTIALS', requestId, response.status);
      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS', requestId };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
    recordAuthFailure('google', 'NETWORK_ERROR');
    return { success: false, error: 'Network error', errorCode: 'NETWORK_ERROR' };
  }
}

export async function loginWithApple(
  identityToken: string,
  user?: { email?: string; name?: { firstName?: string; lastName?: string } }
): Promise<AuthResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/auth/mobile/apple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identityToken, user }),
    });

    if (!response.ok) {
      const { message, requestId } = await parseErrorResponse(response);

      recordAuthFailure('apple', 'INVALID_CREDENTIALS', requestId, response.status);
      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS', requestId };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
    recordAuthFailure('apple', 'NETWORK_ERROR');
    return { success: false, error: 'Network error', errorCode: 'NETWORK_ERROR' };
  }
}

export async function deleteAccount(): Promise<void> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  const token = await getAccessToken();

  const response = await fetch(`${apiUrl}/auth/delete-account`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const { message } = await parseErrorResponse(response);
    throw new Error(message || 'Failed to delete account');
  }

  await clearTokens();
}

export async function logout(): Promise<void> {
  await clearTokens();
}
