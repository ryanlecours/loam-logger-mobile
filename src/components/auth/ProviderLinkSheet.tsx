import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { BottomSheet } from '../common/BottomSheet';
import { completeProviderLink, type PendingProviderLink } from '../../lib/auth';
import { colors, radius, space, type } from '../../constants/theme';

interface ProviderLinkSheetProps {
  pending: PendingProviderLink | null;
  onClose: () => void;
  /** The account is linked and the tokens are stored. */
  onLinked: () => void;
  onForgotPassword: () => void;
}

const PROVIDER_NAME = { google: 'Google', apple: 'Apple' } as const;

/**
 * Shown when Google or Apple sign-in matches an account that already has a
 * password but never confirmed its email. Entering the password proves the
 * rider made that account, which is what makes linking safe. Forgot-password
 * proves the inbox instead, and also replaces the password of anyone else
 * who might have signed up with this address.
 */
export function ProviderLinkSheet({ pending, onClose, onLinked, onForgotPassword }: ProviderLinkSheetProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const providerName = pending ? PROVIDER_NAME[pending.provider] : 'Google';

  const close = () => {
    if (loading) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!pending || !password || loading) return;
    setLoading(true);
    setError(null);
    const result = await completeProviderLink(pending.linkToken, password);
    setLoading(false);

    if (result.success) {
      setPassword('');
      onLinked();
      return;
    }
    setError(
      result.errorCode === 'NETWORK_ERROR'
        ? "Can't reach Loam Logger. Check your signal and try again."
        : result.error || 'Could not connect your account. Please try again.'
    );
  };

  return (
    <BottomSheet visible={!!pending} onClose={close}>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          Connect {providerName}
        </Text>
        <Text style={styles.subtitle}>
          {pending?.email} already has a Loam Logger password. Enter it once to connect {providerName}.
          After that, either way of signing in works.
        </Text>

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!loading}
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          style={[styles.button, (!password || loading) && styles.buttonDisabled]}
          onPress={submit}
          disabled={!password || loading}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${providerName}`}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Connect {providerName}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            close();
            onForgotPassword();
          }}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.xxxl,
    paddingBottom: space.xl,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  subtitle: {
    ...type.footnote,
    color: colors.textSecondary,
    marginBottom: space.xl,
  },
  error: {
    ...type.footnote,
    color: colors.criticalOn,
    marginBottom: space.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: space.xl,
    marginBottom: space.lg,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: space.xl,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: space.xl,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});
