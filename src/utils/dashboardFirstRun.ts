export interface FirstRunInputs {
  /** Predictions have landed. Until then the screen has no answer to show. */
  predictionsReady: boolean;
  /** Newest rides from the unwindowed preview query, not the timeframe one. */
  recentRideCount: number;
  recentRidesLoading: boolean;
  recentRidesFailed: boolean;
  /** Rides logged offline and still sitting in the outbox. */
  pendingRideCount: number;
}

/**
 * Is this an account with gear set up and nothing ridden yet?
 *
 * Two traps this exists to avoid, both of which turn a working account into a
 * "you have nothing" screen:
 *
 * **Timeframe scoping.** `rideStats` is scoped to the selected window, which
 * defaults to YTD. A rider whose last ride was two seasons ago has
 * `totalRides === 0` there while owning hundreds of rides, so the window is the
 * wrong signal. The recent-rides query takes the newest three with no window,
 * so an empty result from it is the real thing.
 *
 * **In-flight and failed reads.** An empty array during the first fetch, or
 * after the read failed, is not evidence of an empty account. Both must resolve
 * before this can claim anything.
 *
 * Rides queued offline count as ridden: the rider logged them at the trailhead,
 * they simply have not uploaded, and telling them to go get started would be
 * wrong.
 */
export function isFirstRun({
  predictionsReady,
  recentRideCount,
  recentRidesLoading,
  recentRidesFailed,
  pendingRideCount,
}: FirstRunInputs): boolean {
  if (!predictionsReady || recentRidesLoading || recentRidesFailed) return false;
  return recentRideCount === 0 && pendingRideCount === 0;
}

export interface StatsBlockInputs {
  statsLoading: boolean;
  statsFailed: boolean;
  /** Rides inside the selected timeframe. */
  totalRides: number;
}

/**
 * Should the timeframe tabs and the totals card render at all?
 *
 * They are one unit. RideStatsCard returns null at zero rides on purpose, since
 * the ride block above already owns the "connect a data source" story, but the
 * tabs above it rendered unconditionally, so a rider who had never ridden got
 * four filters sitting over empty space. This mirrors the card's own branches:
 * it draws a skeleton while loading and an error state on failure, so the tabs
 * belong on screen in both of those cases too.
 */
export function showStatsBlock({
  statsLoading,
  statsFailed,
  totalRides,
}: StatsBlockInputs): boolean {
  return statsLoading || statsFailed || totalRides > 0;
}
