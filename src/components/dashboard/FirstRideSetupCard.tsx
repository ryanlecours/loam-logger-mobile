import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../../constants/theme';

interface FirstRideSetupCardProps {
  onConnectPress: () => void;
  onAddRidePress: () => void;
}

/**
 * The one thing left to do on an account that has a bike and no rides.
 *
 * Rides are the input and gear health is the output, so a rider sitting at zero
 * rides has a tracked bike whose clocks are all stopped. Nothing on this screen
 * used to say that. The Pro card led instead, which sells hours remaining to
 * someone with no hours, and the ride block below offered the right two actions
 * inside a card headed "No rides yet", framed as an absence rather than a next
 * step.
 *
 * Importing history is deliberately not a third button. Backfill runs per
 * provider from the provider's own row in Settings, so it cannot start before
 * something is connected. Connecting IS the import path, and the copy says so
 * rather than offering a button that would dead-end.
 */
export function FirstRideSetupCard({ onConnectPress, onAddRidePress }: FirstRideSetupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWell}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Nothing on the clock yet
      </Text>
      <Text style={styles.body}>
        Your parts are tracked, but none of them log hours until rides land.
        Connect an account and your past rides come in with it, or log one by hand.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onConnectPress}
        accessibilityRole="button"
        accessibilityLabel="Connect a data source"
      >
        <Ionicons
          name="link-outline"
          size={16}
          color={colors.onPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.primaryButtonText}>Connect a data source</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onAddRidePress}
        accessibilityRole="button"
        accessibilityLabel="Log a ride manually"
      >
        <Text style={styles.secondaryButtonText}>Log a ride manually</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.xl,
    marginHorizontal: space.xl,
    padding: space.xxl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  iconWell: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  title: {
    ...type.subtitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...type.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: space.md,
    marginBottom: space.xxl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    alignSelf: 'stretch',
    minHeight: 44,
    paddingHorizontal: space.xxl,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  primaryButtonText: {
    ...type.calloutStrong,
    color: colors.onPrimary,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.md,
  },
  secondaryButtonText: {
    ...type.footnote,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
