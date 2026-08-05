import type { AddRideInput } from '../graphql/generated';
import { enqueue, classifyOutboxError } from './outbox';
import { isOnline } from './connectivity';

// Shared submit path for every screen that creates a ride (manual add,
// recording save). One rule: a ride the rider committed to is never lost.
// Offline or transiently-failing sends land in the durable outbox; only a
// deterministic rejection (validation) surfaces to the caller as a throw.

export type SubmitRideOutcome = 'sent' | 'queued';

/**
 * `input.clientMutationId` must be set; it doubles as the outbox row id and
 * the server-side idempotency key. `send` performs the actual online
 * mutation (including any refetchQueries the caller wants on the direct
 * path; queued sends refetch after the drain instead).
 */
export async function submitRideResilient(
  input: AddRideInput,
  send: () => Promise<unknown>,
): Promise<SubmitRideOutcome> {
  const clientMutationId = input.clientMutationId;
  if (!clientMutationId) {
    throw new Error('submitRideResilient requires input.clientMutationId');
  }

  const queue = async (): Promise<SubmitRideOutcome> => {
    await enqueue(clientMutationId, 'AddRide', { input });
    return 'queued';
  };

  if (!isOnline()) return queue();

  try {
    await send();
    return 'sent';
  } catch (error) {
    if (classifyOutboxError(error).kind === 'retryable') return queue();
    throw error;
  }
}
