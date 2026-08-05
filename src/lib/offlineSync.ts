import { AppState } from 'react-native';
import { client } from './apolloClient';
import { AddRideDocument } from '../graphql/generated';
import {
  registerOutboxExecutor,
  setOnDrainSuccess,
  drainOutbox,
} from './outbox';
import { startConnectivityMonitoring, onConnectivityChange } from './connectivity';

// Wires the durable outbox into the running app: which mutations it knows how
// to send, and when to attempt a drain. Kept separate from outbox.ts so the
// queue itself never imports Apollo (testable without native modules) and
// apolloClient.ts never imports the queue (no cycle).

let initialized = false;

export function initOfflineSync(): void {
  if (initialized) return;
  initialized = true;

  startConnectivityMonitoring();

  registerOutboxExecutor('AddRide', async (variables) => {
    // No refetchQueries here: mid-drain the lists would refetch once per
    // queued ride. One refetch fires after the whole pass, below.
    await client.mutate({ mutation: AddRideDocument, variables });
  });

  setOnDrainSuccess(() => {
    void client.refetchQueries({
      include: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
    });
  });

  // Drain whenever a send might newly succeed: connectivity comes back, the
  // app returns to foreground, or the app just launched with rows on disk.
  onConnectivityChange((online) => {
    if (online) void drainOutbox();
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void drainOutbox();
  });

  void drainOutbox();
}
