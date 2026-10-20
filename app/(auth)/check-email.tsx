import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { resendVerificationEmail } from '../../src/lib/emailVerification';
import { readSignInGrant } from '../../src/lib/signInGrant';
import { useEmailSignInPoll } from '../../src/hooks/useEmailSignInPoll';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, radius } from '../../src/constants/theme';
import { Screen } from '../../src/components/common/Screen';

const RESEND_COOLDOWN_MS = 60_000;

/**
 * Shown after a password signup, and when signing in to an account that has
 * not confirmed its email yet. The API issues no tokens until the link in the
 * verification email is opened. When the API handed this device a sign-in
 * grant, the screen keeps asking while it is in view and signs the rider in
 * as soon as the link is opened, on this phone or anywhere else; the root
 * layout then routes into the app. Without one, the rider signs in by hand.
 */
export default function CheckEmailScreen() {
  const router = useRouter();
  const { setAuthenticated } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [focused, setFocused] = useState(false);
  const [hasGrant, setHasGrant] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void readSignInGrant().then((grant) => setHasGrant(grant !== null));
      return () => setFocused(false);
    }, []),
  );
  useEmailSignInPoll(focused, () => setAuthenticated(true));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Briefly disabled after a send. Past a few sends an hour the API still
  // answers 200 but sends nothing, so repeated taps would only promise links
  // that never arrive.
  const [coolingDown, setCoolingDown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
  }, []);

  async function handleResend() {
    if (!email) return;
    setSending(true);
    const result = await resendVerificationEmail(email);
    setSending(false);

    if (result.ok) {
      setSent(true);
      setCoolingDown(true);
      cooldownTimer.current = setTimeout(() => setCoolingDown(false), RESEND_COOLDOWN_MS);
      return;
    }
    if (result.reason === 'rate-limited') {
      Alert.alert('Too many attempts', `Please try again in ${result.retryAfter} seconds.`);
      return;
    }
    if (result.reason === 'server') {
      Alert.alert('Error', 'We could not send a new link right now. Please try again in a few minutes.');
      return;
    }
    Alert.alert('Error', 'Network error. Please try again.');
  }

  function backToSignIn() {
    // Signup and login both push this screen, so go back to the login screen
    // already in the stack rather than stacking a second one.
    router.dismissTo({ pathname: '/(auth)/login', params: email ? { email } : {} } as Href);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          {email ? (
            <>
              We sent a link to <Text style={styles.email}>{email}</Text>.
            </>
          ) : (
            'We sent you a link.'
          )}{' '}
          {hasGrant
            ? 'Open it on this phone or any other device, and the app signs you in once your address is confirmed.'
            : 'Open it to confirm your address, then come back and sign in.'}
        </Text>

        {sent && (
          <Text style={styles.sentNote}>
            A new link is on its way. It can take a minute, and it may land in spam.
          </Text>
        )}

        <View style={styles.form}>
          <TouchableOpacity style={styles.button} onPress={backToSignIn}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>

          {email ? (
            <TouchableOpacity
              style={[styles.secondaryButton, (sending || coolingDown) && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={sending || coolingDown}
            >
              {sending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {coolingDown ? 'Link Sent' : 'Send a New Link'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  email: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sentNote: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
