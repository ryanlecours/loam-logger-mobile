// Pure chunking logic for the live recording polyline, kept free of native
// imports so the boundary behavior is unit-testable (LiveTrackMap.native.tsx
// itself needs a device to exercise).
//
// The polyline re-renders every second for hours, so it is drawn as fixed
// chunks: completed chunks keep their identity forever and never re-cross
// the bridge; only the in-progress tail changes per fix. Consecutive chunks
// share one point so the joined line has no gap.

export const CHUNK_SIZE = 200;

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

/**
 * Split `track` (first `trackLength` entries) into frozen chunks plus a live
 * tail. `cache` is owned by the caller and mutated in place: completed chunks
 * are built exactly once and keep their identity; the cache is emptied when
 * the track restarts shorter (a new recording).
 *
 * A chunk is only finalized once trackLength has advanced ONE PAST its end
 * boundary: the chunk's last entry is the first point of the next segment
 * (the overlap that makes the join gapless), and that point does not exist
 * yet at the exact render where the boundary is reached. Freezing on
 * `floor(trackLength / size)` cached the chunk one point short, leaving a
 * permanent break in the line at every boundary.
 */
export function buildChunks(
  track: readonly [number, number][],
  trackLength: number,
  cache: LatLngPoint[][],
  chunkSize: number = CHUNK_SIZE,
): { completedChunks: LatLngPoint[][]; tail: LatLngPoint[] } {
  const completeCount = Math.floor(Math.max(0, trackLength - 1) / chunkSize);

  if (cache.length > completeCount) {
    cache.length = 0;
  }
  for (let i = cache.length; i < completeCount; i++) {
    cache[i] = track
      .slice(i * chunkSize, (i + 1) * chunkSize + 1)
      .map(([latitude, longitude]) => ({ latitude, longitude }));
  }

  return {
    completedChunks: cache.slice(0, completeCount),
    tail: track
      .slice(completeCount * chunkSize, trackLength)
      .map(([latitude, longitude]) => ({ latitude, longitude })),
  };
}
