// Auto-pause: deciding whether the rider is actually riding.
//
// Elapsed time is not a cosmetic number here. Ride duration is what accrues
// against installed components to drive service predictions, so counting the
// twenty minutes spent at the trailhead, at the overlook, and fixing someone
// else's flat ages a drivetrain that was hanging still. A provider-synced ride
// reports moving time; an in-app recording that reports wall-clock time makes
// the two paths disagree about what a ride even is.
//
// Note this is OUR auto-pause, not the platform's. iOS
// `pausesUpdatesAutomatically` hands the decision to CoreLocation, which stops
// delivering updates entirely and is notoriously unreliable about ever
// resuming, so a rider can lose the back half of a ride. Keeping the location
// stream running and judging motion ourselves costs a little battery and keeps
// the track complete: paused samples are still recorded, just flagged not
// moving, which is exactly what `NormalizedStreams.moving` carries server-side.
//
// Pure math, no native imports.

import { haversineMeters } from './geo';

/** Trailing window the motion verdict is computed over. */
export const MOTION_WINDOW_S = 12;

/**
 * The window needs this much span before it says anything. Below it a verdict
 * would be one or two fixes of jitter, which is how auto-pause implementations
 * end up flapping at every traffic light.
 */
export const MOTION_MIN_SPAN_S = 6;

/** Below this average speed the rider is stopped (~1.8 km/h). */
export const AUTO_PAUSE_SPEED_MPS = 0.5;

/**
 * And above this one they are riding again (~3.6 km/h). The gap between the
 * two thresholds is deliberate: a single band would toggle every few seconds
 * for a rider trackstanding or ratcheting up a technical climb.
 */
export const AUTO_RESUME_SPEED_MPS = 1.0;

/**
 * No fix at all for this long counts as stopped. Generous, because losing
 * signal under cover is not the same as stopping, but the ceiling has to
 * exist: a rider who parks the bike somewhere with no sky view would otherwise
 * accrue hours. Distance has already stopped accruing in that window either
 * way, so the two totals stay consistent.
 */
export const MOTION_STALE_MS = 20000;

interface MotionSample {
  /** Seconds since session start. */
  t: number;
  latitude: number;
  longitude: number;
}

/**
 * Trailing window of accepted fixes, answering one question: how fast is the
 * rider actually covering ground?
 *
 * Net displacement between the ends of the window, not summed path length.
 * Summed path length is exactly the quantity GPS jitter inflates, so a
 * standing rider would show a steady walking pace and never auto-pause.
 */
export class MotionWindow {
  private samples: MotionSample[] = [];

  push(sample: MotionSample): void {
    this.samples.push(sample);
    const cutoff = sample.t - MOTION_WINDOW_S;
    while (this.samples.length > 0 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  }

  reset(): void {
    this.samples = [];
  }

  /**
   * Average ground speed over the window, or null while the window is too
   * short to be worth believing. Null means "no opinion": the caller keeps
   * whatever motion state it already had.
   */
  speedMps(): number | null {
    if (this.samples.length < 2) return null;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const span = last.t - first.t;
    if (span < MOTION_MIN_SPAN_S) return null;
    const displacement = haversineMeters(
      first.latitude,
      first.longitude,
      last.latitude,
      last.longitude,
    );
    return displacement / span;
  }
}

/**
 * Apply the two-threshold decision to a speed reading.
 *
 * @param moving whether the rider is currently considered to be moving
 * @param speedMps window speed, or null when the window has no opinion
 * @returns the motion state to hold going forward
 */
export function nextMotionState(moving: boolean, speedMps: number | null): boolean {
  if (speedMps === null) return moving;
  if (moving) return speedMps >= AUTO_PAUSE_SPEED_MPS;
  return speedMps > AUTO_RESUME_SPEED_MPS;
}
