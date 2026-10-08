import { useEffect, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmailVerificationStatusQuery } from '../../graphql/generated';
import { resendVerificationEmail } from '../../api/emailVerification';
import { colors, radius, space, type } from '../../constants/theme';

type SendState = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Asks a new rider to confirm their email, with a way to resend the link.
 *
 * Accounts created after verification shipped cannot make share links until
 * they confirm. The link opens in the browser and works without signing in
 * there, so the app's only jobs are saying why and resending. Older accounts
 * never see this: the API reports needsEmailVerification false for them.
 *
 * Rechecks when the app returns to the foreground, which is when a rider
 * comes back from tapping the link in Mail.
 *
 * Sage interactive voice, like UnassignedRidesBanner. An unconfirmed email is
 * a missing step, not wear, so the component-health ramp stays out of it.
 */
export function EmailVerificationBanner() {
  // errorPolicy 'all': an API without the field yields an error, and the
  // banner simply stays hidden.
  const { data, refetch } = useEmailVerificationStatusQuery({ errorPolicy: 'all' });
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const needsVerification = !!data?.me?.needsEmailVerification;

  useEffect(() => {
    if (!needsVerification) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch().catch(() => {});
    });
    return () => sub.remove();
  }, [needsVerification, refetch]);

  if (!needsVerification || !data?.me) return null;
  const { email } = data.me;

  const resend = async () => {
    setSendState('sending');
    setErrorMessage(null);
    try {
      const { alreadyVerified } = await resendVerificationEmail();
      if (alreadyVerified) {
        await refetch();
        return;
      }
      setSendState('sent');
    } catch (err) {
      setSendState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not send the email. Try again later.');
    }
  };

  const detail =
    sendState === 'sent'
      ? `Sent to ${email}. Check your spam folder if it is not there in a minute.`
      : `Tap the link we sent to ${email} to turn on share links.`;

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <Ionicons
        name="mail-outline"
        size={20}
        color={colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.copy}>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.subtitle}>{detail}</Text>
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      </View>
      {sendState !== 'sent' &&
        (sendState === 'sending' ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Sending" />
        ) : (
          <TouchableOpacity
            onPress={resend}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Resend confirmation email"
            hitSlop={8}
          >
            <Text style={styles.actionText}>Resend</Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.xl,
    marginHorizontal: space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...type.footnoteStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: space.hair,
  },
  error: {
    ...type.caption,
    color: colors.criticalOn,
    marginTop: space.xs,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    ...type.footnoteStrong,
    color: colors.primary,
  },
});
