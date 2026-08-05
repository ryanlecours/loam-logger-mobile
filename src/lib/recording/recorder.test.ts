jest.mock('../db', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'session-1') }));

import { getDb } from '../db';
import { rideRecorder, type LocationUpdate } from './recorder';

const mockGetDb = getDb as jest.Mock;

/** Minimal fake over the two recording tables. */
function makeFakeDb() {
  const sessions: Record<string, Record<string, unknown>> = {};
  const points: unknown[] = [];
  return {
    sessions,
    points,
    async runAsync(sql: string, ...params: unknown[]) {
      if (sql.includes('INSERT INTO recording_session')) {
        const [id] = params as [string];
        sessions[id] = { id };
        return;
      }
      if (sql.includes('INSERT OR IGNORE INTO recording_point')) {
        points.push(params);
        return;
      }
      if (sql.includes('UPDATE recording_session')) return;
      if (sql.includes('DELETE FROM recording_point')) {
        points.length = 0;
        return;
      }
      if (sql.includes('DELETE FROM recording_session')) {
        const [id] = params as [string];
        delete sessions[id];
        return;
      }
      throw new Error(`FakeDb: unhandled SQL: ${sql}`);
    },
  };
}

/** Injectable GPS feed the tests drive by hand. */
function makeFakeSource() {
  let callback: ((u: LocationUpdate) => void) | null = null;
  let stopped = false;
  return {
    source: {
      watch: async (cb: (u: LocationUpdate) => void) => {
        callback = cb;
        return () => {
          stopped = true;
        };
      },
    },
    emit(update: Partial<LocationUpdate>) {
      callback?.({
        latitude: 47.6062,
        longitude: -122.3321,
        altitude: null,
        accuracy: 5,
        speed: 3,
        timestamp: Date.now(),
        ...update,
      });
    },
    get stopped() {
      return stopped;
    },
  };
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
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);
    expect(rideRecorder.getSnapshot().status).toBe('recording');

    gps.emit({});
    jest.advanceTimersByTime(60_000);
    gps.emit({ longitude: -122.3221, timestamp: Date.now() });

    rideRecorder.pause();
    jest.advanceTimersByTime(300_000); // 5 min coffee stop
    rideRecorder.resume();
    jest.advanceTimersByTime(60_000);

    const summary = await rideRecorder.stop();

    // 2 minutes riding; the paused 5 minutes do not count.
    expect(summary.durationSeconds).toBe(120);
    expect(summary.distanceMeters).toBeGreaterThan(740);
    expect(summary.startLat).toBe(47.6062);
    expect(summary.startLng).toBe(-122.3321);
    expect(gps.stopped).toBe(true);
  });

  it('ignores GPS updates that arrive while paused', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);
    gps.emit({});
    rideRecorder.pause();

    // A drive to the next trailhead while paused must not count as riding.
    gps.emit({ longitude: -122.2, timestamp: Date.now() });

    expect(rideRecorder.getSnapshot().distanceM).toBe(0);
    expect(rideRecorder.getSnapshot().pointCount).toBe(1);
  });

  it('flushes points to SQLite in batches during the ride', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);
    for (let i = 0; i < 5; i++) {
      gps.emit({ timestamp: Date.now() + i * 1000 });
    }
    // Flush fires at 5 buffered points; drain the async write chain.
    await jest.advanceTimersByTimeAsync(0);
    expect(db.points.length).toBe(5);
  });

  it('stop flushes the unflushed tail', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);
    gps.emit({});
    gps.emit({ timestamp: Date.now() + 1000 });

    await rideRecorder.stop();
    expect(db.points.length).toBe(2);
  });

  it('drops the (0,0) no-fix sentinel entirely', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);

    gps.emit({ latitude: 0, longitude: 0 }); // pre-acquisition sentinel
    gps.emit({});
    gps.emit({ longitude: -122.3221, timestamp: Date.now() + 1000 });

    const summary = await rideRecorder.stop();
    // The sentinel is not the start, not a point, and not a distance segment.
    expect(summary.startLat).toBe(47.6062);
    expect(rideRecorder.getSnapshot().pointCount).toBe(2);
    expect(summary.distanceMeters).toBeLessThan(1000);
    expect(summary.distanceMeters).toBeGreaterThan(740);
  });

  it('waits for an accuracy-accepted fix before setting the start coordinate', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);

    gps.emit({ latitude: 47.7, longitude: -122.4, accuracy: 80 }); // cold-start junk
    gps.emit({});

    const summary = await rideRecorder.stop();
    expect(summary.startLat).toBe(47.6062);
    expect(summary.startLng).toBe(-122.3321);
    // The junk fix is still stored raw for future server-side reprocessing.
    expect(rideRecorder.getSnapshot().pointCount).toBe(2);
  });

  it('clear deletes the session and returns to idle', async () => {
    const gps = makeFakeSource();
    await rideRecorder.start(gps.source);
    gps.emit({});
    await rideRecorder.stop();

    await rideRecorder.clear();

    expect(rideRecorder.getSnapshot().status).toBe('idle');
    expect(rideRecorder.getSnapshot().pointCount).toBe(0);
    expect(Object.keys(db.sessions)).toHaveLength(0);
    expect(db.points.length).toBe(0);
  });
});
