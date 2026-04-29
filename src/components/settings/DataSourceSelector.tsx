import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ConnectedAccount {
  provider: string;
  connectedAt: string;
}

interface DataSourceSelectorProps {
  accounts: ConnectedAccount[];
  activeDataSource: string | null;
  onSelect: (provider: string) => void;
  loading: boolean;
}

const PROVIDER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  garmin: { label: 'Garmin', color: '#007dc3', icon: 'watch-outline' },
  strava: { label: 'Strava', color: '#fc4c02', icon: 'bicycle-outline' },
  whoop: { label: 'WHOOP', color: '#00a651', icon: 'pulse-outline' },
  suunto: { label: 'Suunto', color: '#0072CE', icon: 'watch-outline' },
};

export function DataSourceSelector({
  accounts,
  activeDataSource,
  onSelect,
  loading,
}: DataSourceSelectorProps) {
  if (accounts.length < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Data Source</Text>
      <Text style={styles.subtitle}>
        Choose which provider syncs new rides automatically
      </Text>
      <View style={styles.cards}>
        {accounts.map((account) => {
          const config = PROVIDER_CONFIG[account.provider.toLowerCase()];
          if (!config) return null;

          const isActive = activeDataSource?.toLowerCase() === account.provider.toLowerCase();

          return (
            <TouchableOpacity
              key={account.provider}
              style={[
                styles.card,
                isActive && { borderColor: config.color, borderWidth: 2 },
              ]}
              onPress={() => onSelect(account.provider.toLowerCase())}
              disabled={loading || isActive}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={config.color} />
              ) : (
                <>
                  <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
                    <Ionicons
                      name={config.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={24}
                      color={config.color}
                    />
                  </View>
                  <Text style={[styles.cardLabel, isActive && { color: config.color, fontWeight: '700' }]}>
                    {config.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={config.color} />
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
