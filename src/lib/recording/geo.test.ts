import {
  accumulate,
  emptyAccumulator,
  haversineMeters,
  type GeoSample,
} from './geo';

const sample = (overrides: Partial<GeoSample>): GeoSample => ({
  latitude: 47.6062,
  longitude: -122.3321,
  altitude: null,
  altitudeAccuracy: null,
  accuracy: 5,
  t: 0,
  ...overrides,
});

describe('haversineMeters', () => {
  it('measures a known east-west distance at mid latitude', () => {
    // 0.01 degrees of longitude at 47.6 N is ~750 m.
    const d = haversineMeters(47.6062, -122.3321, 47.6062, -122.3221);
    expect(d).toBeGreaterThan(740);
    expect(d).toBeLessThan(760);
  });

  it('returns zero for identical points', () => {
    expect(haversineMeters(47.6, -122.3, 47.6, -122.3)).toBe(0);
  });
});

describe('accumulate', () => {
  it('adds distance between accurate fixes', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ t: 0 }));
    acc = accumulate(acc, sample({ longitude: -122.3221, t: 10 }));
    expect(acc.distanceM).toBeGreaterThan(740);
  });

  it('ignores fixes with worse than 25 m accuracy entirely', () => {
    let acc = accumulate(emptyAccumulator(), sample({ t: 0 }));
    // A wild fix mid-ride must not teleport the rider: no distance, and it
    // must not become the anchor for the next segment either.
    acc = accumulate(acc, sample({ longitude: -122.4, accuracy: 80, t: 1 }));
    expect(acc.distanceM).toBe(0);
    expect(acc.lastFix?.longitude).toBe(-122.3321);
  });

  it('drops sub-jitter segments while standing still', () => {
    let acc = accumulate(emptyAccumulator(), sample({ t: 0 }));
    // ~1 m wiggle: below MIN_SEGMENT_M.
    acc = accumulate(acc, sample({ latitude: 47.60621, t: 1 }));
    expect(acc.distanceM).toBe(0);
  });

  // Elevation now arrives pre-fused (see ./altitude), so these exercise the
  // deadband alone: `at` is a level and a band, and the question is only which
  // moves book gain.
  const at = (value: number, hysteresisM = 4) => ({ value, hysteresisM });

  it('counts climbs only past the hysteresis threshold', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ t: 0 }), at(100));
    acc = accumulate(acc, sample({ t: 1 }), at(102));
    expect(acc.elevationGainM).toBe(0); // 2 m of wobble is not a climb
    acc = accumulate(acc, sample({ t: 2 }), at(104.5));
    expect(acc.elevationGainM).toBe(4.5); // cleared the band, pays in full
  });

  it('a real descent moves the anchor, so climbing out of it counts', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ t: 0 }), at(100));
    acc = accumulate(acc, sample({ t: 1 }), at(90)); // 10 m down: clears the band
    acc = accumulate(acc, sample({ t: 2 }), at(95)); // 5 m climb from the trough
    expect(acc.elevationGainM).toBe(5);
  });

  // The regression that mattered. The anchor used to follow every downward
  // sample with no threshold at all, so each noise trough became a lower
  // launchpad and every wobble cycle booked its full amplitude as climb. On a
  // real 8.4 mi ride that turned 1,532 ft into 4,002 ft. The fix is that the
  // band is symmetric: a descent has to earn the anchor the same way a climb
  // has to earn the gain.
  it('does not lower the anchor on a descent inside the band', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ t: 0 }), at(100));
    acc = accumulate(acc, sample({ t: 1 }), at(97)); // 3 m down, inside a 4 m band
    expect(acc.altitudeAnchor).toBe(100); // the old rule moved it to 97 here
    acc = accumulate(acc, sample({ t: 2 }), at(100)); // back where it started
    expect(acc.elevationGainM).toBe(0); // and the old rule booked 3 m
  });

  it('books nothing for sub-band wobble, however long it goes on', () => {
    let acc = emptyAccumulator();
    let t = 0;
    for (let i = 0; i < 500; i++) {
      acc = accumulate(acc, sample({ t: t++ }), at(98.5));
      acc = accumulate(acc, sample({ t: t++ }), at(101.5));
    }
    expect(acc.elevationGainM).toBe(0);
  });

  it('ignores altitude entirely when the caller has no fused reading', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ t: 0 }), null);
    acc = accumulate(acc, sample({ t: 1 }), null);
    expect(acc.elevationGainM).toBe(0);
    expect(acc.altitudeAnchor).toBeNull();
  });

  it('tracks a tight barometric band closely on a real climb', () => {
    let acc = emptyAccumulator();
    for (let i = 0; i <= 100; i++) {
      acc = accumulate(acc, sample({ t: i }), at(100 + i, 1));
    }
    // 100 m of real climb in 1 m steps. The band costs at most one step.
    expect(acc.elevationGainM).toBeGreaterThanOrEqual(99);
    expect(acc.elevationGainM).toBeLessThanOrEqual(100);
  });
});
