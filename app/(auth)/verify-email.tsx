import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { verifyEmailToken } from '../../src/lib/emailVerification';
import { completeEmailSignIn } from '../../src/lib/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, radius } from '../../src/constants/theme';
import { Screen } from '../../src/components/common/Screen';

type Status = 'verifying' | 'signing-in' | 'verified' | 'expired' | 'invalid' | 'error';

const COPY: Record<Status, { title: string; body: string }> = {
  verifying: { title: 'Confirming Your Email', body: 'One moment.' },
  'signing-in': { title: 'Email Confirmed', body: 'Signing you in.' },
  verified: { title: 'Email Confirmed', body: 'Sign in with your email and password to get started.' },
  expired: {
    title: 'Link Expired',
    body: 'This link has expired. Sign in with your email and password and we will send a new one.',
  },
  invalid: {
    title: 'Link Not Valid',
    body: 'This link has been replaced or is not valid. Sign in with your email and password and we will send a new one.',
  },
  error: { title: 'Something Went Wrong', body: 'We could not confirm your email. Check your connection and try again.' },
};

/**
 * Opened by the link in the verification email (a universal link or app link
 * to https://loamlogger.app/verify-email, or the loamlogger:// hand-off from
 * the web page). Confirms the address, then signs in with this device's
 * sign-in grant if it holds one, so a rider who signed up here goes straight
 * in. The link alone never signs anyone in: without a grant the rider signs
 * in with the password. The root layout lets this screen through while signed
 * in, like reset-password, so the token is not dropped.
 */
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { isAuthenticated, setAuthenticated } = useAuth();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'invalid');
  const [email, setEmail] = useState<string | null>(null);
  // A token works once; a second request would land on an already-used token.
  // Keyed on the token, so a newer link opened while this screen is still
  // mounted (after a resend, say) is verified too.
  const startedFor = useRef<string | null>(null);

  const run = useCallback(
    async (t: string) => {
      setStatus('verifying');
      const outcome = await verifyEmailToken(t);
      if (outcome.status !== 'verified') {
        setStatus(outcome.status);
        return;
      }
      if (outcome.email) setEmail(outcome.email);
      // Only a grant for the address this link verified may sign in, so a
      // leftover grant for another account never does.
      if (isAuthenticated || !outcome.email) {
        setStatus('verified');
        return;
      }

      setStatus('signing-in');
      const signIn = await completeEmailSignIn(outcome.email);
      if (signIn.status === 'signed-in') {
        setAuthenticated(true);
        // This screen is exempt from the signed-in redirect, so move on
        // explicitly; the root layout's gates take it from there.
        router.replace('/(tabs)');
        return;
      }
      setStatus('verified');
    },
    [isAuthenticated, setAuthenticated, router],
  );

  useEffect(() => {
    if (!token || startedFor.current === token) return;
    startedFor.current = token;
    void run(token);
  }, [token, run]);

  function goToSignIn() {
    router.replace({ pathname: '/(auth)/login', params: email ? { email } : {} } as Href);
  }

  const copy = COPY[status];
  const busy = status === 'verifying' || status === 'signing-in';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>
          {status === 'verified' && isAuthenticated ? 'Your email is confirmed.' : copy.body}
        </Text>

        <View style={styles.form}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : status === 'error' && token ? (
            <TouchableOpacity style={styles.button} onPress={() => void run(token)}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          ) : isAuthenticated ? (
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={goToSignIn}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          )}
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
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
