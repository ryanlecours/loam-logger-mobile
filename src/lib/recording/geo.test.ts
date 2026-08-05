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

  it('counts climbs only past the hysteresis threshold', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ altitude: 100, t: 0 }));
    acc = accumulate(acc, sample({ altitude: 101.5, t: 1 }));
    expect(acc.elevationGainM).toBe(0); // 1.5 m of wobble is not a climb
    acc = accumulate(acc, sample({ altitude: 103.5, t: 2 }));
    expect(acc.elevationGainM).toBe(3.5); // cleared the 3 m threshold, pays in full
  });

  it('descending lowers the anchor so real climbing after a descent counts', () => {
    let acc = emptyAccumulator();
    acc = accumulate(acc, sample({ altitude: 100, t: 0 }));
    acc = accumulate(acc, sample({ altitude: 90, t: 1 })); // descend: anchor follows
    acc = accumulate(acc, sample({ altitude: 94, t: 2 })); // climb 4 m from the trough
    expect(acc.elevationGainM).toBe(4);
  });

  it('approximates true gain on a long gradual climb', () => {
    let acc = emptyAccumulator();
    for (let i = 0; i <= 100; i++) {
      acc = accumulate(acc, sample({ altitude: 100 + i, t: i }));
    }
    // 100 m real climb in 1 m steps: the threshold accumulator pays 99 of it.
    expect(acc.elevationGainM).toBeGreaterThanOrEqual(96);
    expect(acc.elevationGainM).toBeLessThanOrEqual(100);
  });
});
