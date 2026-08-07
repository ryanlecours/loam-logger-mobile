import { buildChunks, type LatLngPoint } from './liveTrackChunks';

// Distinct, recognizable coordinates: point i is (i, -i).
const point = (i: number): [number, number] => [i, -i];

/**
 * Every consecutive pair of track points must be drawn by SOME polyline
 * (a frozen chunk or the live tail) as adjacent entries. A pair no polyline
 * covers is a visible break in the route line.
 */
function assertNoGaps(
  track: [number, number][],
  trackLength: number,
  polylines: LatLngPoint[][],
): void {
  for (let i = 0; i < trackLength - 1; i++) {
    const covered = polylines.some((line) =>
      line.some(
        (p, j) =>
          j < line.length - 1 &&
          p.latitude === track[i][0] &&
          p.longitude === track[i][1] &&
          line[j + 1].latitude === track[i + 1][0] &&
          line[j + 1].longitude === track[i + 1][1],
      ),
    );
    if (!covered) {
      throw new Error(`segment ${i} -> ${i + 1} is not drawn by any polyline`);
    }
  }
}

describe('buildChunks', () => {
  it('never leaves a gap at a chunk boundary as the track grows point by point', () => {
    // The regression: chunks freeze into the cache DURING growth, so the
    // boundary behavior only shows when the calls happen incrementally, one
    // render per new fix, exactly as the component calls it. With the old
    // floor(trackLength / size) threshold, chunk 0 froze at trackLength 4
    // missing its overlap point, and the segment 3 -> 4 was never drawn.
    const chunkSize = 4;
    const track: [number, number][] = [];
    const cache: LatLngPoint[][] = [];

    for (let n = 0; n < 30; n++) {
      track.push(point(n));
      const { completedChunks, tail } = buildChunks(track, track.length, cache, chunkSize);
      assertNoGaps(track, track.length, [...completedChunks, tail]);
    }
  });

  it('freezes completed chunks: same array identity on later calls', () => {
    const chunkSize = 4;
    const track: [number, number][] = [];
    const cache: LatLngPoint[][] = [];

    for (let n = 0; n < 10; n++) track.push(point(n));
    const first = buildChunks(track, track.length, cache, chunkSize);
    expect(first.completedChunks).toHaveLength(2);

    for (let n = 10; n < 20; n++) track.push(point(n));
    const second = buildChunks(track, track.length, cache, chunkSize);

    expect(second.completedChunks[0]).toBe(first.completedChunks[0]);
    expect(second.completedChunks[1]).toBe(first.completedChunks[1]);
  });

  it('includes the overlap point in each frozen chunk', () => {
    const chunkSize = 4;
    const track: [number, number][] = [];
    const cache: LatLngPoint[][] = [];
    for (let n = 0; n < 9; n++) track.push(point(n)); // one past chunk 0's boundary... and chunk 1's start

    const { completedChunks, tail } = buildChunks(track, track.length, cache, chunkSize);

    // Chunk 0 spans indices 0..4: its last entry IS index 4, the overlap.
    expect(completedChunks[0]).toHaveLength(chunkSize + 1);
    expect(completedChunks[0][chunkSize]).toEqual({ latitude: 4, longitude: -4 });
    // Chunk 1 froze at trackLength 9 (one past index 8) with its overlap.
    expect(completedChunks[1][chunkSize]).toEqual({ latitude: 8, longitude: -8 });
    // The tail picks up at the last frozen boundary.
    expect(tail[0]).toEqual({ latitude: 8, longitude: -8 });
  });

  it('resets the cache when the track restarts shorter', () => {
    const chunkSize = 4;
    const longTrack: [number, number][] = [];
    const cache: LatLngPoint[][] = [];
    for (let n = 0; n < 12; n++) longTrack.push(point(n));
    buildChunks(longTrack, longTrack.length, cache, chunkSize);
    expect(cache.length).toBeGreaterThan(0);

    // New recording: shorter track, stale chunks must not survive.
    const freshTrack: [number, number][] = [point(100), point(101)];
    const { completedChunks, tail } = buildChunks(freshTrack, freshTrack.length, cache, chunkSize);

    expect(completedChunks).toHaveLength(0);
    expect(tail).toEqual([
      { latitude: 100, longitude: -100 },
      { latitude: 101, longitude: -101 },
    ]);
  });

  it('handles the empty and single-point track', () => {
    const cache: LatLngPoint[][] = [];
    expect(buildChunks([], 0, cache)).toEqual({ completedChunks: [], tail: [] });
    expect(buildChunks([point(0)], 1, cache).tail).toHaveLength(1);
  });
});
