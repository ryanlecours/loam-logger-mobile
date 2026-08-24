import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  useAssignBikeToRidesMutation,
  useUnassignedRideIdsLazyQuery,
  useUnassignedRideSummaryLazyQuery,
  type RideProvider,
} from '../graphql/generated';

/**
 * Rides per mutation call. The server caps a single assignBikeToRides at 2000;
 * staying well under it keeps each transaction bounded and gives the rider
 * moving progress instead of one long silence.
 */
export const ASSIGN_CHUNK_SIZE = 500;

/** Never ask for more ids than one pass of the mutation can accept. */
export const MAX_RIDES_PER_PASS = 2000;

/**
 * Queries whose answers change the moment rides gain a bike.
 *
 * UnassignedRideSummary is absent on purpose: the run refetches it directly
 * because it needs the new total as a value, not just a fresh screen, and that
 * fetch writes the same cache entry this list would have refreshed.
 */
const AFFECTED_QUERIES = ['RidesPage', 'UnassignedRideCount', 'Gear', 'GearLight'];

export function chunkRideIds(rideIds: string[], size = ASSIGN_CHUNK_SIZE): string[][] {
  const chunks: string[][] = [];
  for (let offset = 0; offset < rideIds.length; offset += size) {
    chunks.push(rideIds.slice(offset, offset + size));
  }
  return chunks;
}

/**
 * The server rejects a whole batch if any ride in it gained a bike since the
 * ids were read. That is a race with a sync webhook, not a rider mistake, so
 * it is worth one silent retry against a fresh id list.
 */
export function isAssignmentRaceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('already have a bike');
}

export type AssignmentFilter = {
  startDate?: string | null;
  endDate?: string | null;
  provider?: RideProvider | null;
};

export type AssignmentOutcome =
  /** Every ride this pass covered landed. `remaining` is what a second pass would take. */
  | { kind: 'assigned'; assigned: number; remaining: number }
  /** The selection emptied out before submit. Nothing to do, and not an error. */
  | { kind: 'nothing' }
  /** Some chunks committed, then one failed. The assigned rides really are assigned. */
  | { kind: 'partial'; assigned: number }
  | { kind: 'failed' };

/**
 * Assigns a bike to every unassigned ride a filter selects.
 *
 * The ids are read here, at submit time, rather than carried over from the
 * preview the rider was looking at: a Strava webhook can hand one of those
 * rides a bike in between, and the mutation refuses the entire batch when it
 * finds one.
 */
export function useBulkBikeAssignment() {
  const client = useApolloClient();
  const [fetchRideIds] = useUnassignedRideIdsLazyQuery({
    // Never the cache. A stale id list is precisely what this avoids.
    fetchPolicy: 'network-only',
  });
  const [assignBikeToRides] = useAssignBikeToRidesMutation();
  const [fetchSummary] = useUnassignedRideSummaryLazyQuery({ fetchPolicy: 'network-only' });

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // One refresh at the end of a run rather than per chunk: the rides list, the
  // unassigned count and the gear predictions all move, but only the final
  // state matters. A failed refresh is a stale screen, not a failed
  // assignment, so it never changes the reported outcome.
  const refreshAffected = useCallback(async () => {
    try {
      await client.refetchQueries({ include: AFFECTED_QUERIES });
    } catch {
      // Intentionally swallowed: the rides did get their bike.
    }
  }, [client]);

  /**
   * What still matches the filter now that the writes have landed.
   *
   * Read from the server rather than subtracted from the previewed count:
   * rides leave the unassigned set for reasons this run had nothing to do with
   * (assigned on the web, flagged "not my bike"), so arithmetic against a
   * count taken before submit would quote a stale number back to the rider.
   */
  const remainingAfterRun = useCallback(
    async (filter: AssignmentFilter, fallback: number): Promise<number> => {
      try {
        const { data } = await fetchSummary({ variables: { filter } });
        return data?.unassignedRideSummary?.totalCount ?? fallback;
      } catch {
        // A failed count is a stale number, not a failed assignment.
        return fallback;
      }
    },
    [fetchSummary]
  );

  const run = useCallback(
    async ({
      bikeId,
      filter,
      expectedCount,
    }: {
      bikeId: string;
      filter: AssignmentFilter;
      /** The previewed match count. Only a fallback if the post-run count cannot be read. */
      expectedCount: number;
    }): Promise<AssignmentOutcome> => {
      setSubmitting(true);
      setProgress(null);

      try {
        // Two attempts at most: the second exists only for the webhook race
        // below, and re-reading ids forever against a busy account would never
        // converge.
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data } = await fetchRideIds({
            variables: {
              filter: { ...filter, unassigned: true },
              take: MAX_RIDES_PER_PASS,
            },
          });
          const rideIds = (data?.rides ?? []).map((ride) => ride.id);
          if (rideIds.length === 0) return { kind: 'nothing' };

          setProgress({ done: 0, total: rideIds.length });

          let assigned = 0;
          let raced = false;

          try {
            for (const chunk of chunkRideIds(rideIds)) {
              const result = await assignBikeToRides({
                variables: { rideIds: chunk, bikeId },
              });
              assigned += result.data?.assignBikeToRides?.updatedCount ?? chunk.length;
              setProgress({ done: assigned, total: rideIds.length });
            }
          } catch (error) {
            // Only worth retrying before anything committed. Once chunks have
            // landed, re-reading the ids would double-count progress the rider
            // has already been shown.
            if (assigned === 0 && attempt === 0 && isAssignmentRaceError(error)) {
              raced = true;
            } else if (assigned > 0) {
              await refreshAffected();
              return { kind: 'partial', assigned };
            } else {
              return { kind: 'failed' };
            }
          }

          if (raced) continue;

          const remaining = await remainingAfterRun(filter, Math.max(0, expectedCount - assigned));
          await refreshAffected();
          return { kind: 'assigned', assigned, remaining };
        }

        return { kind: 'failed' };
      } finally {
        setSubmitting(false);
        setProgress(null);
      }
    },
    [assignBikeToRides, fetchRideIds, refreshAffected, remainingAfterRun]
  );

  return { run, submitting, progress };
}
