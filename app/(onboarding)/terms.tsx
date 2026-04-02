import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAcceptTermsMutation } from '../../src/graphql/generated';
import { useAuth } from '../../src/hooks/useAuth';
import { isUnauthorizedError } from '../../src/utils/errors';
import { colors } from '../../src/constants/theme';

// TODO: Import from @loam/shared when available
const CURRENT_TERMS_VERSION = '1.2.0';

export default function TermsScreen() {
  const { refetchUser, logout } = useAuth();
  const [acceptTerms, { loading }] = useAcceptTermsMutation();
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    try {
      setError(null);
      await acceptTerms({
        variables: {
          input: { termsVersion: CURRENT_TERMS_VERSION },
        },
      });
      // Refetch user to update hasAcceptedCurrentTerms flag
      // Root layout will handle navigation based on updated flags
      await refetchUser();
    } catch (err) {
      // If unauthorized, log out and redirect to login
      if (isUnauthorizedError(err)) {
        await logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to accept terms');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Please accept our terms to continue</Text>

        {/* Placeholder - actual terms content will be added in MOB-07 */}
        <View style={styles.termsPlaceholder}>
          <Text style={styles.placeholderText}>[Terms content placeholder]</Text>
          <Text style={styles.placeholderHint}>
            Full terms display will be implemented in MOB-07
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>I Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
  termsPlaceholder: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 8,
  },
  placeholderHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
