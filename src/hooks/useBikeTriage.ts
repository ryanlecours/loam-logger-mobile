import { useMemo } from 'react';
import { BikeFieldsFragment, ComponentPrediction, useRidesPageQuery } from '../graphql/generated';
import { useBikesWithPredictions } from './useBikesWithPredictions';
import { RIDES_FETCH_CAP } from './useRideStats';
import { useUserTier } from './useUserTier';

export interface TriageBike {
  bike: BikeFieldsFragment;
  /** Components needing attention on this bike, worst first. Never empty. */
  components: ComponentPrediction[];
  /** Epoch ms of the most recent ride on this bike inside the window, or null. */
  lastRiddenAt: number | null;
  /** Seconds ridden on this bike inside the window. */
  usageSeconds: number;
}

/** Worst first, within a bike. Bikes themselves are NOT ordered by this. */
const SEVERITY: Record<string, number> = { OVERDUE: 0, DUE_NOW: 1, DUE_SOON: 2 };

/**
 * A component is past its interval when the hours ridden since its last service
 * have passed the interval. This is the engine's own definition of OVERDUE
 * (`hoursRemaining <= 0`) recomputed from the two raw counters, which is what
 * makes it usable on the free tier where `status` is nulled at the serving
 * boundary.
 */
const bikeName = (b: BikeFieldsFragment) => b.nickname || `${b.manufacturer} ${b.model}`;

function isPastInterval(c: ComponentPrediction): boolean {
  return c.serviceIntervalHours > 0 && c.hoursSinceService >= c.serviceIntervalHours;
}

export interface BikeUsage {
  lastRiddenAt: number;
  usageSeconds: number;
}

/**
 * The triage itself, free of Apollo so it can be exercised directly.
 *
 * Three buckets, not two: a bike with nothing tracked is *unknown*, and folding
 * it in with the healthy ones would tell a rider their untouched frameset is
 * good to go on the strength of no evidence at all.
 */
export function triageBikes(
  bikes: BikeFieldsFragment[],
  usage: Map<string, BikeUsage>,
  isPro: boolean,
) {
  const needsAttention: TriageBike[] = [];
  const healthy: BikeFieldsFragment[] = [];
  const untracked: BikeFieldsFragment[] = [];

  for (const bike of bikes) {
    const all = bike.predictions?.components ?? [];
    if (all.length === 0) {
      untracked.push(bike);
      continue;
    }

    // Free tier has `status` nulled at the serving boundary, so the same
    // question has to be asked of the raw counters instead.
    const flagged = isPro
      ? all.filter((c) => c.status != null && c.status in SEVERITY)
      : all.filter(isPastInterval);

    if (flagged.length === 0) {
      healthy.push(bike);
      continue;
    }

    const ordered = [...flagged].sort((a, b) => {
      const sa = isPro ? (SEVERITY[a.status ?? ''] ?? 9) : 0;
      const sb = isPro ? (SEVERITY[b.status ?? ''] ?? 9) : 0;
      if (sa !== sb) return sa - sb;
      // Within a severity, the one furthest past its interval leads.
      return b.hoursSinceService - a.hoursSinceService;
    });

    const u = usage.get(bike.id);
    needsAttention.push({
      bike,
      components: ordered,
      lastRiddenAt: u?.lastRiddenAt ?? null,
      usageSeconds: u?.usageSeconds ?? 0,
    });
  }

  needsAttention.sort((a, b) => {
    // Ridden more recently wins. A bike with no ride in the window has no
    // recency signal and sorts below every bike that does.
    if (a.lastRiddenAt !== b.lastRiddenAt) {
      if (a.lastRiddenAt === null) return 1;
      if (b.lastRiddenAt === null) return -1;
      return b.lastRiddenAt - a.lastRiddenAt;
    }
    if (a.usageSeconds !== b.usageSeconds) return b.usageSeconds - a.usageSeconds;
    // Everything below here is a tie among unridden bikes. Sorting by name
    // keeps the order stable across renders and legible to the rider, which
    // an id comparison would not be.
    return bikeName(a.bike).localeCompare(bikeName(b.bike));
  });

  return { needsAttention, healthy, untracked };
}

/**
 * Splits the rider's bikes into "needs work" and "good to go", ordered the way
 * a rider thinks about their quiver rather than the way a mechanic would.
 *
 * **Ordering: most recently ridden, then most used. Never by severity.** A
 * beater that is overdue but ridden twice a year must not outrank the bike
 * reached for every weekend, and the bike ridden most recently is the one whose
 * hours just moved, so it is the one most likely to have changed. Severity
 * still orders components *within* a bike and still drives the headline count.
 * PRODUCT.md records this as an owner decision; it is not an oversight.
 *
 * Recency and usage are derived from the same newest-500 ride window
 * `useRideStats` already fetches. Requesting identical variables means Apollo
 * serves both callers from one cache entry and one network request. The window
 * is deliberately unfiltered by timeframe, so tapping the timeframe pills does
 * not reshuffle the list under the rider's thumb.
 */
export function useBikeTriage() {
  const { isPro } = useUserTier();
  const {
    bikes,
    loading,
    error,
    predictionsError,
    predictionsLoading,
    hasPredictions,
    refetch,
  } = useBikesWithPredictions();

  const { data: ridesData } = useRidesPageQuery({
    variables: { take: RIDES_FETCH_CAP },
    fetchPolicy: 'cache-and-network',
  });

  const usage = useMemo(() => {
    // Rides arrive newest-first, so the first sighting of a bike is its latest.
    const map = new Map<string, { lastRiddenAt: number; usageSeconds: number }>();
    for (const ride of ridesData?.rides ?? []) {
      if (!ride.bikeId) continue;
      const startedAt = new Date(ride.startTime).getTime();
      const entry = map.get(ride.bikeId);
      if (entry) {
        entry.usageSeconds += ride.durationSeconds;
        if (startedAt > entry.lastRiddenAt) entry.lastRiddenAt = startedAt;
      } else {
        map.set(ride.bikeId, { lastRiddenAt: startedAt, usageSeconds: ride.durationSeconds });
      }
    }
    return map;
  }, [ridesData]);

  return useMemo(() => {
    const typedBikes = (bikes ?? []) as BikeFieldsFragment[];
    const { needsAttention, healthy, untracked } = triageBikes(typedBikes, usage, isPro);

    return {
      needsAttention,
      healthy,
      untracked,
      totalBikes: typedBikes.length,
      bikes: typedBikes,
      loading,
      error,
      /**
       * The two flags that stop an unanswered query reading as a clean bill of
       * health. The light query carries no predictions at all, so an empty
       * component list before phase 2 is silence, not "all good".
       */
      predictionsReady: hasPredictions,
      predictionsLoading,
      predictionsError,
      refetch,
    };
  }, [
    bikes,
    isPro,
    usage,
    loading,
    error,
    hasPredictions,
    predictionsLoading,
    predictionsError,
    refetch,
  ]);
}
