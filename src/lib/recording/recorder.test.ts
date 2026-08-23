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
  altitude_accuracy: number | null;
  fused_altitude: number | null;
  alt_source: string | null;
  accuracy: number | null;
  speed: number | null;
  moving: number;
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
        const [
          session_id, seq, t, lat, lng, altitude, altitude_accuracy, fused_altitude,
          alt_source, accuracy, speed, moving,
        ] = params as [
          string, number, number, number, number, number | null, number | null,
          number | null, string | null, number | null, number | null, number,
        ];
        points.push({
          session_id, seq, t, lat, lng, altitude, altitude_accuracy, fused_altitude,
          alt_source, accuracy, speed, moving,
        });
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
          .map(({ session_id: _ignored, ...row }) => row);
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
    altitudeAccuracy: null,
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

    // A fix every 5 s, moving east. The cadence matters now that the recorder
    // auto-pauses: fixes a whole minute apart would trip the stale-signal
    // rule, which is correct behaviour and not what this test is about.
    for (let i = 0; i <= 12; i++) {
      emit({ longitude: -122.3321 + i * 0.001, timestamp: Date.now() });
      if (i < 12) jest.advanceTimersByTime(5_000);
    }

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
        [47.6062, -122.3221, 105], // ~750 m east, 5 m up
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
          altitude_accuracy: 5,
          // Restore replays the stored FUSED value rather than re-fusing: the
          // barometer datum died with the old process.
          fused_altitude: altitude,
          alt_source: 'gps',
          accuracy: 5,
          speed: 3,
          moving: 1,
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
      expect(snapshot.elevationGainM).toBe(5);
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

  // Auto-pause. Ride duration accrues against installed components to drive
  // service predictions, so wall-clock time ages a drivetrain that was
  // standing at the trailhead. These cover the transitions; the speed
  // thresholds themselves are tested in ./motion.test.
  describe('auto-pause', () => {
    /** A fix every 2 s, `metersPerFix` further east each time. */
    function ride(fixes: number, metersPerFix: number, startLng = -122.3321) {
      // 0.00001 degrees of longitude at 47.6 N is ~0.75 m.
      const degPerMeter = 1 / (111320 * Math.cos((47.6062 * Math.PI) / 180));
      for (let i = 0; i < fixes; i++) {
        emit({ longitude: startLng + i * metersPerFix * degPerMeter, timestamp: Date.now() });
        jest.advanceTimersByTime(2_000);
      }
      return startLng + (fixes - 1) * metersPerFix * degPerMeter;
    }

    it('holds the clock and both totals once the rider stops moving', async () => {
      await rideRecorder.start(makeController());
      const parked = ride(10, 10); // 5 m/s: riding
      expect(rideRecorder.getSnapshot().autoPaused).toBe(false);
      const movingDistance = rideRecorder.getSnapshot().distanceM;
      const movingElapsed = rideRecorder.getElapsedMs();

      // Standing still, with the metre or two of jitter a real fix carries.
      for (let i = 0; i < 12; i++) {
        emit({ longitude: parked + (i % 2 === 0 ? 1e-5 : -1e-5), timestamp: Date.now() });
        jest.advanceTimersByTime(2_000);
      }

      const snapshot = rideRecorder.getSnapshot();
      expect(snapshot.autoPaused).toBe(true);
      expect(snapshot.distanceM).toBe(movingDistance);
      // The clock is refunded the window it took to reach the verdict, so it
      // reads BEHIND where it stood when the rider actually stopped.
      expect(rideRecorder.getElapsedMs()).toBeLessThanOrEqual(movingElapsed);
    });

    it('picks itself back up when the rider rides on', async () => {
      await rideRecorder.start(makeController());
      const parked = ride(10, 10);
      for (let i = 0; i < 12; i++) {
        emit({ longitude: parked + (i % 2 === 0 ? 1e-5 : -1e-5), timestamp: Date.now() });
        jest.advanceTimersByTime(2_000);
      }
      expect(rideRecorder.getSnapshot().autoPaused).toBe(true);

      ride(10, 10, parked);
      const snapshot = rideRecorder.getSnapshot();
      expect(snapshot.autoPaused).toBe(false);
      expect(snapshot.status).toBe('recording');
      expect(snapshot.distanceM).toBeGreaterThan(0);
    });

    it('stops the clock when the fixes dry up entirely', async () => {
      await rideRecorder.start(makeController());
      ride(6, 10);
      const elapsed = rideRecorder.getElapsedMs();

      // Phone in a pocket in a parking garage for ten minutes. Distance
      // stopped accruing the moment the fixes did, so time has to as well or
      // the two totals describe different rides.
      jest.advanceTimersByTime(600_000);
      expect(rideRecorder.getElapsedMs()).toBeLessThan(elapsed + 30_000);
    });

    it('a rider who stops does not lose their manual pause to auto-resume', async () => {
      await rideRecorder.start(makeController());
      ride(6, 10);
      rideRecorder.pause();
      ride(10, 10, -122.3);
      // Fixes kept arriving and clearly show movement; the rider's own pause
      // outranks the recorder's opinion, and only they can lift it.
      expect(rideRecorder.getSnapshot().status).toBe('paused');
      expect(rideRecorder.getSnapshot().autoPaused).toBe(false);
    });
  });

  describe('barometer', () => {
    it('prefers the barometer, and books a climb the GPS noise alone would hide', async () => {
      type Reading = { relativeAltitudeM: number; at: number; epoch: number };
      // Held on an object rather than in a local: the recorder assigns it from
      // inside start(), which control-flow analysis cannot see.
      const sensor: { push: ((reading: Reading) => void) | null; stopCalls: number } = {
        push: null,
        stopCalls: 0,
      };
      const barometer = {
        async start(onReading: (r: Reading) => void) {
          sensor.push = onReading;
        },
        stop() {
          sensor.stopCalls++;
        },
      };
      await rideRecorder.start(makeController(), barometer);
      expect(sensor.push).not.toBeNull();

      // GPS altitude pinned flat and noisy; the barometer climbs 20 m and
      // then holds at the top. The deadband on a barometric reading is 1 m,
      // so the climb is visible. The flat tail is not padding: the smoother
      // in front of that deadband has a ~10 s time constant, so a climb this
      // steep (1 m/s) only arrives in full once the rider stops climbing.
      for (let i = 0; i < 50; i++) {
        sensor.push?.({ relativeAltitudeM: Math.min(i, 19), at: Date.now(), epoch: 1 });
        emit({
          longitude: -122.3321 + i * 0.0001,
          altitude: 100 + (i % 2 === 0 ? 2 : -2),
          altitudeAccuracy: 5,
          timestamp: Date.now(),
        });
        jest.advanceTimersByTime(1_000);
      }

      expect(rideRecorder.getSnapshot().elevationGainM).toBeGreaterThan(15);
      await rideRecorder.stop();
      expect(sensor.stopCalls).toBe(1);
    });

    it('records without one: an unavailable barometer is not an error', async () => {
      const barometer = { async start() {}, stop() {} };
      await rideRecorder.start(makeController(), barometer);
      emit({});
      expect(rideRecorder.getSnapshot().status).toBe('recording');
    });
  });

  describe('getTrackPayload', () => {
    it('returns index-aligned arrays over the accepted fixes', async () => {
      await rideRecorder.start(makeController());
      for (let i = 0; i < 8; i++) {
        emit({
          longitude: -122.3321 + i * 0.0005,
          altitude: 100 + i,
          altitudeAccuracy: 5,
          timestamp: Date.now(),
        });
        jest.advanceTimersByTime(2_000);
      }
      await rideRecorder.stop();

      const track = await rideRecorder.getTrackPayload();
      expect(track).not.toBeNull();
      const n = track!.time.length;
      expect(track!.latlng).toHaveLength(n);
      expect(track!.altitude).toHaveLength(n);
      expect(track!.moving).toHaveLength(n);
      expect(track!.latlng[0]).toHaveLength(2);
      // Six decimals is ~0.1 m, well inside GPS error.
      expect(track!.latlng[0][0]).toBe(47.6062);
    });

    it('leaves out fixes the totals never counted', async () => {
      await rideRecorder.start(makeController());
      for (let i = 0; i < 8; i++) {
        emit({
          longitude: -122.3321 + i * 0.0005,
          altitude: 100 + i,
          altitudeAccuracy: 5,
          timestamp: Date.now(),
        });
        jest.advanceTimersByTime(2_000);
      }
      // Cold-start junk: rejected for distance, so it must not reach the map
      // or lift detection either.
      emit({ latitude: 47.9, longitude: -122.9, accuracy: 200, timestamp: Date.now() });
      await rideRecorder.stop();

      const track = await rideRecorder.getTrackPayload();
      expect(track!.latlng.some(([lat]) => lat === 47.9)).toBe(false);
    });

    it('returns null when there is nothing worth uploading', async () => {
      await rideRecorder.start(makeController());
      emit({ altitude: null, timestamp: Date.now() });
      await rideRecorder.stop();
      expect(await rideRecorder.getTrackPayload()).toBeNull();
    });
  });
});
