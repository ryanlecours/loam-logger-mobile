import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useIntegrationConnect } from '../../src/hooks/useIntegrationConnect';
import type { IntegrationProvider } from '../../src/api/integrations';

function IntegrationRow({
  provider,
  label,
  brandColor,
}: {
  provider: IntegrationProvider;
  label: string;
  brandColor: string;
}) {
  const { status, loading, connecting, connect, disconnect } = useIntegrationConnect(provider);

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
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={disconnect}
        >
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
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
    <View style={styles.container}>
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
        />
        <IntegrationRow
          provider="strava"
          label="Strava"
          brandColor="#fc4c02"
        />
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disconnectText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
});
