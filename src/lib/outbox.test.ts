jest.mock('./db', () => ({ getDb: jest.fn() }));
jest.mock('./connectivity', () => ({ isOnline: jest.fn(() => true) }));

import { getDb } from './db';
import { isOnline } from './connectivity';
import {
  classifyOutboxError,
  computeBackoffMs,
  enqueue,
  drainOutbox,
  listOutbox,
  retryOutboxRow,
  registerOutboxExecutor,
  setOnDrainSuccess,
} from './outbox';

const mockGetDb = getDb as jest.Mock;
const mockIsOnline = isOnline as jest.Mock;

interface FakeRow {
  id: string;
  op_name: string;
  variables_json: string;
  status: string;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at: number;
}

/**
 * In-memory stand-in for the SQLite outbox table. Dispatches on the exact SQL
 * strings outbox.ts issues; an unrecognized statement throws so a query added
 * to outbox.ts without a fake here fails loudly instead of silently no-oping.
 */
function makeFakeDb() {
  const rows: FakeRow[] = [];
  return {
    rows,
    async runAsync(sql: string, ...params: unknown[]) {
      if (sql.includes('INSERT OR IGNORE INTO outbox')) {
        const [id, opName, variablesJson, createdAt] = params as [string, string, string, number];
        if (!rows.find((r) => r.id === id)) {
          rows.push({
            id,
            op_name: opName,
            variables_json: variablesJson,
            status: 'pending',
            attempts: 0,
            next_attempt_at: 0,
            last_error: null,
            created_at: createdAt,
          });
        }
        return;
      }
      if (sql === 'DELETE FROM outbox WHERE id = ?') {
        const [id] = params as [string];
        const i = rows.findIndex((r) => r.id === id);
        if (i >= 0) rows.splice(i, 1);
        return;
      }
      if (sql === 'DELETE FROM outbox') {
        rows.length = 0;
        return;
      }
      if (sql.includes("SET status = 'pending', next_attempt_at = 0")) {
        const [id] = params as [string];
        const r = rows.find((x) => x.id === id);
        if (r) {
          r.status = 'pending';
          r.next_attempt_at = 0;
          r.last_error = null;
        }
        return;
      }
      if (sql.includes("SET status = 'failed'") && sql.includes('attempts = attempts + 1')) {
        const [err, id] = params as [string, string];
        const r = rows.find((x) => x.id === id);
        if (r) {
          r.status = 'failed';
          r.attempts += 1;
          r.last_error = err;
        }
        return;
      }
      if (sql.includes("SET status = 'failed'")) {
        const [err, id] = params as [string, string];
        const r = rows.find((x) => x.id === id);
        if (r) {
          r.status = 'failed';
          r.last_error = err;
        }
        return;
      }
      if (sql.includes('SET attempts = attempts + 1, next_attempt_at = ?')) {
        const [next, err, id] = params as [number, string, string];
        const r = rows.find((x) => x.id === id);
        if (r) {
          r.attempts += 1;
          r.next_attempt_at = next;
          r.last_error = err;
        }
        return;
      }
      throw new Error(`FakeDb: unhandled runAsync SQL: ${sql}`);
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      if (sql.includes("status = 'pending' AND next_attempt_at <= ?")) {
        const [now] = params as [number];
        return rows
          .filter((r) => r.status === 'pending' && r.next_attempt_at <= now)
          .sort((a, b) => a.created_at - b.created_at)
          .map((r) => ({ ...r }));
      }
      if (sql.includes('WHERE op_name = ?')) {
        const [op] = params as [string];
        return rows
          .filter((r) => r.op_name === op)
          .sort((a, b) => a.created_at - b.created_at)
          .map((r) => ({ ...r }));
      }
      if (sql.includes('FROM outbox ORDER BY created_at')) {
        return rows.slice().sort((a, b) => a.created_at - b.created_at).map((r) => ({ ...r }));
      }
      throw new Error(`FakeDb: unhandled getAllAsync SQL: ${sql}`);
    },
    async getFirstAsync(sql: string) {
      if (sql.includes('ORDER BY next_attempt_at ASC LIMIT 1')) {
        const pending = rows
          .filter((r) => r.status === 'pending')
          .sort((a, b) => a.next_attempt_at - b.next_attempt_at);
        return pending[0] ? { next_attempt_at: pending[0].next_attempt_at } : null;
      }
      throw new Error(`FakeDb: unhandled getFirstAsync SQL: ${sql}`);
    },
  };
}

describe('classifyOutboxError', () => {
  it('treats a transport failure with no status as retryable', () => {
    const verdict = classifyOutboxError({
      message: 'Network request failed',
      networkError: { message: 'Network request failed' },
    });
    expect(verdict.kind).toBe('retryable');
  });

  it('treats a 5xx as retryable', () => {
    const verdict = classifyOutboxError({
      message: 'Server error',
      networkError: { statusCode: 503 },
    });
    expect(verdict.kind).toBe('retryable');
  });

  it('treats a non-server transport status as terminal', () => {
    const verdict = classifyOutboxError({
      message: 'Payload too large',
      networkError: { statusCode: 413 },
    });
    expect(verdict.kind).toBe('terminal');
  });

  it('retries an HTTP-layer 429, which never carries the RATE_LIMITED code', () => {
    const verdict = classifyOutboxError({
      message: 'Too many requests',
      networkError: { statusCode: 429 },
    });
    expect(verdict.kind).toBe('retryable');
  });

  it('retries a 408 request timeout', () => {
    const verdict = classifyOutboxError({
      message: 'Request timeout',
      networkError: { statusCode: 408 },
    });
    expect(verdict.kind).toBe('retryable');
  });

  it('converts RATE_LIMITED retryAfter seconds into a wait in ms', () => {
    const verdict = classifyOutboxError({
      message: 'Rate limit exceeded',
      graphQLErrors: [{ extensions: { code: 'RATE_LIMITED', retryAfter: 42 } }],
    });
    expect(verdict.kind).toBe('retryable');
    expect(verdict.retryAfterMs).toBe(42_000);
  });

  it('treats a validation rejection as terminal', () => {
    const verdict = classifyOutboxError({
      message: 'bad input',
      graphQLErrors: [{ extensions: { code: 'BAD_USER_INPUT' } }],
    });
    expect(verdict.kind).toBe('terminal');
  });

  it('retries UNAUTHENTICATED, since the error link refreshes tokens', () => {
    const verdict = classifyOutboxError({
      message: 'unauthenticated',
      graphQLErrors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
    });
    expect(verdict.kind).toBe('retryable');
  });

  it('retries shapes it does not recognize', () => {
    expect(classifyOutboxError(new Error('who knows')).kind).toBe('retryable');
    expect(classifyOutboxError(undefined).kind).toBe('retryable');
  });
});

describe('computeBackoffMs', () => {
  // random() = 0.5 lands the jitter multiplier exactly on 1.0.
  const noJitter = () => 0.5;

  it('doubles from a 30s base', () => {
    expect(computeBackoffMs(0, noJitter)).toBe(30_000);
    expect(computeBackoffMs(1, noJitter)).toBe(60_000);
    expect(computeBackoffMs(2, noJitter)).toBe(120_000);
  });

  it('caps at 30 minutes', () => {
    expect(computeBackoffMs(20, noJitter)).toBe(30 * 60_000);
  });

  it('jitters within +-20%', () => {
    expect(computeBackoffMs(0, () => 0)).toBe(24_000);
    expect(computeBackoffMs(0, () => 1)).toBe(36_000);
  });
});

describe('outbox queue and drain', () => {
  let db: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    jest.useFakeTimers();
    db = makeFakeDb();
    mockGetDb.mockResolvedValue(db);
    mockIsOnline.mockReturnValue(true);
    setOnDrainSuccess(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stores a queued mutation while offline and ignores a duplicate id', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: { rideType: 'TRAIL' } });
    await enqueue('key-1', 'AddRide', { input: { rideType: 'TRAIL' } });

    const rows = await listOutbox('AddRide');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].variables).toEqual({ input: { rideType: 'TRAIL' } });
  });

  it('drains queued rows oldest-first, deletes them, and reports success once', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: { notes: 'first' } });
    await enqueue('key-2', 'AddRide', { input: { notes: 'second' } });
    // Preserve FIFO even though fake timers freeze Date.now().
    db.rows[1].created_at += 1;

    const sent: string[] = [];
    registerOutboxExecutor('AddRide', async (variables) => {
      sent.push((variables as { input: { notes: string } }).input.notes);
    });
    const onSuccess = jest.fn();
    setOnDrainSuccess(onSuccess);

    mockIsOnline.mockReturnValue(true);
    await drainOutbox();

    expect(sent).toEqual(['first', 'second']);
    expect(db.rows).toHaveLength(0);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('parks a row as failed on a terminal error', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: {} });

    registerOutboxExecutor('AddRide', async () => {
      throw {
        message: 'rideType is required',
        graphQLErrors: [{ extensions: { code: 'BAD_USER_INPUT' } }],
      };
    });
    const onSuccess = jest.fn();
    setOnDrainSuccess(onSuccess);

    mockIsOnline.mockReturnValue(true);
    await drainOutbox();

    expect(db.rows[0].status).toBe('failed');
    expect(db.rows[0].last_error).toBe('rideType is required');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reschedules a row with backoff on a transient error', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: {} });

    registerOutboxExecutor('AddRide', async () => {
      throw { message: 'Network request failed', networkError: {} };
    });

    mockIsOnline.mockReturnValue(true);
    await drainOutbox();

    expect(db.rows[0].status).toBe('pending');
    expect(db.rows[0].attempts).toBe(1);
    expect(db.rows[0].next_attempt_at).toBeGreaterThan(Date.now());

    // Not due yet: a second pass right away must not re-send it.
    const executor = jest.fn();
    registerOutboxExecutor('AddRide', executor);
    await drainOutbox();
    expect(executor).not.toHaveBeenCalled();
  });

  it('stops the whole pass on a rate limit and honors retryAfter', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: {} });
    await enqueue('key-2', 'AddRide', { input: {} });
    db.rows[1].created_at += 1;

    const executor = jest.fn().mockRejectedValue({
      message: 'Rate limit exceeded',
      graphQLErrors: [{ extensions: { code: 'RATE_LIMITED', retryAfter: 42 } }],
    });
    registerOutboxExecutor('AddRide', executor);

    mockIsOnline.mockReturnValue(true);
    await drainOutbox();

    // Only the first row was attempted; the rest of the queue waited.
    expect(executor).toHaveBeenCalledTimes(1);
    expect(db.rows[0].next_attempt_at).toBe(Date.now() + 42_000);
    expect(db.rows[1].attempts).toBe(0);
  });

  it('does not attempt anything while offline', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: {} });

    const executor = jest.fn();
    registerOutboxExecutor('AddRide', executor);
    await drainOutbox();

    expect(executor).not.toHaveBeenCalled();
    expect(db.rows).toHaveLength(1);
  });

  it('recovers a failed row through manual retry', async () => {
    mockIsOnline.mockReturnValue(false);
    await enqueue('key-1', 'AddRide', { input: {} });
    db.rows[0].status = 'failed';
    db.rows[0].last_error = 'previous failure';

    const executor = jest.fn().mockResolvedValue(undefined);
    registerOutboxExecutor('AddRide', executor);

    mockIsOnline.mockReturnValue(true);
    await retryOutboxRow('key-1');
    // retryOutboxRow kicks a fire-and-forget drain; its `draining` guard makes
    // a direct second call a no-op, so flush the event loop until it settles.
    await jest.advanceTimersByTimeAsync(0);

    expect(db.rows).toHaveLength(0);
  });
});
