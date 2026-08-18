import { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRideRecorder } from '../../src/hooks/useRideRecorder';
import { rideRecorder } from '../../src/lib/recording/recorder';
import { rideBarometerController } from '../../src/lib/recording/barometer';
import LiveTrackMap from '../../src/components/ride/LiveTrackMap';
import { rideLocationController } from '../../src/lib/recording/locationTask';
import { formatDuration, formatElevation } from '../../src/utils/greetingMessages';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { colors, radius } from '../../src/constants/theme';

/**
 * Live GPS recording. Sampling runs through the background location task
 * (src/lib/recording/locationTask.ts), so a locked screen, an app switch, or
 * even an OS jettison of the process does not lose the ride: points land in
 * SQLite as they arrive, and an interrupted session is rebuilt paused by
 * rideRecorder.restoreIfNeeded() on next launch (app/_layout.tsx re-surfaces
 * this screen when that happens).
 */
export default function RecordRideScreen() {
  const router = useRouter();
  const { snapshot, elapsedMs } = useRideRecorder();
  const { formatDistance } = useDistanceUnit();
  const { distanceUnit } = useDistanceUnit();
  const [permission, requestPermission] = Location.useForegroundPermissions();

  // Keep-awake only while a session is live (recording or paused), not from
  // mount: a rider sitting on the pre-start screen deciding whether to ride
  // should get normal screen timeout. With background sampling the lock is
  // no longer load-bearing for data; it stays because a handlebar-mounted
  // phone showing live stats going dark mid-ride reads as a crash.
  const sessionLive =
    snapshot.status === 'recording' || snapshot.status === 'paused';
  useEffect(() => {
    if (!sessionLive) return;
    const tag = 'ride-recording';
    void activateKeepAwakeAsync(tag);
    return () => {
      void deactivateKeepAwake(tag);
    };
  }, [sessionLive]);

  const handleStart = useCallback(async () => {
    const current = permission?.granted
      ? permission
      : await requestPermission();
    if (!current?.granted) return;
    await rideRecorder.start(rideLocationController, rideBarometerController);
  }, [permission, requestPermission]);

  const handleFinish = useCallback(async () => {
    if (snapshot.pointCount === 0) {
      Alert.alert(
        'Nothing recorded yet',
        'No GPS points have come in. Keep riding a moment, or discard the recording.',
      );
      return;
    }
    await rideRecorder.stop();
    router.replace('/ride/save-recording');
  }, [router, snapshot.pointCount]);

  const handleDiscard = useCallback(() => {
    const leave = async () => {
      await rideRecorder.clear();
      router.back();
    };
    if (snapshot.status === 'idle') {
      void leave();
      return;
    }
    Alert.alert('Discard this recording?', 'The recorded ride will be deleted.', [
      { text: 'Keep recording', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => void leave() },
    ]);
  }, [router, snapshot.status]);

  // The layout hides the header back button and disables the swipe gesture,
  // but neither touches Android's hardware back, which would otherwise pop
  // this screen silently and leave the singleton recorder running with no UI
  // attached. Route it into the same explicit discard flow.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleDiscard();
        return true;
      });
      return () => subscription.remove();
    }, [handleDiscard]),
  );

  // Permission permanently denied: the OS will not re-prompt, so the only
  // useful button is the one that opens Settings.
  if (permission && !permission.granted && !permission.canAskAgain) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Location access is off</Text>
          <Text style={styles.permissionBody}>
            Recording a ride needs your location while the app is open. Turn it
            on in Settings to record.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void Linking.openSettings()}
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const recording = snapshot.status === 'recording';
  const paused = snapshot.status === 'paused';
  const idle = snapshot.status === 'idle';

  return (
    <View style={styles.container}>
      <View style={[styles.statsBlock, !idle && styles.statsBlockCompact]}>
        <Text style={[styles.elapsed, !idle && styles.elapsedCompact]}>
          {formatDuration(Math.floor(elapsedMs / 1000))}
        </Text>
        <Text style={styles.elapsedLabel}>elapsed</Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDistance(snapshot.distanceM)}</Text>
            <Text style={styles.statLabel}>distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatElevation(snapshot.elevationGainM, distanceUnit)}
            </Text>
            <Text style={styles.statLabel}>climbed</Text>
          </View>
        </View>

        {paused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>Paused</Text>
          </View>
        )}
        {/* Auto-pause reads as a distinct, softer state than the rider's own
            pause: the recording is still live and will pick itself back up,
            so the badge explains rather than alarms. */}
        {snapshot.autoPaused && (
          <View style={styles.autoPausedBadge}>
            <Text style={styles.autoPausedBadgeText}>Auto-paused, stopped moving</Text>
          </View>
        )}
        {recording && snapshot.pointCount === 0 && (
          <Text style={styles.acquiring}>Acquiring GPS signal...</Text>
        )}
      </View>

      {/* Mounted only once a session exists: the pre-start screen should not
          spin up tile fetching and map rendering for a rider still deciding.
          The track array is mutated in place by the recorder; trackLength in
          the snapshot is the change signal LiveTrackMap keys on. */}
      {!idle && (
        <View style={styles.mapWrap}>
          <LiveTrackMap
            track={rideRecorder.getTrack()}
            trackLength={snapshot.trackLength}
            lastFix={snapshot.lastFix}
          />
        </View>
      )}

      <View style={styles.controls}>
        {idle && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => void handleStart()}>
            <Ionicons name="play" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Start Recording</Text>
          </TouchableOpacity>
        )}
        {recording && (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => rideRecorder.pause()}>
            <Ionicons name="pause" size={20} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Pause</Text>
          </TouchableOpacity>
        )}
        {paused && (
          <TouchableOpacity
            style={styles.secondaryButton}
            // The controller matters for a RESTORED pause (the old process's
            // stream died with it); a live pause keeps its own stream and
            // resume() ignores the argument.
            onPress={() =>
              void rideRecorder.resume(rideLocationController, rideBarometerController)
            }
          >
            <Ionicons name="play" size={20} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Resume</Text>
          </TouchableOpacity>
        )}
        {(recording || paused) && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => void handleFinish()}>
            <Ionicons name="stop" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Finish</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={handleDiscard}>
          <Text style={styles.cancelButtonText}>{idle ? 'Cancel' : 'Discard'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: 'space-between',
  },
  statsBlock: {
    alignItems: 'center',
    marginTop: 48,
  },
  // Once the map is on screen the stats give up their centerpiece spacing.
  statsBlockCompact: {
    marginTop: 8,
  },
  mapWrap: {
    flex: 1,
    marginVertical: 16,
  },
  elapsed: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  elapsedCompact: {
    fontSize: 40,
  },
  elapsedLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    gap: 48,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  pausedBadge: {
    marginTop: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  pausedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Quieter than the manual pause badge on purpose. Sage is the app's "you
  // did this" voice; auto-pause is the recorder reporting, not the rider
  // acting, so it sits in neutral surface tones and stays out of the way.
  autoPausedBadge: {
    marginTop: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  autoPausedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acquiring: {
    marginTop: 32,
    fontSize: 14,
    color: colors.textMuted,
  },
  controls: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permissionBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
});
