// Turning altitude sensors into something safe to accumulate.
//
// Elevation gain is a one-sided sum, so it has no tolerance for noise: every
// upward wiggle adds and no downward wiggle ever subtracts. Distance survives
// GPS noise because horizontal error partly cancels along a line; gain does
// not. A phone's GNSS vertical error is 1.5-3x its horizontal error and drifts
// over tens of seconds rather than sample to sample, which is exactly the
// shape that defeats a naive threshold.
//
// So GPS altitude is the fallback here, not the source of truth. Every iPhone
// since the 6 (and most Android handsets) carries a barometer, which is the
// same sensor class a Garmin uses and is precise to a few centimetres over the
// seconds that matter for a climb. What it cannot do is tell you your absolute
// height, or hold a datum against a weather system moving through. GPS is the
// mirror image: absolutely referenced, terrible in the short term.
//
// Hence a complementary filter. Short-term shape comes from the barometer,
// long-term reference from GPS, joined by an offset that tracks the difference
// slowly enough (~3 min) that GPS noise never reaches the output.
//
// No native imports: this is pure state-machine math so the whole fusion path
// is testable without a device.

import type { AltitudeReading } from './geo';

/**
 * Deadband for barometric readings. The sensor resolves ~0.1 m, so 1 m is
 * already generous; it exists to absorb the rider bouncing on the saddle
 * rather than sensor error.
 *
 * It is NOT the noise filter. A deadband in front of a one-sided sum has a
 * cliff rather than a slope: at 0.3 m of noise it books nothing, at 0.75 m it
 * books hundreds of feet over a single descent, and no width setting moves
 * that cliff somewhere safe. `BARO_SMOOTHING_TAU_MS` is what keeps the input
 * on the good side of it.
 */
export const BARO_HYSTERESIS_M = 1;

/**
 * Time constant of the low-pass in front of the barometric deadband.
 *
 * The barometer is precise but it is not measuring altitude, it is measuring
 * the pressure at the phone, and on a descent those differ. Airflow over a
 * jersey pocket or a bar mount is worth ~3 m of apparent altitude at 8 m/s,
 * and it swings with every gust, brake and change of body position. That is a
 * real signal, so accuracy specs do not bound it and the deadband does not
 * reject it: it ratchets, and it is worth several hundred feet across a long
 * descent while a climb hides it inside a total that is mostly real.
 *
 * Ten seconds separates the two by frequency, which is the axis they actually
 * differ on. Buffeting lives at seconds; the shortest terrain a rider would
 * call a climb lives at tens of seconds and survives. The cost is a ~10 s lag
 * at each turning point, which trims a few metres per lap off the total and
 * is the right trade against a one-sided error that only ever adds.
 */
export const BARO_SMOOTHING_TAU_MS = 10000;

/**
 * Deadband for GPS-only readings, after smoothing. Wide because smoothing
 * removes the sample-to-sample spikes but not the slow correlated drift, which
 * is what actually inflates a total.
 */
export const GPS_HYSTERESIS_M = 4;

/**
 * Fixes with worse vertical accuracy than this are ignored for elevation
 * (they still count for distance, which has its own, horizontal, gate). This
 * is what drops the cold-start fixes that used to contribute gain purely on
 * the strength of a decent horizontal accuracy.
 */
export const MAX_ALTITUDE_ACCURACY_M = 10;

/** A barometer sample older than this stops being trusted; GPS takes over. */
export const BARO_STALE_MS = 15000;

/** Median window over raw GPS altitude. Odd, small: kills spikes, not shape. */
export const GPS_MEDIAN_WINDOW = 5;

/** EMA over the median output. Removes what the median leaves behind. */
export const GPS_EMA_ALPHA = 0.15;

/**
 * How fast the baro-to-GPS offset tracks. At ~1 sample/s this is a ~200 s
 * time constant: slow enough that GPS noise (~30 s correlation) is filtered
 * out of the fused output, fast enough to follow a weather front.
 */
export const OFFSET_ALPHA = 0.005;

/** One reading from the barometer, as the recorder last saw it. */
export interface BaroReading {
  /**
   * Meters, relative to an arbitrary datum fixed when the subscription
   * started. Only differences are meaningful.
   */
  relativeAltitudeM: number;
  /** Epoch ms of the reading. */
  at: number;
  /**
   * Identifies the datum. iOS `CMAltimeter` zeroes its relative altitude every
   * time updates restart, so a change here means the series jumped by an
   * arbitrary amount and the offset must be re-seeded rather than averaged.
   */
  epoch: number;
}

/**
 * Standard atmosphere, for Android (and any iOS build where `relativeAltitude`
 * is missing): `Sensor.TYPE_PRESSURE` reports hPa and nothing else.
 *
 * The absolute result is wrong by however far the day's weather sits from
 * 1013.25 hPa, which does not matter at all: this feeds a relative datum, and
 * the fuser's offset removes any constant error. Only the derivative is used.
 */
export function pressureToRelativeAltitudeM(pressureHPa: number): number {
  return 44330 * (1 - Math.pow(pressureHPa / 1013.25, 1 / 5.255));
}

/** Streaming median-then-EMA over raw GPS altitude. */
class GpsAltitudeFilter {
  private ring: number[] = [];
  private ema: number | null = null;

  push(value: number): number {
    this.ring.push(value);
    if (this.ring.length > GPS_MEDIAN_WINDOW) this.ring.shift();
    const sorted = [...this.ring].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.ema = this.ema === null ? median : this.ema + GPS_EMA_ALPHA * (median - this.ema);
    return this.ema;
  }

  reset(): void {
    this.ring = [];
    this.ema = null;
  }
}

/**
 * Time-aware EMA over the referenced barometric series.
 *
 * Time-aware rather than a fixed alpha because the location stream is what
 * clocks this, and the OS throttles it: a fixed alpha tuned at 1 Hz becomes a
 * ~50 s time constant when a backgrounded app drops to a fix every 5 s, which
 * flattens real climbs. Deriving alpha from the actual gap holds the same
 * ~10 s regardless, and a long gap resolves to alpha ~= 1, which snaps to the
 * new reading instead of dragging a stale level across the hole.
 */
class BaroSmoother {
  private value: number | null = null;
  private at: number | null = null;

  push(raw: number, at: number): number {
    if (this.value === null || this.at === null) {
      this.value = raw;
      this.at = at;
      return raw;
    }
    const dt = Math.max(0, at - this.at);
    const alpha = 1 - Math.exp(-dt / BARO_SMOOTHING_TAU_MS);
    this.value += alpha * (raw - this.value);
    this.at = Math.max(this.at, at);
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.at = null;
  }
}

export type AltitudeSource = 'baro' | 'gps';

/** What the fuser produced for one fix, ready for `accumulate`. */
export interface FusedAltitude extends AltitudeReading {
  source: AltitudeSource;
  /**
   * Always set, and always equal to `source`: the sensor IS the series here.
   * The two are separate fields because they are read by different things for
   * different reasons (the recorder stores `source` per point; `accumulate`
   * only ever compares `series` for equality) and a later split of one sensor
   * into several datums should not have to touch the storage column.
   */
  series: AltitudeSource;
}

/**
 * Fuses barometric and GPS altitude into one absolutely-referenced series.
 *
 * Live only. A recording restored from SQLite replays its stored fused values
 * instead of re-running this (the barometer datum died with the old process),
 * then calls `seed` so the first post-restore reading continues from the same
 * level rather than stepping.
 */
export class AltitudeFuser {
  private gpsFilter = new GpsAltitudeFilter();
  private baroFilter = new BaroSmoother();
  /** fusedAbsolute - baroRelative. Null until a GPS fix has referenced it. */
  private offset: number | null = null;
  private epoch: number | null = null;
  /** Last value handed out, for re-seeding across a datum change. */
  private last: number | null = null;

  /**
   * Continue from a known absolute altitude (restore, or a datum change).
   * The next barometric reading re-derives the offset from this rather than
   * from GPS, so the series has no step at the seam.
   */
  seed(absoluteM: number | null): void {
    this.last = absoluteM;
    this.offset = null;
    this.epoch = null;
    this.gpsFilter.reset();
    this.baroFilter.reset();
  }

  /**
   * Fold one fix (and whatever the barometer last reported) into the series.
   * Returns null when neither sensor has anything trustworthy to say, in which
   * case the caller must not accumulate elevation for this fix.
   *
   * @param at epoch ms of the fix, for the barometer freshness check
   */
  push(
    altitude: number | null,
    altitudeAccuracy: number | null,
    at: number,
    baro: BaroReading | null,
  ): FusedAltitude | null {
    // A fix whose vertical accuracy is unknown is trusted (many Android
    // stacks never populate it); one that reports itself as bad is not.
    const gpsUsable =
      altitude !== null &&
      Number.isFinite(altitude) &&
      (altitudeAccuracy === null || altitudeAccuracy <= MAX_ALTITUDE_ACCURACY_M);
    const gps = gpsUsable ? this.gpsFilter.push(altitude as number) : null;

    const baroFresh = baro !== null && at >= baro.at && at - baro.at <= BARO_STALE_MS;

    if (baroFresh) {
      // A new datum makes the previous offset meaningless. Re-anchor on the
      // last value handed out so the fused series stays continuous; the
      // rider did not teleport just because the sensor restarted.
      if (this.epoch !== baro.epoch) {
        this.epoch = baro.epoch;
        const anchor = this.last ?? gps;
        this.offset = anchor === null ? null : anchor - baro.relativeAltitudeM;
      }

      if (this.offset === null) {
        if (gps === null) return null; // nothing absolute to reference yet
        this.offset = gps - baro.relativeAltitudeM;
      } else if (gps !== null) {
        this.offset += OFFSET_ALPHA * (gps - baro.relativeAltitudeM - this.offset);
      }

      // Smoothing goes on the referenced value rather than the raw relative
      // one so the filter state is in absolute metres. A datum change then
      // re-anchors onto `this.last`, which is already the smoothed level, and
      // the seam costs nothing instead of slewing across the jump.
      const value = this.baroFilter.push(baro.relativeAltitudeM + this.offset, at);
      this.last = value;
      return { value, hysteresisM: BARO_HYSTERESIS_M, source: 'baro', series: 'baro' };
    }

    // Barometer absent or stale. Because the offset has been tracking GPS all
    // along, the fused value was already sitting near the GPS series, so
    // handing back the filtered GPS value is close to continuous. The wider
    // deadband comes with it, which is what keeps the dropout from inflating
    // the total.
    //
    // Close to continuous is not continuous: the offset tracks on a ~200 s
    // constant, so at the moment of handover the two series sit however far
    // apart the tracking error had grown, which is metres. `series` tells
    // `accumulate` that gap is a change of datum and not a climb.
    if (gps === null) return null;
    this.last = gps;
    return { value: gps, hysteresisM: GPS_HYSTERESIS_M, source: 'gps', series: 'gps' };
  }
}

/** Deadband that belongs with a stored reading, when replaying from SQLite. */
export function hysteresisForSource(source: AltitudeSource): number {
  return source === 'baro' ? BARO_HYSTERESIS_M : GPS_HYSTERESIS_M;
}
