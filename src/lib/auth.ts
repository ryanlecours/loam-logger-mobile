import * as SecureStore from 'expo-secure-store';
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
  hoursDisplayPreference?: string | null;
  predictionMode?: string | null;
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
  user: LoginUser
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
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
  errorCode?: 'CLOSED_BETA' | 'ALREADY_ON_WAITLIST' | 'INVALID_CREDENTIALS' | 'NETWORK_ERROR';
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
      const error = await response.json();
      const message = error.message || 'Login failed';

      // Check for specific error codes
      if (message.includes('ALREADY_ON_WAITLIST') || message.includes('waitlist')) {
        return { success: false, error: message, errorCode: 'ALREADY_ON_WAITLIST' };
      }
      if (message.includes('CLOSED_BETA') || message.includes('closed beta')) {
        return { success: false, error: message, errorCode: 'CLOSED_BETA' };
      }

      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS' };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
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
      const error = await response.json();
      const message = error.message || 'Google login failed';

      // Check for specific error codes
      if (message.includes('CLOSED_BETA') || message.includes('closed beta')) {
        return { success: false, error: message, errorCode: 'CLOSED_BETA' };
      }
      if (message.includes('ALREADY_ON_WAITLIST') || message.includes('waitlist')) {
        return { success: false, error: message, errorCode: 'ALREADY_ON_WAITLIST' };
      }

      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS' };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
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
      const error = await response.json();
      const message = error.message || 'Apple login failed';

      // Check for specific error codes
      if (message.includes('CLOSED_BETA') || message.includes('closed beta')) {
        return { success: false, error: message, errorCode: 'CLOSED_BETA' };
      }
      if (message.includes('ALREADY_ON_WAITLIST') || message.includes('waitlist')) {
        return { success: false, error: message, errorCode: 'ALREADY_ON_WAITLIST' };
      }

      return { success: false, error: message, errorCode: 'INVALID_CREDENTIALS' };
    }

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Network error', errorCode: 'NETWORK_ERROR' };
  }
}

export async function logout(): Promise<void> {
  await clearTokens();
}
