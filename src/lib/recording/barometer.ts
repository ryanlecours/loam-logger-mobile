import { Barometer } from 'expo-sensors';

import type { BaroReading } from './altitude';
import { pressureToRelativeAltitudeM } from './altitude';

// The only file that touches the pressure sensor. Everything downstream works
// off BaroReading, so the fusion math in ./altitude stays testable without a
// device and the recorder never learns which platform it is on.

/** Starts/stops the pressure sensor. Readings arrive via the callback. */
export interface BarometerController {
  start(onReading: (reading: BaroReading) => void): Promise<void>;
  stop(): void;
}

/**
 * Once per second, matching the location stream. The sensor will happily run
 * far faster and there is nothing to gain from it: a rider does not change
 * altitude meaningfully inside a second, and every extra sample is battery
 * spent during a multi-hour recording.
 */
const UPDATE_INTERVAL_MS = 1000;

/**
 * Bumped on every start. iOS `CMAltimeter` re-zeroes its relative altitude
 * each time updates begin, so the fuser needs to know that a reading belongs
 * to a new datum and its offset has to be re-derived rather than averaged.
 */
let epochCounter = 0;

let subscription: { remove: () => void } | null = null;

export const rideBarometerController: BarometerController = {
  async start(onReading) {
    // Nothing about a ride depends on this sensor: without it the recorder
    // falls back to smoothed GPS altitude and a wider deadband. So an
    // unavailable or throwing barometer degrades the number rather than
    // failing the recording.
    const available = await Barometer.isAvailableAsync().catch(() => false);
    if (!available) return;

    const epoch = ++epochCounter;
    Barometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    subscription = Barometer.addListener(({ pressure, relativeAltitude }) => {
      // iOS gives CMAltimeter's own relative altitude, already fused and
      // temperature-compensated; Android reports raw hPa and nothing else, so
      // the standard-atmosphere conversion stands in. Both are relative to an
      // arbitrary datum, which is all the fuser wants.
      const relativeAltitudeM =
        typeof relativeAltitude === 'number' && Number.isFinite(relativeAltitude)
          ? relativeAltitude
          : typeof pressure === 'number' && Number.isFinite(pressure) && pressure > 0
            ? pressureToRelativeAltitudeM(pressure)
            : null;
      if (relativeAltitudeM === null) return;

      // Deliberately Date.now() rather than the sensor's own `timestamp`,
      // whose epoch base is platform-defined. The fuser compares this against
      // location timestamps, so both have to be on the same clock.
      onReading({ relativeAltitudeM, at: Date.now(), epoch });
    });
  },

  stop() {
    subscription?.remove();
    subscription = null;
  },
};
