import { useCallback, useEffect, useState } from 'react';
import { listOutbox, onOutboxChange } from '../lib/outbox';
import type { AddRideInput } from '../graphql/generated';

// Rides logged without connectivity, waiting in the on-device outbox. They
// are not in the Apollo cache (the server has never seen them), so list
// screens render them from here, badged as pending, above the synced rides.

export interface PendingRide {
  /** Outbox row id; doubles as the ride's clientMutationId. */
  id: string;
  input: AddRideInput;
  status: 'pending' | 'failed';
  lastError: string | null;
  createdAt: number;
}

export function usePendingRides(): { pendingRides: PendingRide[]; reload: () => void } {
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);

  const reload = useCallback(() => {
    void listOutbox('AddRide').then((rows) => {
      setPendingRides(
        rows.map((row) => ({
          id: row.id,
          input: (row.variables as { input: AddRideInput }).input,
          status: row.status,
          lastError: row.lastError,
          createdAt: row.createdAt,
        })),
      );
    });
  }, []);

  useEffect(() => {
    reload();
    return onOutboxChange(reload);
  }, [reload]);

  return { pendingRides, reload };
}
