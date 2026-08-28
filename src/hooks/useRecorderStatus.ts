import { useSyncExternalStore } from 'react';
import { rideRecorder, type RecorderStatus } from '../lib/recording/recorder';

/**
 * The recorder's status, and nothing else.
 *
 * `useRideRecorder` returns the whole snapshot, which the recorder republishes
 * on every GPS point: once a second for the length of a ride. That is correct
 * for the record screen, which is drawing those points, and wrong for anything
 * else, because it re-renders the subscriber for the entire ride.
 *
 * `useSyncExternalStore` compares the value it is handed, so returning the
 * status string alone re-renders only on a real transition. Reach for this
 * whenever a screen needs to know THAT a ride is being recorded rather than
 * what the ride looks like.
 */
export function useRecorderStatus(): RecorderStatus {
  return useSyncExternalStore(
    rideRecorder.subscribe,
    () => rideRecorder.getSnapshot().status,
    () => rideRecorder.getSnapshot().status,
  );
}

/** A session the rider can return to: started and not yet finished. */
export function isRecorderLive(status: RecorderStatus): boolean {
  return status === 'recording' || status === 'paused';
}
