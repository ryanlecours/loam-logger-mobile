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
// buffer. UI subscribes via useRideRecorder; the GPS feed comes in through
// an injected LocationSource so the machine itself never imports
// expo-location and stays unit-testable.
//
// Durability model: every point batch and totals update lands in SQLite
// within a few seconds of being sampled. A crash mid-ride loses at most the
// unflushed tail of the buffer; the session row and points survive for the
// phase-2 recovery flow. Phase 1 clears them on save or discard.

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

export type StopWatching = () => void;

export interface LocationSource {
  watch(onUpdate: (update: LocationUpdate) => void): Promise<StopWatching>;
}

export interface RecorderSnapshot {
  status: RecorderStatus;
  distanceM: number;
  elevationGainM: number;
  pointCount: number;
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
  private stopWatching: StopWatching | null = null;

  private listeners = new Set<() => void>();
  private snapshot: RecorderSnapshot = {
    status: 'idle',
    distanceM: 0,
    elevationGainM: 0,
    pointCount: 0,
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RecorderSnapshot => this.snapshot;

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
    };
    this.listeners.forEach((l) => l());
  }

  async start(source: LocationSource): Promise<void> {
    if (this.status !== 'idle') return;
    this.sessionId = Crypto.randomUUID();
    this.startedAt = Date.now();
    this.activeMsBanked = 0;
    this.spanStartedAt = this.startedAt;
    this.acc = emptyAccumulator();
    this.seq = 0;
    this.buffer = [];
    this.firstFix = null;
    this.status = 'recording';

    const db = await getDb();
    await db.runAsync(
      `INSERT INTO recording_session (id, status, started_at, active_ms, distance_m, elevation_gain_m, updated_at)
       VALUES (?, 'recording', ?, 0, 0, 0, ?)`,
      this.sessionId,
      this.startedAt,
      this.startedAt,
    );

    this.stopWatching = await source.watch((update) => this.onUpdate(update));
    this.publish();
  }

  private onUpdate(update: LocationUpdate): void {
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

    // The ride's start coordinate feeds server-side weather (and later lift
    // detection), so it holds to the same accuracy bar as the distance math
    // rather than trusting whatever cold-start fix arrives first.
    if (!this.firstFix && isUsableFix(sample)) {
      this.firstFix = { lat: update.latitude, lng: update.longitude };
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

  resume(): void {
    if (this.status !== 'paused') return;
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
    this.stopWatching?.();
    this.stopWatching = null;
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
    this.stopWatching?.();
    this.stopWatching = null;
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
    this.publish();
  }
}

export const rideRecorder = new RideRecorder();
