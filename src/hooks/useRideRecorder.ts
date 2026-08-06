import { useEffect, useState, useSyncExternalStore } from 'react';
import { rideRecorder, type RecorderSnapshot } from '../lib/recording/recorder';

// React binding for the recorder singleton. The snapshot changes on state
// transitions and GPS points; the clock ticks on its own 1 s interval so the
// elapsed display advances even when the rider is standing still and no
// points arrive.
export function useRideRecorder(): {
  snapshot: RecorderSnapshot;
  elapsedMs: number;
} {
  const snapshot = useSyncExternalStore(
    rideRecorder.subscribe,
    rideRecorder.getSnapshot,
    rideRecorder.getSnapshot,
  );

  const [elapsedMs, setElapsedMs] = useState(() => rideRecorder.getElapsedMs());
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(rideRecorder.getElapsedMs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { snapshot, elapsedMs };
}
