import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { describeSignupFailure } from '../../src/lib/signupFailure';
import { saveSignInGrant } from '../../src/lib/signInGrant';
import { getSignupAttestation, prepareDeviceAttestation } from '../../src/lib/deviceAttestation';
import {
  PasswordRequirements,
  checkPasswordRequirements,
} from '../../src/components/PasswordRequirements';
import { colors, radius } from '../../src/constants/theme';
import { Screen } from '../../src/components/common/Screen';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuthenticated } = useAuth();

  // Warm up Play Integrity while the rider fills in the form (no-op on iOS).
  useEffect(() => {
    void prepareDeviceAttestation();
  }, []);

  const passwordCheck = useMemo(
    () => checkPasswordRequirements(password),
    [password]
  );

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.includes('@') &&
      passwordCheck.isValid &&
      password === confirmPassword
    );
  }, [name, email, password, confirmPassword, passwordCheck.isValid]);

  /** The email already has an account: point the rider at it, not a dead end. */
  function offerExistingAccount(existingEmail: string) {
    Alert.alert(
      'You already have an account',
      `${existingEmail} is already signed up for Loam Logger. Log in, or reset your password if you have forgotten it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset password',
          onPress: () =>
            router.replace({
              pathname: '/(auth)/forgot-password',
              params: { email: existingEmail },
            } as Href),
        },
        {
          text: 'Log in',
          // Signup is pushed from login, so go back to it rather than
          // stacking a second login screen.
          onPress: () =>
            router.dismissTo({
              pathname: '/(auth)/login',
              params: { email: existingEmail },
            } as Href),
        },
      ],
    );
  }

  async function handleSignup() {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!passwordCheck.isValid) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
      // Bound to `email` exactly as sent below; never throws.
      const attestation = await getSignupAttestation(apiUrl, email);
      const response = await fetch(`${apiUrl}/auth/mobile/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
          attestation,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const failure = describeSignupFailure(response.status, data);
        if (failure.kind === 'email-exists') {
          setLoading(false);
          offerExistingAccount(email.trim());
          return;
        }
        if (failure.kind === 'verify-email') {
          // The account was created; it signs in once the emailed link is
          // opened, by itself when the API handed over a sign-in grant.
          if (failure.grant) await saveSignInGrant(failure.grant);
          setLoading(false);
          router.replace({
            pathname: '/(auth)/check-email',
            params: { email: failure.email ?? email.trim() },
          } as Href);
          return;
        }
        throw new Error(failure.message);
      }

      // An API from before email verification signs the new account straight in.
      const { storeTokens } = await import('../../src/lib/auth');
      await storeTokens(data.accessToken, data.refreshToken, data.user);
      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Signup Failed',
        error instanceof Error ? error.message : 'Please try again'
      );
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Loam Logger community</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                maxLength={100}
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              {password.length > 0 && <PasswordRequirements password={password} />}

              <TextInput
                style={[styles.input, { marginTop: password.length > 0 ? 16 : 0 }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />

              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (!canSubmit || loading) && styles.buttonDisabled,
                ]}
                onPress={handleSignup}
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  Already have an account? Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  errorText: {
    color: colors.criticalOn,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.onPrimary,
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
