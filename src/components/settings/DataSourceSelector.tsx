import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';
import { GARMIN_CONNECT_APP_NAME } from '../../constants/garminAttribution';
import { GarminConnectMark } from '../attribution/GarminConnectMark';

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

// Garmin carries no `icon`: it renders the official Garmin Connect tile
// instead of an Ionicons stand-in, and its label is the full, unabbreviated
// app name — both required by the Garmin API Brand Guidelines when displaying
// a connection. Colors come from the theme token so the app has one Garmin
// blue rather than the three that were previously in circulation.
const PROVIDER_CONFIG: Record<string, { label: string; color: string; icon?: string }> = {
  garmin: { label: GARMIN_CONNECT_APP_NAME, color: colors.garmin },
  strava: { label: 'Strava', color: colors.strava, icon: 'bicycle-outline' },
  whoop: { label: 'WHOOP', color: colors.whoop, icon: 'pulse-outline' },
  suunto: { label: 'Suunto', color: colors.suunto, icon: 'watch-outline' },
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
                    {config.icon ? (
                      <Ionicons
                        name={config.icon as React.ComponentProps<typeof Ionicons>['name']}
                        size={24}
                        color={config.color}
                      />
                    ) : (
                      <GarminConnectMark size={24} />
                    )}
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
    // Wrap to a second line once cards can't comfortably fit side-by-side.
    // With four providers connected on a narrow phone (iPhone SE / 13 mini at
    // 375pt) four cards in one row would clip the label text. The minWidth
    // on each card forces a clean wrap to a 2×2 grid at 4 providers; 2- and
    // 3-provider layouts still fit on one row.
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexGrow: 1,
    // 150pt fits a 40pt icon + 10pt gap + label + 20pt checkmark + padding
    // without clipping. Set as the wrap trigger; flexGrow then stretches
    // cards to fill the row evenly.
    minWidth: 150,
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
    borderRadius: radius.full,
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
