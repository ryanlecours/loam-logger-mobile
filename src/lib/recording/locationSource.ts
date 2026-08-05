import * as Location from 'expo-location';
import type { LocationSource } from './recorder';

// The one file that touches expo-location for recording. Everything else
// works against the LocationSource interface, which keeps the recorder and
// its tests free of native modules.
//
// BestForNavigation at ~1 s / 3 m is the fitness-tracker standard: enough
// resolution for singletrack switchbacks, and foreground-only in phase 1 so
// battery exposure is bounded by screen-on time (the record screen holds a
// keep-awake lock). Phase 2 moves this to a TaskManager background task.
export const gpsLocationSource: LocationSource = {
  async watch(onUpdate) {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (location) => {
        onUpdate({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        });
      },
    );
    return () => subscription.remove();
  },
};
