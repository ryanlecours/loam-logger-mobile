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
    expect(result).toEqual({
      value: 100,
      hysteresisM: GPS_HYSTERESIS_M,
      source: 'gps',
      series: 'gps',
    });
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
    // One GPS fix jumps 20 m; the barometer says the rider climbed 3 and
    // stopped. The slow offset is the whole point: that fix must not move the
    // output 20 m, then or ever. Run it out past the smoother's time constant
    // so the answer is where the series settles, not where it is one sample
    // after a step.
    fuser.push(860, 5, 2000, baro(3, 2000));
    let result;
    for (let i = 3; i <= 60; i++) result = fuser.push(843, 5, i * 1000, baro(3, i * 1000));
    expect(result?.value).toBeGreaterThan(842.9);
    expect(result?.value).toBeLessThan(843.3);
  });

  // The smoother is the actual defence against a ratcheting deadband, so it
  // has to be real filtering and not a token alpha: a one-sample spike must
  // arrive at the output as a small fraction of itself.
  it('rejects a single-sample barometric spike', () => {
    const fuser = new AltitudeFuser();
    fuser.push(840, 5, 1000, baro(0, 1000));
    const level = fuser.push(840, 5, 2000, baro(0, 2000))?.value as number;
    const spiked = fuser.push(840, 5, 3000, baro(6, 3000))?.value as number;
    expect(spiked - level).toBeLessThan(1);
  });

  // A backgrounded app gets its location stream throttled, and a fixed alpha
  // would silently turn into a minute-long time constant and flatten real
  // climbs. The gap has to drive the weight.
  it('holds the same time constant when fixes arrive slowly', () => {
    const fast = new AltitudeFuser();
    const slow = new AltitudeFuser();
    fast.push(840, 5, 0, baro(0, 0));
    slow.push(840, 5, 0, baro(0, 0));
    // 30 s of a steady 10 m step, sampled at 1 Hz and at 0.2 Hz. GPS agrees
    // with the step (850 = 10 m of relative altitude on an 840 m datum) so
    // the offset stays put and the smoother is the only thing being measured.
    let fastValue = 0;
    let slowValue = 0;
    for (let t = 1000; t <= 30000; t += 1000) {
      fastValue = fast.push(850, 5, t, baro(10, t))?.value as number;
    }
    for (let t = 5000; t <= 30000; t += 5000) {
      slowValue = slow.push(850, 5, t, baro(10, t))?.value as number;
    }
    expect(Math.abs(fastValue - slowValue)).toBeLessThan(0.1);
    // And both are most of the way there, rather than both being stuck.
    expect(fastValue).toBeGreaterThan(848);
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
    // Slightly wider on the low side than the deadband alone would need: the
    // smoother lags ~10 s at each of the eight turning points here, which is
    // a metre or two of real gain per lap. That is the price of the descent
    // cases below, and it is one-sided in the safe direction.
    expect(gain).toBeGreaterThan(TRUE_GAIN_M * 0.93);
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

  // Every case above is a lap that climbs as much as it descends, so a
  // phantom booked on the way down hides inside a tolerance sized for a
  // total that is mostly real climb. A ride reported 2,555 ft against a
  // Garmin's 1,736 ft with all of these passing, and the entire 819 ft
  // difference was on the descent. A descent is its own test because it is
  // the only shape where the correct answer is zero and nothing can mask it.
  describe('a descent books no climb', () => {
    const DESCENT_SAMPLES = 1200; // 20 minutes at 1 Hz
    const DROP_M = 530;

    /**
     * Apparent altitude from airflow over the phone, which is what a
     * barometer on a descending rider actually reports on top of the terrain.
     * Dynamic head is v^2/2g metres, and v is gusty, so this is metres of
     * swing at the seconds timescale: a real signal, not sensor error, and
     * nothing in an accuracy spec bounds it.
     */
    function aeroSeries(seed: number, count: number): number[] {
      const gauss = makeNoise(seed);
      let speed = 8;
      return Array.from({ length: count }, () => {
        speed = Math.max(1, 0.9 * speed + 0.1 * 8 + gauss() * 1.5);
        return (speed * speed) / (2 * 9.81);
      });
    }

    it('books nothing on a straight descent through airflow noise', () => {
      const aero = aeroSeries(11, DESCENT_SAMPLES);
      const truth = Array.from(
        { length: DESCENT_SAMPLES },
        (_, i) => DROP_M * (1 - i / DESCENT_SAMPLES),
      );
      const gauss = makeNoise(4242);
      let error = 0;
      const gain = gainOver(truth, (i, trueAltitude) => {
        error = 0.97 * error + 1.0 * gauss();
        return {
          gps: trueAltitude + error,
          baro: baro(trueAltitude - 1200 + aero[i], i * 1000),
        };
      });
      // Raw barometer into the 1 m deadband booked ~270 m (~900 ft) here.
      expect(gain).toBeLessThan(15);
    });

    it('still books the real rollers on the way home', () => {
      const NET_M = 200;
      const ROLLERS = 10;
      const AMP_M = 15;
      const truth: number[] = [];
      let realGain = 0;
      for (let i = 0; i < DESCENT_SAMPLES; i++) {
        const value =
          NET_M * (1 - i / DESCENT_SAMPLES) +
          (AMP_M / 2) * (1 - Math.cos((2 * Math.PI * ROLLERS * i) / DESCENT_SAMPLES));
        if (i > 0 && value > truth[i - 1]) realGain += value - truth[i - 1];
        truth.push(value);
      }

      const aero = aeroSeries(11, DESCENT_SAMPLES);
      const gauss = makeNoise(4242);
      let error = 0;
      const gain = gainOver(truth, (i, trueAltitude) => {
        error = 0.97 * error + 1.0 * gauss();
        return {
          gps: trueAltitude + error,
          baro: baro(trueAltitude - 1200 + aero[i], i * 1000),
        };
      });
      // The deadband and the smoother's lag each cost a little real gain at
      // every turning point; the noise must not put any of it back.
      expect(gain).toBeGreaterThan(realGain * 0.5);
      expect(gain).toBeLessThan(realGain * 1.1);
    });

    // The offset tracks GPS on a ~200 s constant, so a GPS excursion younger
    // than that leaves the two series metres apart. Handing over at that
    // moment is a change of datum, not a climb.
    it('does not book the step when the barometer hands over to GPS', () => {
      const COUNT = 400;
      const DRIFT_STARTS = 340;
      const BARO_DIES = 360;
      const truth = Array.from({ length: COUNT }, (_, i) => 800 - i * 0.4);
      const gain = gainOver(truth, (i, trueAltitude) => {
        // GPS walks 15 m high over 20 s and stays there; the slow offset has
        // no chance to absorb it before the barometer drops out, so the two
        // series are ~11 m apart at the moment of handover.
        const drift = i < DRIFT_STARTS ? 0 : Math.min(1, (i - DRIFT_STARTS) / 20) * 15;
        return {
          gps: trueAltitude + drift,
          baro: i >= BARO_DIES ? null : baro(trueAltitude - 1200, i * 1000),
        };
      });
      expect(gain).toBeLessThan(2);
    });
  });
});
