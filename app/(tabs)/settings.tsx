import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserTier } from '../../src/hooks/useUserTier';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useIntegrationConnect } from '../../src/hooks/useIntegrationConnect';
import { useMeQuery, useUpdateUserPreferencesMutation } from '../../src/graphql/generated';
import { setDataSourcePreference } from '../../src/api/backfill';
import { deleteAccount } from '../../src/lib/auth';
import { DataSourceSelector } from '../../src/components/settings/DataSourceSelector';
import { NotificationPreferences } from '../../src/components/settings/NotificationPreferences';
import { SubscriptionSection } from '../../src/components/settings/SubscriptionSection';
import { ReferralSection } from '../../src/components/settings/ReferralSection';
import { ImportRidesSheet } from '../../src/components/import/ImportRidesSheet';
import type { IntegrationProvider } from '../../src/api/integrations';
import { colors } from '../../src/constants/theme';

function IntegrationRow({
  provider,
  label,
  brandColor,
  onImportPress,
  onConnectionChange,
}: {
  provider: IntegrationProvider;
  label: string;
  brandColor: string;
  onImportPress?: () => void;
  onConnectionChange?: (provider: IntegrationProvider, connected: boolean) => void;
}) {
  const { status, loading, connecting, connect, disconnect } = useIntegrationConnect(provider);

  // Notify parent when connection status changes
  useEffect(() => {
    if (!loading && status) {
      onConnectionChange?.(provider, status.connected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onConnectionChange and provider are stable props from parent; including them would cause unnecessary re-fires
  }, [loading, status?.connected]);

  if (loading) {
    return (
      <View style={styles.integrationRow}>
        <Text style={styles.integrationLabel}>{label}</Text>
        <ActivityIndicator size="small" color={brandColor} />
      </View>
    );
  }

  if (status?.connected) {
    const connectedDate = status.connectedAt
      ? new Date(status.connectedAt).toLocaleDateString()
      : null;

    return (
      <View style={styles.integrationRow}>
        <View style={styles.integrationInfo}>
          <Text style={[styles.integrationLabel, { color: brandColor }]}>
            {label} Connected
          </Text>
          {connectedDate && (
            <Text style={styles.integrationDate}>Since {connectedDate}</Text>
          )}
        </View>
        <View style={styles.integrationActions}>
          <TouchableOpacity
            style={[styles.importButton, { borderColor: brandColor }]}
            onPress={onImportPress}
          >
            <Ionicons name="download-outline" size={16} color={brandColor} />
            <Text style={[styles.importButtonText, { color: brandColor }]}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={disconnect}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.connectButton, { backgroundColor: brandColor }]}
      onPress={connect}
      disabled={connecting}
    >
      {connecting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.connectButtonText}>Connect {label}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isPro } = useUserTier();
  const { data: meData, refetch: refetchMe } = useMeQuery();
  const { distanceUnit, setDistanceUnit } = useDistanceUnit();
  const [updatePreferences] = useUpdateUserPreferencesMutation();

  const predictionMode = meData?.me?.predictionMode ?? 'simple';

  const handlePredictionModeChange = useCallback(async (mode: string) => {
    if (mode === 'predictive' && !isPro) {
      Alert.alert(
        'Pro Feature',
        'Advanced wear predictions require a Pro plan.',
        [
          { text: 'OK', style: 'cancel' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { text: 'Upgrade', onPress: () => router.push('/settings-detail/pricing' as any) },
        ]
      );
      return;
    }
    try {
      await updatePreferences({ variables: { input: { predictionMode: mode } } });
      await refetchMe();
    } catch {
      Alert.alert('Error', 'Failed to update prediction mode.');
    }
  }, [isPro, updatePreferences, refetchMe, router]);

  const [importProvider, setImportProvider] = useState<IntegrationProvider | null>(null);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<Set<IntegrationProvider>>(new Set());

  const activeDataSource = meData?.me?.activeDataSource ?? null;

  const handleConnectionChange = useCallback((provider: IntegrationProvider, connected: boolean) => {
    setConnectedProviders((prev) => {
      const next = new Set(prev);
      if (connected) {
        next.add(provider);
      } else {
        next.delete(provider);
      }
      return next;
    });
  }, []);

  // Build accounts-like array from integration connection status
  const connectedDataProviders = Array.from(connectedProviders).map((p) => ({
    provider: p,
    connectedAt: '',
  }));

  const handleImportPress = useCallback((provider: IntegrationProvider) => {
    setImportProvider(provider);
  }, []);

  const handleImportClose = useCallback(() => {
    setImportProvider(null);
  }, []);

  const handleImportSuccess = useCallback(() => {
    refetchMe();
  }, [refetchMe]);

  const handleDataSourceSelect = useCallback(async (provider: string) => {
    setDataSourceLoading(true);
    try {
      await setDataSourcePreference(provider);
      await refetchMe();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setDataSourceLoading(false);
    }
  }, [refetchMe]);

  const [deleting, setDeleting] = useState(false);

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete all your data including rides, bikes, gear, and account credentials. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              setDeleting(false);
              Alert.alert('Error', (err as Error).message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.item}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'Not set'}</Text>
        </View>
      </View>

      <View style={{ marginTop: 16, marginHorizontal: 16 }}>
        <SubscriptionSection />
      </View>

      <View style={{ marginHorizontal: 16 }}>
        <ReferralSection />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Services</Text>
        <IntegrationRow
          provider="garmin"
          label="Garmin"
          brandColor="#007dc3"
          onImportPress={() => handleImportPress('garmin')}
          onConnectionChange={handleConnectionChange}
        />
        <IntegrationRow
          provider="strava"
          label="Strava"
          brandColor="#fc4c02"
          onImportPress={() => handleImportPress('strava')}
          onConnectionChange={handleConnectionChange}
        />
        {connectedProviders.has('strava') && (
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push('/settings-detail/strava-mappings' as Href)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="git-compare-outline" size={18} color={colors.strava} />
              <Text style={styles.legalRowText}>Strava Bike Mapping</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {connectedProviders.size >= 2 && (
        <View style={styles.section}>
          <DataSourceSelector
            accounts={connectedDataProviders}
            activeDataSource={activeDataSource}
            onSelect={handleDataSourceSelect}
            loading={dataSourceLoading}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Distance Unit</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segment,
                distanceUnit === 'mi' && styles.segmentActive,
              ]}
              onPress={() => setDistanceUnit('mi')}
            >
              <Text
                style={[
                  styles.segmentText,
                  distanceUnit === 'mi' && styles.segmentTextActive,
                ]}
              >
                Miles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segment,
                distanceUnit === 'km' && styles.segmentActive,
              ]}
              onPress={() => setDistanceUnit('km')}
            >
              <Text
                style={[
                  styles.segmentText,
                  distanceUnit === 'km' && styles.segmentTextActive,
                ]}
              >
                Kilometers
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.prefRow}>
          <View style={styles.prefLabelRow}>
            <Text style={styles.prefLabel}>Wear Predictions</Text>
            {!isPro && (
              <View style={styles.proBadge}>
                <Ionicons name="lock-closed" size={10} color="#fbbf24" />
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </View>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segment,
                predictionMode === 'simple' && styles.segmentActive,
              ]}
              onPress={() => handlePredictionModeChange('simple')}
            >
              <Text
                style={[
                  styles.segmentText,
                  predictionMode === 'simple' && styles.segmentTextActive,
                ]}
              >
                Simple
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segment,
                predictionMode === 'predictive' && styles.segmentActive,
                !isPro && predictionMode !== 'predictive' && styles.segmentLocked,
              ]}
              onPress={() => handlePredictionModeChange('predictive')}
            >
              <Text
                style={[
                  styles.segmentText,
                  predictionMode === 'predictive' && styles.segmentTextActive,
                  !isPro && predictionMode !== 'predictive' && styles.segmentTextLocked,
                ]}
              >
                Predictive
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ marginHorizontal: 16 }}>
        <NotificationPreferences />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => router.push('/settings-detail/terms')}
        >
          <Text style={styles.legalRowText}>Terms & Conditions</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => router.push('/settings-detail/privacy-policy')}
        >
          <Text style={styles.legalRowText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 16, marginHorizontal: 16 }}>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, styles.logoutText]}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </View>

      {importProvider && (
        <ImportRidesSheet
          visible={!!importProvider}
          onClose={handleImportClose}
          provider={importProvider}
          onSuccess={handleImportSuccess}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  item: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.danger,
  },
  logoutText: {
    color: '#fff',
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  integrationDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  integrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disconnectText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  prefLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  prefLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
  },
  segmentLocked: {
    opacity: 0.5,
  },
  segmentTextLocked: {
    color: colors.textMuted,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  legalRowText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dangerSection: {
    backgroundColor: colors.card,
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
});
