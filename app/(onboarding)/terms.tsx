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
import { LegalDocument } from '../../src/components/legal/LegalDocument';
import { TERMS_SECTIONS, CURRENT_TERMS_VERSION } from '../../src/legal/terms';
import { colors } from '../../src/constants/theme';

export default function TermsScreen() {
  const { refetchUser, logout } = useAuth();
  const [acceptTerms, { loading }] = useAcceptTermsMutation();
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

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
      <View style={styles.header}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Please read and accept to continue</Text>
      </View>

      <View style={styles.documentContainer}>
        <LegalDocument
          sections={TERMS_SECTIONS}
          onScrollEnd={() => setHasScrolledToEnd(true)}
        />
      </View>

      {!hasScrolledToEnd && (
        <Text style={styles.scrollHint}>Scroll to read all terms</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!hasScrolledToEnd || loading) && styles.buttonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!hasScrolledToEnd || loading}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 4,
  },
  documentContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  scrollHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 6,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
