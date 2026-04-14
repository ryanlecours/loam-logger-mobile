import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { loginWithApple, loginWithEmail, loginWithGoogle } from '../../src/lib/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';
import { AppleSignInButton } from '../../src/components/AppleSignInButton';
import {
  declineBiometricEnrollment,
  getBiometricCapability,
  getBiometricLabel,
  setBiometricEnabled,
  shouldPromptForEnrollment,
} from '../../src/lib/biometric';
import { colors } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();
  const { setAuthenticated } = useAuth();

  const isLoading = loading || googleLoading || appleLoading;

  /**
   * After any successful sign-in, offer to enable biometric unlock so the
   * next launch can skip the login screen entirely. One-time prompt — only
   * shows if the device supports it and the user hasn't already opted in
   * or out.
   */
  async function maybePromptBiometricEnrollment() {
    const should = await shouldPromptForEnrollment();
    if (!should) return;
    const cap = await getBiometricCapability();
    const label = getBiometricLabel(cap);
    Alert.alert(
      `Enable ${label}?`,
      `Use ${label} to sign in faster on this device. You can change this anytime in Settings.`,
      [
        {
          text: 'Not now',
          style: 'cancel',
          // Persist the decline so we don't re-prompt on every login.
          // The user can still enable it later from Settings, which clears
          // this flag (see setBiometricEnabled in src/lib/biometric.ts).
          //
          // Failure here is benign (worst case: they get re-prompted next
          // login), so log but don't nag the user about it.
          onPress: async () => {
            try {
              await declineBiometricEnrollment();
            } catch (err) {
              console.error('[login] declineBiometricEnrollment failed', err);
            }
          },
        },
        {
          text: 'Enable',
          onPress: async () => {
            try {
              await setBiometricEnabled(true);
            } catch (err) {
              // SecureStore can fail in rare states (Keychain unavailable).
              // Alert the user — a silent failure here would leave them
              // thinking biometric unlock is on when it isn't, and they'd
              // be confused next cold boot when it doesn't prompt.
              console.error('[login] setBiometricEnabled failed', err);
              Alert.alert(
                'Unable to save setting',
                `We couldn't enable ${label} unlock. You can try again from Settings.`,
              );
            }
          },
        },
      ],
    );
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setAuthenticated(true);
      void maybePromptBiometricEnrollment();
      return;
    }

    // Handle special error codes
    if (result.errorCode === 'CLOSED_BETA') {
      router.replace('/closed-beta' as Href);
      return;
    }
    if (result.errorCode === 'ALREADY_ON_WAITLIST') {
      router.replace('/waitlist' as Href);
      return;
    }

    Alert.alert('Login Failed', result.error || 'Please try again');
  }

  async function handleGoogleSuccess(idToken: string) {
    setGoogleLoading(true);
    const result = await loginWithGoogle(idToken);
    setGoogleLoading(false);

    if (result.success) {
      setAuthenticated(true);
      void maybePromptBiometricEnrollment();
      return;
    }

    // Handle special error codes
    if (result.errorCode === 'CLOSED_BETA') {
      router.replace('/closed-beta' as Href);
      return;
    }
    if (result.errorCode === 'ALREADY_ON_WAITLIST') {
      router.replace('/waitlist' as Href);
      return;
    }

    Alert.alert('Login Failed', result.error || 'Please try again');
  }

  function handleGoogleError(error: string) {
    Alert.alert('Google Sign-In Failed', error);
  }

  async function handleAppleSuccess(
    identityToken: string,
    user?: { email?: string; name?: { firstName?: string; lastName?: string } }
  ) {
    setAppleLoading(true);
    const result = await loginWithApple(identityToken, user);
    setAppleLoading(false);

    if (result.success) {
      setAuthenticated(true);
      void maybePromptBiometricEnrollment();
      return;
    }

    if (result.errorCode === 'CLOSED_BETA') {
      router.replace('/closed-beta' as Href);
      return;
    }
    if (result.errorCode === 'ALREADY_ON_WAITLIST') {
      router.replace('/waitlist' as Href);
      return;
    }

    Alert.alert('Login Failed', result.error || 'Please try again');
  }

  function handleAppleError(error: string) {
    Alert.alert('Apple Sign-In Failed', error);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Loam Logger</Text>
        <Text style={styles.subtitle}>Track your mountain bike rides</Text>

        <View style={styles.form}>
          {/* Apple Sign-In (iOS only; renders null on Android / unsupported) */}
          <View style={styles.ssoButton}>
            <AppleSignInButton
              onSuccess={handleAppleSuccess}
              onError={handleAppleError}
              disabled={isLoading}
            />
          </View>

          {/* Google Sign-In */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={isLoading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isLoading}
          />

          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/forgot-password' as Href)}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/signup')}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>
              Don't have an account? Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  ssoButton: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textMuted,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});
