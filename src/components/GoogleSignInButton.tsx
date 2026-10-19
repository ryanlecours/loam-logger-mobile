import { useState, useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { signInWithAccountPicker } from '../lib/googleSignIn';
import { radius } from '../constants/theme';
import { GoogleGLogo } from './GoogleGLogo';

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      const result = await signInWithAccountPicker(GoogleSignin);
      if (result.kind === 'success') {
        onSuccess(result.idToken);
      }
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

  const inactive = disabled || loading || !configured;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator color={GOOGLE.text} />
      ) : (
        <View style={[styles.content, inactive && styles.contentDisabled]}>
          <GoogleGLogo size={20} />
          <Text style={styles.text}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Google's "Sign in with Google" light button, from Google's own button
 * generator: white fill, #747775 border, #1F1F1F label, the multicolor G at
 * 20 with 10 between it and the label, pressed state #303030 at 12%,
 * disabled fill white at 38% and content at 38%. This is Google's lockup, so
 * its white and greys are theirs, not Loam UI (DESIGN.md, "The Guest Jersey
 * Rule"). Sized to the Sign In pill below it; Google's own button is a pill
 * too.
 */
const GOOGLE = {
  fill: '#FFFFFF',
  fillPressed: '#E6E6E6', // #FFFFFF under #303030 at 12%
  fillDisabled: 'rgba(255, 255, 255, 0.38)',
  border: '#747775',
  borderDisabled: 'rgba(31, 31, 31, 0.12)',
  text: '#1F1F1F',
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: GOOGLE.fill,
    borderWidth: 1,
    borderColor: GOOGLE.border,
    borderRadius: radius.full,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: GOOGLE.fillPressed,
  },
  buttonDisabled: {
    backgroundColor: GOOGLE.fillDisabled,
    borderColor: GOOGLE.borderDisabled,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentDisabled: {
    opacity: 0.38,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.25,
    color: GOOGLE.text,
  },
  devText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
