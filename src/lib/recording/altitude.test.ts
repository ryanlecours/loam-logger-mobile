import {
  AltitudeFuser,
  BARO_HYSTERESIS_M,
  BARO_STALE_MS,
  GPS_HYSTERESIS_M,
  MAX_ALTITUDE_ACCURACY_M,
  pressureToRelativeAltitudeM,
  type BaroReading,
} from './altitude';
import { accumulate, emptyAccumulator } from './geo';

const baro = (relativeAltitudeM: number, at: number, epoch = 1): BaroReading => ({
  relativeAltitudeM,
  at,
  epoch,
});

describe('pressureToRelativeAltitudeM', () => {
  it('is zero at standard sea level pressure', () => {
    expect(pressureToRelativeAltitudeM(1013.25)).toBeCloseTo(0, 3);
  });

  it('falls about 8 m per hPa near sea level', () => {
    const delta = pressureToRelativeAltitudeM(1012.25) - pressureToRelativeAltitudeM(1013.25);
    expect(delta).toBeGreaterThan(8);
    expect(delta).toBeLessThan(9);
  });

  // Only differences are used, so the absolute value being wrong by whatever
  // the weather is doing costs nothing. This is what makes the standard
  // atmosphere good enough for Android, which reports no relative altitude.
  it('preserves height differences regardless of the day’s sea level pressure', () => {
    const fair = pressureToRelativeAltitudeM(1000) - pressureToRelativeAltitudeM(1012);
    const storm = pressureToRelativeAltitudeM(975) - pressureToRelativeAltitudeM(987);
    expect(Math.abs(fair - storm)).toBeLessThan(3);
  });
});

describe('AltitudeFuser', () => {
  it('falls back to GPS, with the wide band, when there is no barometer', () => {
    const fuser = new AltitudeFuser();
    const result = fuser.push(100, 5, 1000, null);
    expect(result).toEqual({ value: 100, hysteresisM: GPS_HYSTERESIS_M, source: 'gps' });
  });

  it('returns null when neither sensor has anything usable', () => {
    const fuser = new AltitudeFuser();
    expect(fuser.push(null, null, 1000, null)).toBeNull();
  });

  it('ignores a fix whose vertical accuracy is too poor to trust', () => {
    const fuser = new AltitudeFuser();
    expect(fuser.push(100, MAX_ALTITUDE_ACCURACY_M + 1, 1000, null)).toBeNull();
  });

  it('trusts a fix whose vertical accuracy is simply unreported', () => {
    const fuser = new AltitudeFuser();
    expect(fuser.push(100, null, 1000, null)?.source).toBe('gps');
  });

  it('references the barometer’s arbitrary datum against GPS', () => {
    const fuser = new AltitudeFuser();
    // CMAltimeter starts from zero wherever the rider happened to be.
    const result = fuser.push(840, 5, 1000, baro(0, 1000));
    expect(result?.source).toBe('baro');
    expect(result?.hysteresisM).toBe(BARO_HYSTERESIS_M);
    expect(result?.value).toBeCloseTo(840, 6);
  });

  it('follows the barometer, not the GPS noise, once referenced', () => {
    const fuser = new AltitudeFuser();
    fuser.push(840, 5, 1000, baro(0, 1000));
    // GPS jumps 20 m; the barometer says the rider climbed 3. The slow offset
    // is the whole point: one noisy fix must not move the output 20 m.
    const result = fuser.push(860, 5, 2000, baro(3, 2000));
    expect(result?.value).toBeGreaterThan(842.9);
    expect(result?.value).toBeLessThan(843.3);
  });

  it('hands back to GPS, and the wide band, when the barometer goes stale', () => {
    const fuser = new AltitudeFuser();
    fuser.push(840, 5, 1000, baro(0, 1000));
    const stale = baro(0, 1000);
    const result = fuser.push(841, 5, 1000 + BARO_STALE_MS + 1, stale);
    expect(result?.source).toBe('gps');
    expect(result?.hysteresisM).toBe(GPS_HYSTERESIS_M);
  });

  // iOS re-zeroes relative altitude every time updates restart. Without the
  // epoch check the series would step by the whole previous datum, which the
  // deadband would happily book as a climb.
  it('re-anchors on a datum change instead of stepping', () => {
    const fuser = new AltitudeFuser();
    fuser.push(840, 5, 1000, baro(0, 1000, 1));
    const before = fuser.push(840, 5, 2000, baro(2, 2000, 1))?.value as number;
    // Sensor restarts: same real altitude, relative altitude back to zero.
    const after = fuser.push(840, 5, 3000, baro(0, 3000, 2))?.value as number;
    expect(Math.abs(after - before)).toBeLessThan(0.5);
  });

  it('continues from a seeded altitude after a restore', () => {
    const fuser = new AltitudeFuser();
    fuser.seed(1200);
    const result = fuser.push(null, null, 1000, baro(0, 1000));
    // No GPS at all, but the seed gives the datum an absolute reference.
    expect(result?.value).toBeCloseTo(1200, 6);
  });
});

// The end-to-end claim: a ride whose true gain is known, run through the real
// fusion and the real deadband, lands near the truth on every sensor path.
// The shipped code before this change reported 2.6x on the GPS-only path.
describe('fusion end to end', () => {
  const TRUE_GAIN_M = 467;
  const SAMPLES = 3000;

  /** Deterministic gaussian: tests must not be allowed to flake. */
  function makeNoise(seed: number) {
    let state = seed;
    const uniform = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    return () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = uniform();
      while (v === 0) v = uniform();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
  }

  /** Four laps of climb-then-descend summing to TRUE_GAIN_M. */
  function truthSeries(): number[] {
    const laps = 4;
    const perLap = SAMPLES / laps;
    return Array.from({ length: SAMPLES }, (_, i) => {
      const p = (i % perLap) / perLap;
      const lapGain = TRUE_GAIN_M / laps;
      return p < 0.6 ? lapGain * (p / 0.6) : lapGain * (1 - (p - 0.6) / 0.4);
    });
  }

  function gainOver(
    truth: number[],
    build: (index: number, trueAltitude: number) => {
      gps: number | null;
      baro: BaroReading | null;
    },
  ): number {
    const fuser = new AltitudeFuser();
    let acc = emptyAccumulator();
    truth.forEach((trueAltitude, i) => {
      const { gps, baro: reading } = build(i, trueAltitude);
      const at = i * 1000;
      const fused = fuser.push(gps, 5, at, reading);
      acc = accumulate(
        acc,
        {
          latitude: 47.6 + i * 1e-5,
          longitude: -122.3,
          altitude: gps,
          altitudeAccuracy: 5,
          accuracy: 5,
          t: i,
        },
        fused,
      );
    });
    return acc.elevationGainM;
  }

  it('stays within 10% of truth on GPS alone, with realistic correlated noise', () => {
    const truth = truthSeries();
    const gauss = makeNoise(4242);
    // AR(1) with rho 0.97 and a 1 m innovation: ~4 m standard deviation and a
    // ~30 s correlation time, which is what a phone actually does under trees.
    let error = 0;
    const gain = gainOver(truth, (_i, trueAltitude) => {
      error = 0.97 * error + 1.0 * gauss();
      return { gps: trueAltitude + error, baro: null };
    });
    expect(gain).toBeGreaterThan(TRUE_GAIN_M * 0.9);
    expect(gain).toBeLessThan(TRUE_GAIN_M * 1.1);
  });

  it('stays within 5% of truth on the barometer, through a weather front', () => {
    const truth = truthSeries();
    const gauss = makeNoise(99);
    let error = 0;
    const gain = gainOver(truth, (i, trueAltitude) => {
      error = 0.97 * error + 1.0 * gauss();
      return {
        gps: trueAltitude + error,
        // Arbitrary datum, sensor noise, and 8 m of pressure drift over the
        // ride: the offset absorbs all three.
        baro: baro(trueAltitude - 1200 + gauss() * 0.15 + (8 * i) / SAMPLES, i * 1000),
      };
    });
    expect(gain).toBeGreaterThan(TRUE_GAIN_M * 0.95);
    expect(gain).toBeLessThan(TRUE_GAIN_M * 1.05);
  });

  it('survives a barometer dropout mid-ride', () => {
    const truth = truthSeries();
    const gauss = makeNoise(7);
    let error = 0;
    const gain = gainOver(truth, (i, trueAltitude) => {
      error = 0.97 * error + 1.0 * gauss();
      const dead = i >= SAMPLES / 3 && i < (2 * SAMPLES) / 3;
      return {
        gps: trueAltitude + error,
        baro: dead ? null : baro(trueAltitude - 1200 + gauss() * 0.15, i * 1000),
      };
    });
    expect(gain).toBeGreaterThan(TRUE_GAIN_M * 0.9);
    expect(gain).toBeLessThan(TRUE_GAIN_M * 1.1);
  });
});
