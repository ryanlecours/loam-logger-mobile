import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { rideRecorder, type LocationController, type LocationUpdate } from './recorder';

// Background-capable GPS feed for the ride recorder. This is the phase-2
// replacement for the old foreground-only watchPositionAsync source: with
// UIBackgroundModes ["location"] (iOS) and a location foreground service
// (Android), the update stream keeps flowing while the screen is locked or
// another app is up, and iOS keeps the process alive as long as the task is
// delivering. Screen-off recording no longer depends on keep-awake.

export const RIDE_RECORDING_TASK = 'ride-recording-location';

function toUpdate(location: Location.LocationObject): LocationUpdate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude,
    altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  };
}

// defineTask must run at module scope on every JS launch BEFORE the task can
// fire; app/_layout.tsx imports this module for exactly that reason. Guarded
// off web, where there is no task manager and the web export is only a
// bundling smoke test.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    RIDE_RECORDING_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      // The task can fire in a process where no UI has mounted yet. Rebuild
      // the session from SQLite first; a restored session comes back paused,
      // in which case these fixes are correctly dropped rather than recorded
      // into a ride whose liveness nobody has confirmed.
      await rideRecorder.restoreIfNeeded();
      for (const location of data.locations) {
        rideRecorder.ingest(toUpdate(location));
      }
    },
  );
}

const UPDATE_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 3,
  // Fitness tells iOS this is a workout track, which tunes its throttling.
  //
  // Auto-pause stays OFF at the platform level and is done in the recorder
  // instead (see ./motion). CoreLocation's version stops delivering updates
  // altogether and is unreliable about ever resuming, which costs a rider the
  // back half of a ride; ours keeps the stream running, flags the stopped
  // samples, and holds the clock, so the track stays complete and the ride
  // reports moving time the way a provider-synced one does.
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  // The iOS blue pill while backgrounded: honest, and Strava-normal.
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Recording your ride',
    notificationBody: 'Loam Logger is tracking your route.',
    // Sage, matching the notification icon color used in app.json.
    notificationColor: '#4f7a5a',
  },
};

let foregroundFallback: Location.LocationSubscription | null = null;

/**
 * Production controller. Prefers the background task; if starting it is
 * rejected (OS edge cases, stripped entitlements in some build flavor), falls
 * back to the phase-1 foreground watch so recording still works with the
 * screen on rather than not at all.
 */
export const rideLocationController: LocationController = {
  async start() {
    try {
      await Location.startLocationUpdatesAsync(RIDE_RECORDING_TASK, UPDATE_OPTIONS);
    } catch (error) {
      console.warn(
        '[recording] background location unavailable, falling back to foreground watch',
        error,
      );
      foregroundFallback = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
        },
        (location) => rideRecorder.ingest(toUpdate(location)),
      );
    }
  },
  async stop() {
    foregroundFallback?.remove();
    foregroundFallback = null;
    const started = await Location.hasStartedLocationUpdatesAsync(RIDE_RECORDING_TASK).catch(
      () => false,
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(RIDE_RECORDING_TASK);
    }
  },
};
