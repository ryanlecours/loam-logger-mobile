import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useIntegrationConnect } from '../../src/hooks/useIntegrationConnect';
import { useMeQuery } from '../../src/graphql/generated';
import { setDataSourcePreference } from '../../src/api/backfill';
import { deleteAccount } from '../../src/lib/auth';
import { DataSourceSelector } from '../../src/components/settings/DataSourceSelector';
import { ImportRidesSheet } from '../../src/components/import/ImportRidesSheet';
import type { IntegrationProvider } from '../../src/api/integrations';

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
  const { data: meData, refetch: refetchMe } = useMeQuery();

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
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
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
    borderBottomColor: '#e0e0e0',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  integrationDate: {
    fontSize: 13,
    color: '#999',
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
    borderColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disconnectText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerSection: {
    backgroundColor: '#fff',
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#dc3545',
  },
  dangerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
});
