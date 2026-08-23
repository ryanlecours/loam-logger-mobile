// Pure math for the ride recorder. No native imports, no state: everything
// here is a function from samples to numbers so it can be unit-tested without
// a device. GPS is noisy in exactly the places mountain bikers ride (tree
// cover, canyons), so the recorder never trusts a raw sample; these helpers
// are where the distrust lives.
//
// Altitude deliberately does NOT live here. A raw GPS altitude is never good
// enough to accumulate directly (see ./altitude), so `accumulate` takes an
// already-fused reading and only owns the deadband that turns a level series
// into a gain total.

export interface GeoSample {
  latitude: number;
  longitude: number;
  /** Meters above sea level; null when the fix has no altitude. */
  altitude: number | null;
  /** Vertical accuracy radius in meters; null when unknown. */
  altitudeAccuracy: number | null;
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
 * One altitude value ready to be accumulated, produced by ./altitude.
 *
 * `hysteresisM` rides along with the value because the right deadband depends
 * on where the value came from: a barometric reading is precise to
 * centimetres and earns a tight band, a smoothed GPS reading still carries
 * metres of correlated drift and needs a wide one. Carrying it per-reading is
 * what lets a ride survive a mid-ride barometer dropout without either
 * inflating (GPS noise under a baro-sized band) or flattening (real climbs
 * lost under a GPS-sized band).
 */
export interface AltitudeReading {
  /** Meters. Absolute datum, already smoothed and source-fused. */
  value: number;
  hysteresisM: number;
  /**
   * Opaque tag naming the series this value belongs to. Two readings tagged
   * the same are on a common datum and their difference is a real climb; two
   * tagged differently are not comparable at all, however close they look.
   *
   * The producer decides what counts as a series (see ./altitude, which tags
   * by sensor). Undefined means "one continuous series", which is what a
   * caller with a single altitude source wants.
   */
  series?: string;
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
  /** Level the next climb is measured from. See `accumulate`. */
  altitudeAnchor: number | null;
  /** Which series `altitudeAnchor` was measured in. See `accumulate`. */
  altitudeSeries: string | null;
}

export function emptyAccumulator(): Accumulator {
  return {
    distanceM: 0,
    elevationGainM: 0,
    lastFix: null,
    altitudeAnchor: null,
    altitudeSeries: null,
  };
}

/**
 * Fold one sample into the totals. Returns a new accumulator; never mutates.
 *
 * Distance: haversine between accuracy-accepted fixes, with sub-jitter
 * segments dropped.
 *
 * Elevation: a SYMMETRIC deadband. The anchor only moves once the altitude
 * has travelled `hysteresisM` away from it, in either direction, and a move
 * up pays out while a move down is free. The symmetry is the whole point.
 * An earlier version let the anchor track every downward sample with no
 * threshold at all, which turned each noise trough into a fresh, lower
 * launchpad: a 4 m wobble down followed by a 4 m wobble up is zero real
 * climb but booked 4 m of gain, several thousand times per ride. That one
 * asymmetry inflated a 1,532 ft ride to 4,002 ft. Widening the threshold
 * cannot fix it (the ratchet just needs a bigger wobble); only refusing to
 * move the anchor downward for free can.
 *
 * A change of `series` re-anchors without paying out. The anchor is a level
 * in one sensor's datum, and the gap between two datums is not a climb: when
 * the barometer drops out mid-descent the fused value hands over to GPS
 * several metres away, and booking that handover step is the same ratchet
 * wearing a different hat. Losing the real climb that straddles the seam is
 * the price, and it is bounded by one deadband; booking the step is not
 * bounded by anything and repeats on every flap.
 */
export function accumulate(
  acc: Accumulator,
  sample: GeoSample,
  altitude: AltitudeReading | null = null,
): Accumulator {
  if (!isUsableFix(sample)) return acc;

  let { distanceM, elevationGainM, altitudeAnchor, altitudeSeries } = acc;

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

  if (altitude) {
    const { value, hysteresisM } = altitude;
    const series = altitude.series ?? null;
    if (altitudeAnchor === null || series !== altitudeSeries) {
      altitudeAnchor = value;
      altitudeSeries = series;
    } else if (value - altitudeAnchor >= hysteresisM) {
      elevationGainM += value - altitudeAnchor;
      altitudeAnchor = value;
    } else if (altitudeAnchor - value >= hysteresisM) {
      altitudeAnchor = value;
    }
  }

  return { distanceM, elevationGainM, lastFix: sample, altitudeAnchor, altitudeSeries };
}
