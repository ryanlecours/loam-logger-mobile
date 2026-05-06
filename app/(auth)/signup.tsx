import { useState, useMemo, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import {
  PasswordRequirements,
  checkPasswordRequirements,
} from '../../src/components/PasswordRequirements';
import {
  getCapturedReferral,
  setCapturedReferral,
  clearCapturedReferral,
} from '../../src/lib/referral';
import { colors } from '../../src/constants/theme';

const REFERRAL_CODE_PATTERN = /^[a-f0-9]{8}$/;

function normalizeCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 8);
}

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  // Whether the inline manual-entry input is expanded (auto-true when a code
  // was captured so the user can see/edit it; otherwise hidden behind the
  // "Have a referral code?" disclosure).
  const [referralEditing, setReferralEditing] = useState(false);
  const [referralDraft, setReferralDraft] = useState('');
  const router = useRouter();
  const { ref: refFromUrl } = useLocalSearchParams<{ ref?: string }>();
  const { setAuthenticated } = useAuth();

  // Hydrate referral code on mount: URL param wins, then any SecureStore
  // capture from a prior cold-start deep link. Persist whichever we end up
  // with so the code survives a screen unmount mid-signup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromUrl = typeof refFromUrl === 'string' ? refFromUrl : undefined;
      const persisted = await getCapturedReferral();
      const candidate = normalizeCode(fromUrl || persisted || '');
      if (cancelled) return;
      if (REFERRAL_CODE_PATTERN.test(candidate)) {
        setReferralCode(candidate);
        if (fromUrl) {
          // Mirror URL-derived codes into storage so back-navigation or a
          // remount picks them up without re-parsing the route.
          setCapturedReferral(candidate);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refFromUrl]);

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
      const response = await fetch(`${apiUrl}/auth/mobile/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
          ref: referralCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Signup succeeded — clear any captured referral so a future signup
      // on this device (rare, but possible on shared devices) doesn't carry
      // a stale code.
      await clearCapturedReferral();

      // Check if user was added to waitlist (closed beta)
      if (data.waitlist) {
        setLoading(false);
        setWaitlistSuccess(true);
        return;
      }

      // If not waitlist, tokens should be returned (future: open beta)
      if (data.accessToken) {
        const { storeTokens } = await import('../../src/lib/auth');
        await storeTokens(data.accessToken, data.refreshToken, data.user);
        setAuthenticated(true);
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(
        'Signup Failed',
        error instanceof Error ? error.message : 'Please try again'
      );
      setLoading(false);
    }
  }

  function applyReferralDraft() {
    const normalized = normalizeCode(referralDraft);
    if (REFERRAL_CODE_PATTERN.test(normalized)) {
      setReferralCode(normalized);
      setCapturedReferral(normalized);
      setReferralEditing(false);
      setReferralDraft('');
    } else if (normalized.length === 0) {
      // Empty input clears any captured code.
      setReferralCode(null);
      clearCapturedReferral();
      setReferralEditing(false);
      setReferralDraft('');
    }
  }

  function startEditingReferral() {
    setReferralDraft(referralCode ?? '');
    setReferralEditing(true);
  }

  // Show waitlist success screen
  if (waitlistSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>You're on the list!</Text>
          <Text style={styles.waitlistMessage}>
            We've added you to our waitlist. We'll send you an email when your
            account is ready.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
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

            {referralCode && !referralEditing && (
              <View style={styles.referralAppliedPill}>
                <Ionicons name="gift-outline" size={16} color={colors.primary} />
                <Text style={styles.referralAppliedText} numberOfLines={1}>
                  Referral code applied: {referralCode}
                </Text>
                <TouchableOpacity
                  onPress={startEditingReferral}
                  hitSlop={8}
                  disabled={loading}
                >
                  <Text style={styles.referralEditLink}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}

            {!referralCode && !referralEditing && (
              <TouchableOpacity
                style={styles.referralDisclosure}
                onPress={() => setReferralEditing(true)}
                disabled={loading}
              >
                <Text style={styles.referralDisclosureText}>
                  Have a referral code?
                </Text>
              </TouchableOpacity>
            )}

            {referralEditing && (
              <View style={styles.referralEditRow}>
                <TextInput
                  style={[styles.input, styles.referralInput]}
                  placeholder="8-character code"
                  placeholderTextColor={colors.textMuted}
                  value={referralDraft}
                  onChangeText={(text) => setReferralDraft(normalizeCode(text))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={8}
                  editable={!loading}
                  onSubmitEditing={applyReferralDraft}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.referralApplyButton}
                  onPress={applyReferralDraft}
                  disabled={loading}
                >
                  <Text style={styles.referralApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
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
                <ActivityIndicator color={colors.textPrimary} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  waitlistMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
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
    color: colors.danger,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
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
  referralAppliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  referralAppliedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  referralEditLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  referralDisclosure: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  referralDisclosureText: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  referralEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  referralInput: {
    flex: 1,
    marginBottom: 0,
  },
  referralApplyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  referralApplyText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
