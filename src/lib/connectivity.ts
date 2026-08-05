import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Thin wrapper over NetInfo so the rest of the app has one notion of
// "online". NetInfo's isInternetReachable starts as null (unknown); we treat
// unknown as online so a cold start in airplane-mode-off conditions does not
// flash offline UI, and so the outbox still attempts a send (a failed attempt
// is handled anyway; a wrongly skipped one just waits).

type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();
let started = false;

function evaluate(isConnected: boolean | null, isInternetReachable: boolean | null): boolean {
  if (isConnected === false) return false;
  if (isInternetReachable === false) return false;
  return true;
}

export function startConnectivityMonitoring(): void {
  if (started) return;
  started = true;
  NetInfo.addEventListener((state) => {
    const next = evaluate(state.isConnected, state.isInternetReachable);
    if (next === online) return;
    online = next;
    listeners.forEach((l) => l(online));
  });
}

export function isOnline(): boolean {
  return online;
}

/** Fires on every online/offline transition. Returns an unsubscribe. */
export function onConnectivityChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const subscribe = (onStoreChange: () => void) => onConnectivityChange(() => onStoreChange());

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
