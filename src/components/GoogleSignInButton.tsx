import { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

// Check if we're in a development client or Expo Go
// Native modules are only available in development builds
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | null = null;
let isNativeModuleAvailable = false;

try {
  const googleSignIn = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignIn.GoogleSignin;
  statusCodes = googleSignIn.statusCodes;
  isNativeModuleAvailable = true;
} catch {
  // Native module not available (running in Expo Go)
  isNativeModuleAvailable = false;
}

export function GoogleSignInButton({ onSuccess, onError, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (isNativeModuleAvailable && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        });
        setConfigured(true);
      } catch (error) {
        console.warn('Google Sign-In configuration failed:', error);
      }
    }
  }, []);

  // Don't render if native module isn't available
  if (!isNativeModuleAvailable || !GoogleSignin) {
    // Show a disabled button in Expo Go with explanation
    if (__DEV__) {
      return (
        <View style={[styles.button, styles.buttonDisabled]}>
          <Text style={styles.devText}>
            Google Sign-In requires a development build
          </Text>
        </View>
      );
    }
    return null;
  }

  async function handlePress() {
    if (!GoogleSignin || !statusCodes) return;

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      onSuccess(idToken);
    } catch (error: unknown) {
      const typedError = error as { code?: string; message?: string };
      if (typedError.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - silent
      } else if (typedError.code === statusCodes.IN_PROGRESS) {
        // Already in progress - silent
      } else if (typedError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError('Google Play Services not available');
      } else {
        onError(typedError.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading || !configured) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled || loading || !configured}
    >
      {loading ? (
        <ActivityIndicator color="#333" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.text}>Continue with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  devText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
