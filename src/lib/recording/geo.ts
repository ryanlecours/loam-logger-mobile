// Pure math for the ride recorder. No native imports, no state: everything
// here is a function from samples to numbers so it can be unit-tested without
// a device. GPS is noisy in exactly the places mountain bikers ride (tree
// cover, canyons), so the recorder never trusts a raw sample; these helpers
// are where the distrust lives.

export interface GeoSample {
  latitude: number;
  longitude: number;
  /** Meters above sea level; null when the fix has no altitude. */
  altitude: number | null;
  /** Horizontal accuracy radius in meters; null when unknown. */
  accuracy: number | null;
  /** Seconds since the recording session started. */
  t: number;
}

/**
 * Samples with a worse reported accuracy than this never touch the distance
 * or elevation math (they are still stored raw for later server-side
 * reprocessing). 25 m keeps tree-cover fixes while dropping the cold-start
 * and canyon outliers that otherwise teleport the rider.
 */
export const MAX_ACCURACY_M = 25;

/**
 * A segment shorter than this is indistinguishable from GPS jitter while
 * standing still, so it adds no distance. At the 1 s sampling interval even
 * a slow climb moves further than this.
 */
export const MIN_SEGMENT_M = 2;

/**
 * Climbs only count once they exceed this much vertical since the last
 * trough. Raw GPS altitude wobbles a few meters sample to sample; summing it
 * naively can double a ride's real elevation gain.
 */
export const ELEVATION_HYSTERESIS_M = 3;

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isUsableFix(sample: GeoSample): boolean {
  return sample.accuracy === null || sample.accuracy <= MAX_ACCURACY_M;
}

/**
 * Running totals a recording accumulates sample by sample. Kept as a plain
 * value object so the recorder can persist and restore it.
 */
export interface Accumulator {
  distanceM: number;
  elevationGainM: number;
  /** Last accuracy-accepted fix; the anchor for the next distance segment. */
  lastFix: GeoSample | null;
  /** Lowest altitude seen since the last counted climb (hysteresis anchor). */
  altitudeAnchor: number | null;
}

export function emptyAccumulator(): Accumulator {
  return { distanceM: 0, elevationGainM: 0, lastFix: null, altitudeAnchor: null };
}

/**
 * Fold one sample into the totals. Returns a new accumulator; never mutates.
 *
 * Distance: haversine between accuracy-accepted fixes, with sub-jitter
 * segments dropped. Elevation: threshold accumulator; descending moves the
 * anchor down for free, climbing pays out only when the rise since the
 * anchor clears the hysteresis, at which point the anchor jumps to the top.
 */
export function accumulate(acc: Accumulator, sample: GeoSample): Accumulator {
  if (!isUsableFix(sample)) return acc;

  let { distanceM, elevationGainM, altitudeAnchor } = acc;

  if (acc.lastFix) {
    const segment = haversineMeters(
      acc.lastFix.latitude,
      acc.lastFix.longitude,
      sample.latitude,
      sample.longitude,
    );
    if (segment >= MIN_SEGMENT_M) {
      distanceM += segment;
    }
  }

  if (sample.altitude !== null) {
    if (altitudeAnchor === null || sample.altitude < altitudeAnchor) {
      altitudeAnchor = sample.altitude;
    } else if (sample.altitude - altitudeAnchor >= ELEVATION_HYSTERESIS_M) {
      elevationGainM += sample.altitude - altitudeAnchor;
      altitudeAnchor = sample.altitude;
    }
  }

  return { distanceM, elevationGainM, lastFix: sample, altitudeAnchor };
}
