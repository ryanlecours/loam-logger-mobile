import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import {
  type Accumulator,
  type AltitudeReading,
  type GeoSample,
  MAX_ACCURACY_M,
  accumulate,
  emptyAccumulator,
  isUsableFix,
} from './geo';
import {
  type AltitudeSource,
  type BaroReading,
  AltitudeFuser,
  hysteresisForSource,
} from './altitude';
import { MOTION_STALE_MS, MOTION_WINDOW_S, MotionWindow, nextMotionState } from './motion';
import type { BarometerController } from './barometer';

// The ride recorder: a singleton state machine over a crash-safe SQLite
// buffer. UI subscribes via useRideRecorder; GPS fixes arrive through the
// public ingest() method, fed by the background location task (production)
// or directly (tests). The injected LocationController only starts and stops
// the platform's update stream; it never touches recorder state.
//
// Durability model: every point batch and totals update lands in SQLite
// within a few seconds of being sampled. A crash, force-quit, or OS jettison
// mid-ride loses at most the unflushed tail of the buffer; restoreIfNeeded()
// rebuilds the whole session from those rows on next launch, so a ride is
// never silently lost. Save and discard clear the rows.

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'finished';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  /** Vertical accuracy in meters; null when the platform does not report it. */
  altitudeAccuracy: number | null;
  accuracy: number | null;
  speed: number | null;
  /** Epoch ms of the fix. */
  timestamp: number;
}

/** Starts/stops the platform location stream. Fixes arrive via ingest(). */
export interface LocationController {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface RecorderSnapshot {
  status: RecorderStatus;
  distanceM: number;
  elevationGainM: number;
  pointCount: number;
  /**
   * True while recording but auto-paused: the rider has stopped moving, so
   * the clock and both totals are held. Distinct from status 'paused', which
   * is the rider's own decision and survives a restore.
   */
  autoPaused: boolean;
  /** Latest accuracy-accepted fix; what the live map's position dot shows. */
  lastFix: { latitude: number; longitude: number } | null;
  /**
   * Length of getTrack()'s array. The array itself is mutated in place for
   * cheapness, so consumers key their memoization on this counter instead of
   * array identity.
   */
  trackLength: number;
}

/**
 * The per-point series uploaded with a saved ride, shaped to the API's
 * NormalizedStreams contract: parallel, index-aligned arrays. Lets the server
 * store an in-app recording's track the same way it stores a Garmin or Strava
 * one, which is what puts native rides on the ride-track map and through lift
 * detection, and what makes any future correction re-derivable instead of
 * frozen at whatever the phone computed that day.
 */
export interface RideTrackPayload {
  /** Seconds since ride start. */
  time: number[];
  latlng: [number, number][];
  /** Meters. Fused barometric where available; see ./altitude. */
  altitude: number[];
  /** False for samples taken while auto-paused. */
  moving: boolean[];
}

/**
 * Ceiling on uploaded points; longer rides are evenly strided down to it.
 * A 6 h ride at 1 Hz is ~21,000 samples, and lift detection does not get
 * better from a 1 s resolution than it does from 2 s, but the request body
 * does get twice as big.
 */
export const MAX_TRACK_POINTS = 10000;

export interface RecordingSummary {
  startedAt: number;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  startLat: number | null;
  startLng: number | null;
}

interface BufferedPoint {
  seq: number;
  t: number;
  lat: number;
  lng: number;
  /** Raw GPS altitude, kept unmodified for server-side reprocessing. */
  altitude: number | null;
  altitudeAccuracy: number | null;
  /** What the deadband actually accumulated. Null when neither sensor spoke. */
  fusedAltitude: number | null;
  altSource: AltitudeSource | null;
  accuracy: number | null;
  speed: number | null;
  moving: boolean;
}

interface SessionRow {
  id: string;
  status: string;
  started_at: number;
  active_ms: number;
}

interface PointRow {
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

const POINT_COLUMNS =
  'seq, t, lat, lng, altitude, altitude_accuracy, fused_altitude, alt_source, accuracy, speed, moving';

const FLUSH_EVERY_POINTS = 5;

class RideRecorder {
  private status: RecorderStatus = 'idle';
  private sessionId: string | null = null;
  private startedAt = 0;
  /** Active (unpaused) milliseconds accumulated before the current span. */
  private activeMsBanked = 0;
  /** Wall-clock start of the current active span; null while paused. */
  private spanStartedAt: number | null = null;
  private acc: Accumulator = emptyAccumulator();
  private seq = 0;
  private buffer: BufferedPoint[] = [];
  private firstFix: { lat: number; lng: number } | null = null;
  private controller: LocationController | null = null;
  private barometer: BarometerController | null = null;
  /** Latest pressure reading, attached to each fix by the fuser. */
  private baro: BaroReading | null = null;
  private fuser = new AltitudeFuser();
  private motion = new MotionWindow();
  /**
   * Auto-pause state. Only meaningful while status is 'recording'; a manual
   * pause is tracked by status instead, so the two never fight and a rider's
   * own pause is never undone by the rider starting to move.
   */
  private moving = true;
  /** Epoch ms of the last accuracy-accepted fix, for the stale-signal rule. */
  private lastAcceptedAt: number | null = null;
  // Accuracy-accepted fixes only, so the drawn line agrees with the distance
  // math (a rejected fix that never added meters must not bend the line).
  // Mutated in place; snapshot.trackLength is the change signal.
  private track: [number, number][] = [];
  private lastFix: { latitude: number; longitude: number } | null = null;

  private listeners = new Set<() => void>();
  private snapshot: RecorderSnapshot = {
    status: 'idle',
    distanceM: 0,
    elevationGainM: 0,
    pointCount: 0,
    autoPaused: false,
    lastFix: null,
    trackLength: 0,
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RecorderSnapshot => this.snapshot;

  /**
   * The live polyline. Returned by reference and mutated in place as fixes
   * arrive; treat as read-only and re-read when snapshot.trackLength moves.
   */
  getTrack(): readonly [number, number][] {
    return this.track;
  }

  /**
   * Live elapsed active time; read on a UI interval, not via the snapshot.
   *
   * The clock stops on its own once the fixes dry up, without needing a timer
   * to notice. Signal loss under cover is not the same as stopping, but it
   * cannot credit unbounded time either: distance stopped accruing the moment
   * the fixes did, so time has to stop too or the two totals diverge. Capping
   * here rather than retro-correcting on the next fix is what keeps the
   * displayed clock from jumping backwards when signal returns.
   */
  getElapsedMs(): number {
    if (this.spanStartedAt === null) return this.activeMsBanked;
    const cutoff =
      this.lastAcceptedAt !== null ? this.lastAcceptedAt + MOTION_STALE_MS : Infinity;
    const end = Math.min(Date.now(), cutoff);
    return this.activeMsBanked + Math.max(0, end - this.spanStartedAt);
  }

  /**
   * Stop the clock, crediting up to `backdateMs` less than the span actually
   * ran. Auto-pause is always a retrospective verdict (the rider is declared
   * stopped only after a window of not moving), so the window itself is
   * refunded. Never moves the total backwards.
   */
  private suspendClock(backdateMs = 0): void {
    if (this.spanStartedAt === null) return;
    this.activeMsBanked = Math.max(this.activeMsBanked, this.getElapsedMs() - backdateMs);
    this.spanStartedAt = null;
  }

  private resumeClock(): void {
    if (this.spanStartedAt === null) this.spanStartedAt = Date.now();
  }

  private publish(): void {
    this.snapshot = {
      status: this.status,
      distanceM: this.acc.distanceM,
      elevationGainM: this.acc.elevationGainM,
      pointCount: this.seq,
      autoPaused: this.status === 'recording' && !this.moving,
      lastFix: this.lastFix,
      trackLength: this.track.length,
    };
    this.listeners.forEach((l) => l());
  }

  async start(controller: LocationController, barometer?: BarometerController): Promise<void> {
    if (this.status !== 'idle') return;
    this.sessionId = Crypto.randomUUID();
    this.startedAt = Date.now();
    this.activeMsBanked = 0;
    this.spanStartedAt = this.startedAt;
    this.acc = emptyAccumulator();
    this.seq = 0;
    this.buffer = [];
    this.firstFix = null;
    this.track = [];
    this.lastFix = null;
    this.status = 'recording';
    this.controller = controller;
    this.baro = null;
    this.fuser.seed(null);
    this.motion.reset();
    // A ride starts moving: the rider pressed start. Waiting for the motion
    // window to fill before crediting time would clip the first few seconds
    // off every ride.
    this.moving = true;
    this.lastAcceptedAt = null;

    const db = await getDb();
    await db.runAsync(
      `INSERT INTO recording_session (id, status, started_at, active_ms, distance_m, elevation_gain_m, updated_at)
       VALUES (?, 'recording', ?, 0, 0, 0, ?)`,
      this.sessionId,
      this.startedAt,
      this.startedAt,
    );

    await controller.start();
    await this.startBarometer(barometer);
    this.publish();
  }

  /**
   * Attach the pressure sensor, if the platform has one. Deliberately
   * best-effort: elevation falls back to smoothed GPS with a wider deadband
   * when this does nothing, and no rider should lose a recording because a
   * sensor refused to start.
   */
  private async startBarometer(barometer?: BarometerController): Promise<void> {
    if (!barometer) return;
    this.barometer = barometer;
    await barometer
      .start((reading) => {
        this.baro = reading;
      })
      .catch(() => {
        this.barometer = null;
      });
  }

  private restoring: Promise<boolean> | null = null;

  /**
   * Rebuild an interrupted session from its SQLite rows. Called on every
   * launch (and by the background task before ingesting, in case the task
   * fires before the UI mounts). Returns true when a session was restored.
   *
   * Those two call sites can race on the same launch (a background relaunch
   * delivers a location batch while the layout effect is still mounting), so
   * concurrent callers share one in-flight promise, mirroring the deduped
   * token refresh in apolloClient.ts. Without this, both callers pass the
   * idle check before either's DB reads resolve, and the slower one stomps
   * whatever happened in between, including a Resume the rider just tapped.
   *
   * The restored session comes back PAUSED regardless of how it died: the
   * recorder cannot know whether the rider kept riding while the app was
   * dead, so it does not guess. The record screen then offers Resume /
   * Finish / Discard, and elapsed time excludes the dead window (active_ms
   * was banked at the last flush).
   */
  async restoreIfNeeded(): Promise<boolean> {
    if (this.status !== 'idle') return false;
    if (this.restoring) return this.restoring;
    this.restoring = this.doRestore().finally(() => {
      this.restoring = null;
    });
    return this.restoring;
  }

  private async doRestore(): Promise<boolean> {
    const db = await getDb();
    const session = await db.getFirstAsync<SessionRow>(
      `SELECT id, status, started_at, active_ms FROM recording_session
       WHERE status IN ('recording', 'paused') ORDER BY started_at DESC LIMIT 1`,
    );
    if (!session) return false;

    const points = await db.getAllAsync<PointRow>(
      `SELECT ${POINT_COLUMNS} FROM recording_point WHERE session_id = ? ORDER BY seq ASC`,
      session.id,
    );

    this.sessionId = session.id;
    this.startedAt = session.started_at;
    this.activeMsBanked = session.active_ms;
    this.spanStartedAt = null;
    this.acc = emptyAccumulator();
    this.buffer = [];
    this.firstFix = null;
    this.track = [];
    this.lastFix = null;
    this.baro = null;
    this.motion.reset();
    this.moving = true;

    // Replay the stored points through the same math that built the live
    // totals, so a restored session shows exactly what a never-interrupted
    // one would (minus the unflushed tail the crash took).
    //
    // Altitude replays the STORED fused value rather than re-fusing: the
    // barometer's datum is arbitrary and died with the old process, so the
    // raw relative readings are no longer comparable to anything. The raw GPS
    // altitude is still in the row for the server.
    let lastFused: number | null = null;
    for (const p of points) {
      const sample: GeoSample = {
        latitude: p.lat,
        longitude: p.lng,
        altitude: p.altitude,
        altitudeAccuracy: p.altitude_accuracy,
        accuracy: p.accuracy,
        t: p.t,
      };
      const usable = isUsableFix(sample);
      if (!this.firstFix && usable) {
        this.firstFix = { lat: p.lat, lng: p.lng };
      }
      if (p.fused_altitude !== null) lastFused = p.fused_altitude;
      // Auto-paused samples were never accumulated live, so replaying them
      // would invent distance and time the ride never had.
      if (!usable || p.moving === 0) continue;
      this.track.push([p.lat, p.lng]);
      this.lastFix = { latitude: p.lat, longitude: p.lng };
      this.acc = accumulate(this.acc, sample, readingFromRow(p));
    }
    this.seq = points.length > 0 ? points[points.length - 1].seq + 1 : 0;
    this.lastAcceptedAt =
      points.length > 0 ? session.started_at + points[points.length - 1].t * 1000 : null;
    // Continue the altitude series from where it left off, so the first
    // reading after a resume does not step and book a phantom climb.
    this.fuser.seed(lastFused);
    this.status = 'paused';

    await db.runAsync(
      `UPDATE recording_session SET status = 'paused', updated_at = ? WHERE id = ?`,
      Date.now(),
      session.id,
    );
    this.publish();
    return true;
  }

  /** GPS fixes enter here: from the background task, or directly in tests. */
  ingest(update: LocationUpdate): void {
    // Paused keeps the GPS warm (a resumed rider gets an instant fix) but
    // records nothing; the pause simply does not exist in the point series.
    if (this.status !== 'recording') return;

    // Exactly (0, 0) is a "no fix yet" sentinel on some GPS stacks, not a
    // place. Dropped entirely: as a first fix it would report the ride as
    // starting in the Gulf of Guinea, and mid-ride it would add a
    // several-thousand-km distance segment. The API rejects it too, as a
    // backstop.
    if (update.latitude === 0 && update.longitude === 0) return;

    const sample: GeoSample = {
      latitude: update.latitude,
      longitude: update.longitude,
      altitude: update.altitude,
      altitudeAccuracy: update.altitudeAccuracy,
      accuracy: update.accuracy,
      t: Math.max(0, Math.round((update.timestamp - this.startedAt) / 1000)),
    };

    const usable = isUsableFix(sample);

    // The ride's start coordinate feeds server-side weather (and later lift
    // detection), so it holds to the same accuracy bar as the distance math
    // rather than trusting whatever cold-start fix arrives first.
    if (!this.firstFix && usable) {
      this.firstFix = { lat: update.latitude, lng: update.longitude };
    }

    if (usable) this.updateMotion(sample, update.timestamp);

    // Fusion runs for every accepted fix, including auto-paused ones, so the
    // GPS filter and the barometric offset stay warm across a stop. Coming
    // back from a rest with a cold filter would spend the next minute
    // converging, and every metre of that convergence would look like climb.
    const fused = usable
      ? this.fuser.push(update.altitude, update.altitudeAccuracy, update.timestamp, this.baro)
      : null;

    // Live map data: accepted fixes the rider was actually moving for, so the
    // drawn line agrees with the distance total. The position dot still
    // follows every accepted fix, so it stays live while stopped.
    if (usable) {
      this.lastFix = { latitude: update.latitude, longitude: update.longitude };
      if (this.moving) {
        this.track.push([update.latitude, update.longitude]);
      }
    }

    // Standing still adds nothing. Holding `acc.lastFix` here rather than
    // advancing it means the first segment after a resume spans the whole
    // stop, which is the real displacement, while the jitter that accumulated
    // during it is never counted.
    if (this.moving) {
      this.acc = accumulate(this.acc, sample, fused);
    }

    this.buffer.push({
      seq: this.seq++,
      t: sample.t,
      lat: update.latitude,
      lng: update.longitude,
      altitude: update.altitude,
      altitudeAccuracy: update.altitudeAccuracy,
      fusedAltitude: fused?.value ?? null,
      altSource: fused?.source ?? null,
      accuracy: update.accuracy,
      speed: update.speed,
      moving: this.moving,
    });

    if (this.buffer.length >= FLUSH_EVERY_POINTS) {
      void this.flush();
    }
    this.publish();
  }

  /**
   * Fold one accepted fix into the auto-pause decision, applying whatever
   * transition it implies to the clock.
   *
   * Runs off arriving fixes rather than a timer on purpose: a backgrounded
   * app has its JS timers throttled or suspended by the OS, so a timer-driven
   * auto-pause would be least reliable exactly when a rider is most likely to
   * be stopped with the screen off.
   */
  private updateMotion(sample: GeoSample, at: number): void {
    // A long silence is its own verdict. The pre-gap samples say nothing
    // about the rider's current speed, so the window starts over rather than
    // measuring displacement across the hole and calling it a sprint.
    const stale =
      this.lastAcceptedAt !== null && at - this.lastAcceptedAt > MOTION_STALE_MS;
    if (stale) {
      this.motion.reset();
      this.setMoving(false, 0);
    }
    this.lastAcceptedAt = at;

    this.motion.push({ t: sample.t, latitude: sample.latitude, longitude: sample.longitude });
    this.setMoving(nextMotionState(this.moving, this.motion.speedMps()), MOTION_WINDOW_S * 1000);
  }

  private setMoving(moving: boolean, backdateMs: number): void {
    if (moving === this.moving) return;
    this.moving = moving;
    if (moving) {
      this.resumeClock();
    } else {
      this.suspendClock(backdateMs);
      // Bank the auto-pause into SQLite promptly: a crash while stopped
      // should not restore a session that thinks it was riding.
      void this.flush();
    }
  }

  /** Batch the buffered points and running totals into SQLite. */
  private async flush(): Promise<void> {
    if (!this.sessionId || this.buffer.length === 0) return;
    const points = this.buffer;
    this.buffer = [];
    const db = await getDb();
    for (const p of points) {
      await db.runAsync(
        `INSERT OR IGNORE INTO recording_point
           (session_id, seq, t, lat, lng, altitude, altitude_accuracy, fused_altitude, alt_source, accuracy, speed, moving)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        this.sessionId,
        p.seq,
        p.t,
        p.lat,
        p.lng,
        p.altitude,
        p.altitudeAccuracy,
        p.fusedAltitude,
        p.altSource,
        p.accuracy,
        p.speed,
        p.moving ? 1 : 0,
      );
    }
    await db.runAsync(
      `UPDATE recording_session SET status = ?, active_ms = ?, distance_m = ?, elevation_gain_m = ?, updated_at = ? WHERE id = ?`,
      this.status,
      this.getElapsedMs(),
      this.acc.distanceM,
      this.acc.elevationGainM,
      Date.now(),
      this.sessionId,
    );
  }

  pause(): void {
    if (this.status !== 'recording') return;
    this.suspendClock();
    this.status = 'paused';
    void this.flush();
    this.publish();
  }

  /**
   * Resume from pause, including a restored session. `controller` restarts
   * the platform stream when the pause came from a restore (the original
   * stream died with the old process); a live in-process resume passes
   * nothing and keeps the already-running stream.
   */
  async resume(
    controller?: LocationController,
    barometer?: BarometerController,
  ): Promise<void> {
    if (this.status !== 'paused') return;
    // Only start a stream when none is attached: a restored session lost its
    // stream with the old process; a live in-process pause kept its own.
    if (!this.controller && controller) {
      this.controller = controller;
      await controller.start();
    }
    if (!this.barometer && barometer) {
      await this.startBarometer(barometer);
    }
    // The rider said they are riding. Believe them until the motion window
    // fills up again and can say otherwise; the stale samples from before the
    // pause are no evidence about now.
    this.motion.reset();
    this.moving = true;
    this.lastAcceptedAt = null;
    this.spanStartedAt = Date.now();
    this.status = 'recording';
    this.publish();
  }

  async stop(): Promise<RecordingSummary> {
    if (this.status === 'recording') {
      this.suspendClock();
    }
    this.status = 'finished';
    await this.controller?.stop().catch(() => {});
    this.controller = null;
    this.barometer?.stop();
    this.barometer = null;
    await this.flush();
    this.publish();
    return this.getSummary();
  }

  /**
   * The full per-point series for upload, read back from SQLite so it covers
   * the whole ride rather than whatever is still in memory. Accepted fixes
   * only, matching the totals; call after `stop`, which flushes the tail.
   *
   * Altitude is the fused value, not the raw GPS one: it is the best estimate
   * available and the only series the ride's own elevation total is
   * consistent with. The raw GPS altitude stays in SQLite either way, and is
   * dropped with the session on save.
   */
  async getTrackPayload(): Promise<RideTrackPayload | null> {
    if (!this.sessionId) return null;
    const db = await getDb();
    const rows = await db.getAllAsync<PointRow>(
      `SELECT ${POINT_COLUMNS} FROM recording_point WHERE session_id = ? ORDER BY seq ASC`,
      this.sessionId,
    );
    // A session that spans an app upgrade can hold rows written before the
    // fused-altitude columns existed. Those come back undefined, and a track
    // with holes in its altitude series is worse than no track at all.
    const usable = rows.filter(
      (r) => r.fused_altitude != null && (r.accuracy == null || r.accuracy <= MAX_ACCURACY_M),
    );
    if (usable.length < 2) return null;

    const kept = stride(usable, MAX_TRACK_POINTS);
    return {
      time: kept.map((r) => r.t),
      // Six decimals is ~0.1 m, well inside GPS error, and roughly halves the
      // request body against the raw doubles.
      latlng: kept.map((r) => [round(r.lat, 6), round(r.lng, 6)] as [number, number]),
      altitude: kept.map((r) => round(r.fused_altitude as number, 1)),
      moving: kept.map((r) => r.moving === 1),
    };
  }

  getSummary(): RecordingSummary {
    return {
      startedAt: this.startedAt,
      durationSeconds: Math.round(this.activeMsBanked / 1000),
      distanceMeters: this.acc.distanceM,
      elevationGainMeters: this.acc.elevationGainM,
      startLat: this.firstFix?.lat ?? null,
      startLng: this.firstFix?.lng ?? null,
    };
  }

  /** Drop the session and its points; used after save and on discard. */
  async clear(): Promise<void> {
    await this.controller?.stop().catch(() => {});
    this.controller = null;
    this.barometer?.stop();
    this.barometer = null;
    if (this.sessionId) {
      const db = await getDb();
      await db.runAsync('DELETE FROM recording_point WHERE session_id = ?', this.sessionId);
      await db.runAsync('DELETE FROM recording_session WHERE id = ?', this.sessionId);
    }
    this.sessionId = null;
    this.status = 'idle';
    this.activeMsBanked = 0;
    this.spanStartedAt = null;
    this.acc = emptyAccumulator();
    this.seq = 0;
    this.buffer = [];
    this.firstFix = null;
    this.track = [];
    this.lastFix = null;
    this.baro = null;
    this.fuser.seed(null);
    this.motion.reset();
    this.moving = true;
    this.lastAcceptedAt = null;
    this.publish();
  }
}

/** Rebuild an accumulator-ready altitude from a stored row. */
function readingFromRow(row: PointRow): AltitudeReading | null {
  // `== null` rather than `=== null`: rows written before the migration that
  // added these columns come back undefined, and an undefined altitude would
  // otherwise become the anchor and silently kill elevation for the rest of
  // the replay.
  if (row.fused_altitude == null || row.alt_source == null) return null;
  return {
    value: row.fused_altitude,
    hysteresisM: hysteresisForSource(row.alt_source as AltitudeSource),
  };
}

/** Evenly thin an array to at most `max` entries, keeping first and last. */
function stride<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = items.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(items[Math.floor(i * step)]);
  const last = items[items.length - 1];
  if (out[out.length - 1] !== last) out[out.length - 1] = last;
  return out;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const rideRecorder = new RideRecorder();
