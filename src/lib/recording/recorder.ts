import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import {
  type Accumulator,
  type GeoSample,
  accumulate,
  emptyAccumulator,
  isUsableFix,
} from './geo';

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
  /** Latest accuracy-accepted fix; what the live map's position dot shows. */
  lastFix: { latitude: number; longitude: number } | null;
  /**
   * Length of getTrack()'s array. The array itself is mutated in place for
   * cheapness, so consumers key their memoization on this counter instead of
   * array identity.
   */
  trackLength: number;
}

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
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
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
  accuracy: number | null;
  speed: number | null;
}

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

  /** Live elapsed active time; read on a UI interval, not via the snapshot. */
  getElapsedMs(): number {
    const spanMs =
      this.spanStartedAt !== null ? Date.now() - this.spanStartedAt : 0;
    return this.activeMsBanked + spanMs;
  }

  private publish(): void {
    this.snapshot = {
      status: this.status,
      distanceM: this.acc.distanceM,
      elevationGainM: this.acc.elevationGainM,
      pointCount: this.seq,
      lastFix: this.lastFix,
      trackLength: this.track.length,
    };
    this.listeners.forEach((l) => l());
  }

  async start(controller: LocationController): Promise<void> {
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

    const db = await getDb();
    await db.runAsync(
      `INSERT INTO recording_session (id, status, started_at, active_ms, distance_m, elevation_gain_m, updated_at)
       VALUES (?, 'recording', ?, 0, 0, 0, ?)`,
      this.sessionId,
      this.startedAt,
      this.startedAt,
    );

    await controller.start();
    this.publish();
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
      'SELECT seq, t, lat, lng, altitude, accuracy, speed FROM recording_point WHERE session_id = ? ORDER BY seq ASC',
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

    // Replay the stored points through the same math that built the live
    // totals, so a restored session shows exactly what a never-interrupted
    // one would (minus the unflushed tail the crash took).
    for (const p of points) {
      const sample: GeoSample = {
        latitude: p.lat,
        longitude: p.lng,
        altitude: p.altitude,
        accuracy: p.accuracy,
        t: p.t,
      };
      const usable = isUsableFix(sample);
      if (!this.firstFix && usable) {
        this.firstFix = { lat: p.lat, lng: p.lng };
      }
      if (usable) {
        this.track.push([p.lat, p.lng]);
        this.lastFix = { latitude: p.lat, longitude: p.lng };
      }
      this.acc = accumulate(this.acc, sample);
    }
    this.seq = points.length > 0 ? points[points.length - 1].seq + 1 : 0;
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

    // Live map data: accepted fixes only, same bar as everything above.
    if (usable) {
      this.track.push([update.latitude, update.longitude]);
      this.lastFix = { latitude: update.latitude, longitude: update.longitude };
    }

    this.acc = accumulate(this.acc, sample);
    this.buffer.push({
      seq: this.seq++,
      t: sample.t,
      lat: update.latitude,
      lng: update.longitude,
      altitude: update.altitude,
      accuracy: update.accuracy,
      speed: update.speed,
    });

    if (this.buffer.length >= FLUSH_EVERY_POINTS) {
      void this.flush();
    }
    this.publish();
  }

  /** Batch the buffered points and running totals into SQLite. */
  private async flush(): Promise<void> {
    if (!this.sessionId || this.buffer.length === 0) return;
    const points = this.buffer;
    this.buffer = [];
    const db = await getDb();
    for (const p of points) {
      await db.runAsync(
        `INSERT OR IGNORE INTO recording_point (session_id, seq, t, lat, lng, altitude, accuracy, speed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        this.sessionId,
        p.seq,
        p.t,
        p.lat,
        p.lng,
        p.altitude,
        p.accuracy,
        p.speed,
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
    this.activeMsBanked = this.getElapsedMs();
    this.spanStartedAt = null;
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
  async resume(controller?: LocationController): Promise<void> {
    if (this.status !== 'paused') return;
    // Only start a stream when none is attached: a restored session lost its
    // stream with the old process; a live in-process pause kept its own.
    if (!this.controller && controller) {
      this.controller = controller;
      await controller.start();
    }
    this.spanStartedAt = Date.now();
    this.status = 'recording';
    this.publish();
  }

  async stop(): Promise<RecordingSummary> {
    if (this.status === 'recording') {
      this.activeMsBanked = this.getElapsedMs();
      this.spanStartedAt = null;
    }
    this.status = 'finished';
    await this.controller?.stop().catch(() => {});
    this.controller = null;
    await this.flush();
    this.publish();
    return this.getSummary();
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
    this.publish();
  }
}

export const rideRecorder = new RideRecorder();
