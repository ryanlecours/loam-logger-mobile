jest.mock('../db', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'session-1') }));

import { getDb } from '../db';
import { rideRecorder, type LocationUpdate, type LocationController } from './recorder';

const mockGetDb = getDb as jest.Mock;

interface FakeSession {
  id: string;
  status: string;
  started_at: number;
  active_ms: number;
}

interface FakePoint {
  session_id: string;
  seq: number;
  t: number;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
}

/** Minimal fake over the two recording tables, including the restore reads. */
function makeFakeDb() {
  const sessions: Record<string, FakeSession> = {};
  const points: FakePoint[] = [];
  return {
    sessions,
    points,
    async runAsync(sql: string, ...params: unknown[]) {
      if (sql.includes('INSERT INTO recording_session')) {
        const [id, startedAt] = params as [string, number];
        sessions[id] = { id, status: 'recording', started_at: startedAt, active_ms: 0 };
        return;
      }
      if (sql.includes('INSERT OR IGNORE INTO recording_point')) {
        const [session_id, seq, t, lat, lng, altitude, accuracy, speed] = params as [
          string, number, number, number, number, number | null, number | null, number | null,
        ];
        points.push({ session_id, seq, t, lat, lng, altitude, accuracy, speed });
        return;
      }
      if (sql.includes("SET status = 'paused'")) {
        const [, id] = params as [number, string];
        if (sessions[id]) sessions[id].status = 'paused';
        return;
      }
      if (sql.includes('UPDATE recording_session SET status = ?')) {
        const [status, activeMs, , , , id] = params as [
          string, number, number, number, number, string,
        ];
        if (sessions[id]) {
          sessions[id].status = status;
          sessions[id].active_ms = activeMs;
        }
        return;
      }
      if (sql.includes('DELETE FROM recording_point')) {
        const [sessionId] = params as [string];
        for (let i = points.length - 1; i >= 0; i--) {
          if (points[i].session_id === sessionId) points.splice(i, 1);
        }
        return;
      }
      if (sql.includes('DELETE FROM recording_session')) {
        const [id] = params as [string];
        delete sessions[id];
        return;
      }
      throw new Error(`FakeDb: unhandled runAsync SQL: ${sql}`);
    },
    async getFirstAsync(sql: string) {
      if (sql.includes("status IN ('recording', 'paused')")) {
        const candidates = Object.values(sessions)
          .filter((s) => s.status === 'recording' || s.status === 'paused')
          .sort((a, b) => b.started_at - a.started_at);
        return candidates[0] ?? null;
      }
      throw new Error(`FakeDb: unhandled getFirstAsync SQL: ${sql}`);
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      if (sql.includes('FROM recording_point WHERE session_id = ?')) {
        const [sessionId] = params as [string];
        return points
          .filter((p) => p.session_id === sessionId)
          .sort((a, b) => a.seq - b.seq)
          .map(({ seq, t, lat, lng, altitude, accuracy, speed }) => ({
            seq, t, lat, lng, altitude, accuracy, speed,
          }));
      }
      throw new Error(`FakeDb: unhandled getAllAsync SQL: ${sql}`);
    },
  };
}

function makeController(): LocationController & { startCalls: number; stopCalls: number } {
  const controller = {
    startCalls: 0,
    stopCalls: 0,
    async start() {
      controller.startCalls++;
    },
    async stop() {
      controller.stopCalls++;
    },
  };
  return controller;
}

function emit(update: Partial<LocationUpdate>) {
  rideRecorder.ingest({
    latitude: 47.6062,
    longitude: -122.3321,
    altitude: null,
    accuracy: 5,
    speed: 3,
    timestamp: Date.now(),
    ...update,
  });
}

describe('rideRecorder', () => {
  let db: ReturnType<typeof makeFakeDb>;

  beforeEach(async () => {
    jest.useFakeTimers();
    db = makeFakeDb();
    mockGetDb.mockResolvedValue(db);
    await rideRecorder.clear();
  });

  afterEach(async () => {
    await rideRecorder.clear();
    jest.useRealTimers();
  });

  it('runs the full record-pause-resume-stop cycle with correct elapsed time', async () => {
    const controller = makeController();
    await rideRecorder.start(controller);
    expect(rideRecorder.getSnapshot().status).toBe('recording');
    expect(controller.startCalls).toBe(1);

    emit({});
    jest.advanceTimersByTime(60_000);
    emit({ longitude: -122.3221, timestamp: Date.now() });

    rideRecorder.pause();
    jest.advanceTimersByTime(300_000); // 5 min coffee stop
    await rideRecorder.resume();
    jest.advanceTimersByTime(60_000);

    const summary = await rideRecorder.stop();

    // 2 minutes riding; the paused 5 minutes do not count.
    expect(summary.durationSeconds).toBe(120);
    expect(summary.distanceMeters).toBeGreaterThan(740);
    expect(summary.startLat).toBe(47.6062);
    expect(summary.startLng).toBe(-122.3321);
    expect(controller.stopCalls).toBe(1);
  });

  it('a live resume keeps its stream: the passed controller is not started', async () => {
    const controller = makeController();
    await rideRecorder.start(controller);
    rideRecorder.pause();

    const spare = makeController();
    await rideRecorder.resume(spare);

    expect(spare.startCalls).toBe(0);
    expect(rideRecorder.getSnapshot().status).toBe('recording');
  });

  it('ignores GPS updates that arrive while paused', async () => {
    await rideRecorder.start(makeController());
    emit({});
    rideRecorder.pause();

    // A drive to the next trailhead while paused must not count as riding.
    emit({ longitude: -122.2, timestamp: Date.now() });

    expect(rideRecorder.getSnapshot().distanceM).toBe(0);
    expect(rideRecorder.getSnapshot().pointCount).toBe(1);
  });

  it('drops the (0,0) no-fix sentinel entirely', async () => {
    await rideRecorder.start(makeController());

    emit({ latitude: 0, longitude: 0 }); // pre-acquisition sentinel
    emit({});
    emit({ longitude: -122.3221, timestamp: Date.now() + 1000 });

    const summary = await rideRecorder.stop();
    expect(summary.startLat).toBe(47.6062);
    expect(rideRecorder.getSnapshot().pointCount).toBe(2);
    expect(summary.distanceMeters).toBeLessThan(1000);
    expect(summary.distanceMeters).toBeGreaterThan(740);
  });

  it('waits for an accuracy-accepted fix before setting the start coordinate', async () => {
    await rideRecorder.start(makeController());

    emit({ latitude: 47.7, longitude: -122.4, accuracy: 80 }); // cold-start junk
    emit({});

    const summary = await rideRecorder.stop();
    expect(summary.startLat).toBe(47.6062);
    expect(summary.startLng).toBe(-122.3321);
    // The junk fix is still stored raw for future server-side reprocessing.
    expect(rideRecorder.getSnapshot().pointCount).toBe(2);
  });

  it('exposes the live track and last fix from accepted fixes only', async () => {
    await rideRecorder.start(makeController());

    emit({});
    emit({ latitude: 47.7, longitude: -122.4, accuracy: 80 }); // rejected: bad accuracy
    emit({ longitude: -122.3221, timestamp: Date.now() + 1000 });

    const snapshot = rideRecorder.getSnapshot();
    expect(snapshot.pointCount).toBe(3);
    expect(snapshot.trackLength).toBe(2);
    expect(rideRecorder.getTrack()).toEqual([
      [47.6062, -122.3321],
      [47.6062, -122.3221],
    ]);
    expect(snapshot.lastFix).toEqual({ latitude: 47.6062, longitude: -122.3221 });
  });

  it('flushes points to SQLite in batches during the ride', async () => {
    await rideRecorder.start(makeController());
    for (let i = 0; i < 5; i++) {
      emit({ timestamp: Date.now() + i * 1000 });
    }
    await jest.advanceTimersByTimeAsync(0);
    expect(db.points.length).toBe(5);
  });

  it('stop flushes the unflushed tail', async () => {
    await rideRecorder.start(makeController());
    emit({});
    emit({ timestamp: Date.now() + 1000 });

    await rideRecorder.stop();
    expect(db.points.length).toBe(2);
  });

  it('clear deletes the session, stops the stream, and returns to idle', async () => {
    const controller = makeController();
    await rideRecorder.start(controller);
    emit({});
    await rideRecorder.clear();

    expect(rideRecorder.getSnapshot().status).toBe('idle');
    expect(rideRecorder.getSnapshot().trackLength).toBe(0);
    expect(rideRecorder.getSnapshot().lastFix).toBeNull();
    expect(Object.keys(db.sessions)).toHaveLength(0);
    expect(db.points.length).toBe(0);
    expect(controller.stopCalls).toBe(1);
  });

  describe('restoreIfNeeded', () => {
    // A previous process recorded and died: only its SQLite rows remain.
    function seedInterruptedSession() {
      db.sessions['dead-session'] = {
        id: 'dead-session',
        status: 'recording',
        started_at: Date.now() - 600_000,
        active_ms: 540_000, // 9 minutes banked at the last flush
      };
      const pts: [number, number, number | null][] = [
        [47.6062, -122.3321, 100],
        [47.6062, -122.3221, 104], // ~750 m east, 4 m up
        [47.6062, -122.3121, 103],
      ];
      pts.forEach(([lat, lng, altitude], i) => {
        db.points.push({
          session_id: 'dead-session',
          seq: i,
          t: i * 10,
          lat,
          lng,
          altitude,
          accuracy: 5,
          speed: 3,
        });
      });
    }

    it('rebuilds an interrupted session from SQLite, paused', async () => {
      seedInterruptedSession();

      const restored = await rideRecorder.restoreIfNeeded();

      expect(restored).toBe(true);
      const snapshot = rideRecorder.getSnapshot();
      expect(snapshot.status).toBe('paused');
      // Replayed through the same math as live ingestion: ~1.5 km east.
      expect(snapshot.distanceM).toBeGreaterThan(1400);
      expect(snapshot.elevationGainM).toBe(4);
      expect(snapshot.trackLength).toBe(3);
      expect(rideRecorder.getElapsedMs()).toBe(540_000);
      expect(rideRecorder.getSummary().startLat).toBe(47.6062);
      // The dead session is marked paused on disk too, so a second crash
      // before the rider decides still restores it.
      expect(db.sessions['dead-session'].status).toBe('paused');
    });

    it('resuming a restored session starts the provided stream and continues the seq', async () => {
      seedInterruptedSession();
      await rideRecorder.restoreIfNeeded();

      const controller = makeController();
      await rideRecorder.resume(controller);
      expect(controller.startCalls).toBe(1);
      expect(rideRecorder.getSnapshot().status).toBe('recording');

      emit({ longitude: -122.3021, timestamp: Date.now() });
      await rideRecorder.stop();

      // The new point extends the old series rather than colliding with it.
      const seqs = db.points.map((p) => p.seq).sort((a, b) => a - b);
      expect(seqs).toEqual([0, 1, 2, 3]);
    });

    it('concurrent callers share one in-flight restore', async () => {
      // The real-world shape: a background relaunch delivers a location
      // batch (task handler calls restoreIfNeeded) while the root layout's
      // mount effect calls it too, before either's DB reads resolve. Both
      // must resolve from ONE restore rather than racing two.
      seedInterruptedSession();
      const readSpy = jest.spyOn(db, 'getFirstAsync');

      const [first, second] = await Promise.all([
        rideRecorder.restoreIfNeeded(),
        rideRecorder.restoreIfNeeded(),
      ]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(rideRecorder.getSnapshot().status).toBe('paused');
      expect(rideRecorder.getSnapshot().trackLength).toBe(3);
    });

    it('returns false when there is nothing to restore', async () => {
      await expect(rideRecorder.restoreIfNeeded()).resolves.toBe(false);
      expect(rideRecorder.getSnapshot().status).toBe('idle');
    });

    it('is a no-op while a session is already live', async () => {
      await rideRecorder.start(makeController());
      emit({});
      await expect(rideRecorder.restoreIfNeeded()).resolves.toBe(false);
      expect(rideRecorder.getSnapshot().status).toBe('recording');
    });
  });
});
