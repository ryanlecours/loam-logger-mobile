import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '../../lib/connectivity';
import { colors } from '../../constants/theme';

/**
 * Global "no connection" strip under the status bar. Informational, not
 * alarming: offline at a trailhead is a normal state for this app, everything
 * on screen still works from the persisted cache, and new rides queue. So it
 * speaks in the app's muted surface voice, not a warning color.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + 6 }]}
      accessibilityRole="text"
      accessibilityLabel="Offline. Showing saved data. New rides will sync when you have signal."
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.textSecondary} />
      <Text style={styles.text}>Offline. Saved data shown; new rides sync later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
