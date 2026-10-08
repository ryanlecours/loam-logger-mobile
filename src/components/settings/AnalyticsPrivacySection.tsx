import { useState } from 'react';
import { Alert, View, Text, Switch, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateAnalyticsOptOutMutation } from '../../graphql/generated';
import { colors } from '../../constants/theme';

/**
 * Self-serve analytics opt-out, the setting the privacy policy (Section 6)
 * points riders to. Writes `User.analyticsOptOut`, the same account-level
 * flag the web app's toggle writes, so it applies on every device and to
 * server-side events. The SDK side follows automatically: the mutation result
 * updates the cached viewer, and usePostHogUser opts the SDK in or out.
 */
export function AnalyticsPrivacySection() {
  const { user } = useAuth();
  const [updateOptOut, { loading }] = useUpdateAnalyticsOptOutMutation();
  const [pendingShare, setPendingShare] = useState<boolean | null>(null);

  if (!user) return null;

  const sharing = pendingShare ?? !user.analyticsOptOut;

  async function handleToggle(next: boolean) {
    if (!user || loading) return;
    setPendingShare(next);
    try {
      await updateOptOut({ variables: { optOut: !next } });
    } catch (err) {
      console.error('[AnalyticsPrivacySection] updateAnalyticsOptOut failed', err);
      Alert.alert(
        'Unable to save setting',
        `We couldn't ${next ? 'turn on' : 'turn off'} analytics sharing. Please try again.`,
      );
    } finally {
      setPendingShare(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Privacy</Text>
      <View style={styles.row}>
        <View style={styles.labelColumn}>
          <Text style={styles.label}>Share product analytics</Text>
          <Text style={styles.description}>
            Shows us which screens and buttons get used so we can improve Loam Logger. Applies
            everywhere you're signed in, including the web app.
          </Text>
        </View>
        <Switch
          value={sharing}
          onValueChange={handleToggle}
          disabled={loading}
          trackColor={{ true: colors.primary, false: colors.cardBorder }}
          accessibilityLabel="Share product analytics"
        />
      </View>
    </View>
  );
}

// Same card styling as BiometricUnlockSection and the sections in
// app/(tabs)/settings.tsx.
const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    marginTop: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelColumn: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
