import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../../constants/theme';
import { ProviderConnectList } from '../integrations/ProviderConnectList';
import {
  describeLookback,
  describeSince,
  rideProviderLabel,
  type RideSourceState,
} from '../../utils/rideSource';

export type RideSourceCardState = Exclude<RideSourceState, { kind: 'has-rides' }>;

interface RideSourceCardProps {
  state: RideSourceCardState;
  onRecordPress: () => void;
  onAddRidePress: () => void;
  /** A failed import is rerun from the provider's row in Settings. */
  onOpenSettings: () => void;
  /** "I don't use a ride tracker": stop asking this rider to connect one. */
  onDeclineTracker: () => void;
  /** The rider changed their mind and wants the connect rows back. */
  onReconsiderTracker: () => void;
  /** A session is already running, so the record action returns to it. */
  recorderLive?: boolean;
  /** Injected so tests can pin the clock for the "started N minutes ago" line. */
  now?: Date;
}

/**
 * Where this rider's hours come from, on an account with a bike and no rides.
 *
 * Rides are the input and gear health is the output, so a rider at zero rides
 * has a tracked bike whose clocks are all stopped. The card that used to sit
 * here offered "Connect a data source" to everyone, including a rider who had
 * connected Garmin two minutes ago and was waiting on the import, and its
 * button landed in Settings, where the right row still had to be found.
 *
 * One card, one of five faces, decided by resolveRideSourceState:
 *  - none: nothing connected. Says so plainly and puts the same four connect
 *    rows the onboarding step shows right here, since whichever app or watch
 *    the rider already uses is the one that imports a year of history on its
 *    own. Recording and typing a ride in come after, and the rider can say
 *    they use no tracker at all.
 *  - importing: connected and the connect-time import is running. Progress
 *    where a provider can report it.
 *  - empty: connected, import finished, still nothing. The window had no
 *    rides in it, so the next ride has to be recorded or logged.
 *  - failed: connected, import died. Points at Settings, where it reruns.
 *  - manual: the rider said they do not use a tracker. The two manual paths
 *    and a quiet way back.
 *
 * Never a clean bill of health: zero hours is no evidence, and the headline
 * above this card says "nothing on the clock" rather than "good to go".
 */
export function RideSourceCard({
  state,
  onRecordPress,
  onAddRidePress,
  onOpenSettings,
  onDeclineTracker,
  onReconsiderTracker,
  recorderLive = false,
  now,
}: RideSourceCardProps) {
  const manualPaths = (
    <>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onRecordPress}
        accessibilityRole="button"
        accessibilityLabel={recorderLive ? 'Back to your ride in progress' : 'Record a ride'}
      >
        <Ionicons
          name={recorderLive ? 'radio-button-on' : 'play'}
          size={16}
          color={colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.secondaryButtonText}>
          {recorderLive ? 'Back to your ride' : 'Record a ride'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tertiaryButton}
        onPress={onAddRidePress}
        accessibilityRole="button"
        accessibilityLabel="Log a ride manually"
      >
        <Text style={styles.tertiaryButtonText}>Log a ride manually</Text>
      </TouchableOpacity>
    </>
  );

  switch (state.kind) {
    case 'none':
      return (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>RIDE SOURCE</Text>
          <Text style={styles.title} accessibilityRole="header">
            No ride source connected
          </Text>
          <Text style={styles.body}>
            Your parts are tracked, but nothing is feeding them hours. Connect the app or watch that
            records your rides and the past year imports on its own.
          </Text>
          <ProviderConnectList testIDPrefix="dashboard-connect" returnTo="dashboard" />
          <View style={styles.paths}>{manualPaths}</View>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDeclineTracker}
            accessibilityRole="button"
            accessibilityLabel="I don't use a ride tracker"
          >
            <Text style={styles.declineText}>I don&apos;t use a ride tracker</Text>
          </TouchableOpacity>
        </View>
      );

    case 'importing': {
      const label = rideProviderLabel(state.provider);
      const progress =
        state.ridesFound !== null
          ? `${state.ridesFound} ride${state.ridesFound === 1 ? '' : 's'} so far`
          : 'Rides show up here as they arrive. The first ones usually land within a few minutes.';
      return (
        <View style={styles.card} accessibilityLiveRegion="polite">
          <Text style={styles.eyebrow}>RIDE SOURCE</Text>
          <View style={styles.titleRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.title, styles.titleInline]} accessibilityRole="header">
              Importing your rides from {label}
            </Text>
          </View>
          <Text style={styles.body}>{progress}</Text>
          <Text style={styles.meta}>Started {describeSince(state.startedAt, now)}</Text>
        </View>
      );
    }

    case 'empty': {
      const label = rideProviderLabel(state.provider);
      const window = describeLookback(state.lookbackDays);
      return (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>RIDE SOURCE</Text>
          <Text style={styles.title} accessibilityRole="header">
            {window ? `Nothing found in ${window}` : 'No rides have come in yet'}
          </Text>
          <Text style={styles.body}>
            {window
              ? `${label} is connected, but it had no rides to import. Record one or log one by hand and the hours start counting.`
              : `${label} is connected, but no import has run for it yet. Start one from Settings, or record or log a ride by hand.`}
          </Text>
          <View style={styles.paths}>
            {!window && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onOpenSettings}
                accessibilityRole="button"
                accessibilityLabel="Import rides in Settings"
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={16}
                  color={colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.secondaryButtonText}>Import rides in Settings</Text>
              </TouchableOpacity>
            )}
            {manualPaths}
          </View>
        </View>
      );
    }

    case 'failed': {
      const label = rideProviderLabel(state.provider);
      return (
        <View style={[styles.card, styles.cardWarning]}>
          <Text style={styles.eyebrow}>RIDE SOURCE</Text>
          <Text style={styles.title} accessibilityRole="header">
            The import from {label} didn&apos;t finish
          </Text>
          <Text style={styles.body}>
            {label} is connected, but its rides never landed. Run the import again from Settings, or
            log a ride by hand in the meantime.
          </Text>
          <View style={styles.paths}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Retry the import in Settings"
            >
              <Ionicons
                name="refresh"
                size={16}
                color={colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.secondaryButtonText}>Retry in Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={onAddRidePress}
              accessibilityRole="button"
              accessibilityLabel="Log a ride manually"
            >
              <Text style={styles.tertiaryButtonText}>Log a ride manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    case 'manual':
      return (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>RIDE SOURCE</Text>
          <Text style={styles.title} accessibilityRole="header">
            Logging rides by hand
          </Text>
          <Text style={styles.body}>
            Hours only count once a ride is logged. Record one here or type it in.
          </Text>
          <View style={styles.paths}>{manualPaths}</View>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onReconsiderTracker}
            accessibilityRole="button"
            accessibilityLabel="Connect a ride tracker after all"
          >
            <Text style={styles.declineText}>Connect a ride tracker after all</Text>
          </TouchableOpacity>
        </View>
      );
  }
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
    gap: space.md,
  },
  // Feedback voice (a failed import is not a component state): the System
  // Notice hairline, never the health ramp.
  cardWarning: {
    borderColor: colors.cautionBorder,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMuted,
  },
  title: {
    ...type.subtitle,
    color: colors.textPrimary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  titleInline: {
    flex: 1,
  },
  body: {
    ...type.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: space.md,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  paths: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: space.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    alignSelf: 'stretch',
    minHeight: 44,
    paddingHorizontal: space.xxl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  secondaryButtonText: {
    ...type.calloutStrong,
    color: colors.primary,
  },
  tertiaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.md,
  },
  tertiaryButtonText: {
    ...type.footnote,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  declineButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: space.xl,
  },
  declineText: {
    ...type.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
