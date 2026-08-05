import { getDb } from './db';
import { isOnline } from './connectivity';

// Durable mutation outbox. A row is a mutation the rider committed to while
// the app could not reach the API (trailheads rarely have signal). Rows
// survive force-quit and crash; the drain loop replays them oldest-first once
// connectivity returns. Safety against double-submits comes from the server:
// every queued mutation carries a client-generated idempotency key
// (AddRideInput.clientMutationId), so replaying a request whose response was
// lost returns the original row instead of inserting twice.

export type OutboxStatus = 'pending' | 'failed';

export interface OutboxRow {
  id: string;
  opName: string;
  variables: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: number;
}

interface DbRow {
  id: string;
  op_name: string;
  variables_json: string;
  status: OutboxStatus;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at: number;
}

type Executor = (variables: Record<string, unknown>) => Promise<void>;

const executors: Record<string, Executor> = {};
const changeListeners = new Set<() => void>();
let onDrainSuccess: (() => void) | null = null;

/** Map an operation name to the code that actually sends it. */
export function registerOutboxExecutor(opName: string, executor: Executor): void {
  executors[opName] = executor;
}

/** Called once after any drain pass that lands at least one row. */
export function setOnDrainSuccess(cb: () => void): void {
  onDrainSuccess = cb;
}

export function onOutboxChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChange(): void {
  changeListeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// Pure policy helpers (unit-tested directly)
// ---------------------------------------------------------------------------

export interface ErrorVerdict {
  kind: 'retryable' | 'terminal';
  /** Server-mandated wait (RATE_LIMITED retryAfter). Overrides backoff. */
  retryAfterMs?: number;
  message: string;
}

interface GraphQLErrorLike {
  message?: string;
  extensions?: { code?: string; retryAfter?: number };
}

interface ApolloErrorLike {
  networkError?: { statusCode?: number; message?: string } | null;
  graphQLErrors?: readonly GraphQLErrorLike[];
  message?: string;
}

/**
 * Decide whether a failed send should wait for another try or park as failed.
 *
 * The dividing line is whether a retry with identical bytes could ever
 * succeed. Transport failures, 5xx, and rate limits can; a validation
 * rejection cannot, and retrying it forever would just hide the problem from
 * the rider. Unknown shapes retry: the outbox exists to be stubborn, and
 * backoff caps the cost of stubbornness.
 */
export function classifyOutboxError(error: unknown): ErrorVerdict {
  const err = (error ?? {}) as ApolloErrorLike;
  const message = err.message || 'Unknown error';

  const rateLimited = err.graphQLErrors?.find(
    (e) => e.extensions?.code === 'RATE_LIMITED',
  );
  if (rateLimited) {
    const seconds = rateLimited.extensions?.retryAfter;
    return {
      kind: 'retryable',
      retryAfterMs: typeof seconds === 'number' ? seconds * 1000 : undefined,
      message,
    };
  }

  if (err.networkError) {
    const status = err.networkError.statusCode;
    // No status code = transport never completed = offline or timeout.
    if (status === undefined) return { kind: 'retryable', message };
    if (status >= 500) return { kind: 'retryable', message };
    // Rate limiting can arrive at the HTTP layer too: the API's REST routes
    // send raw 429s (sendTooManyRequests), and the proxy in front of the API
    // can throttle before the GraphQL layer ever runs, so it never carries
    // the RATE_LIMITED extensions code. 408 is the transport giving up, not
    // the request being wrong. Both clear on their own; normal backoff.
    if (status === 429 || status === 408) return { kind: 'retryable', message };
    // Remaining 4xx transport errors (proxy rejections etc.) will not fix
    // themselves.
    return { kind: 'terminal', message };
  }

  if (err.graphQLErrors && err.graphQLErrors.length > 0) {
    // UNAUTHENTICATED retries: the Apollo error link refreshes tokens, so the
    // next pass usually carries a valid one. Everything else (BAD_USER_INPUT,
    // resolver throws) is deterministic and parks as failed.
    const unauth = err.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
    return { kind: unauth ? 'retryable' : 'terminal', message };
  }

  return { kind: 'retryable', message };
}

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/** Exponential backoff with jitter: 30s, 1m, 2m ... capped at 30m. */
export function computeBackoffMs(attempts: number, random: () => number = Math.random): number {
  const exp = Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
  // +-20% jitter so a fleet of queued rows does not re-fire in lockstep.
  const jitter = 1 + (random() * 0.4 - 0.2);
  return Math.round(exp * jitter);
}

// ---------------------------------------------------------------------------
// Storage operations
// ---------------------------------------------------------------------------

function toRow(r: DbRow): OutboxRow {
  return {
    id: r.id,
    opName: r.op_name,
    variables: JSON.parse(r.variables_json) as Record<string, unknown>,
    status: r.status,
    attempts: r.attempts,
    nextAttemptAt: r.next_attempt_at,
    lastError: r.last_error,
    createdAt: r.created_at,
  };
}

export async function enqueue(
  id: string,
  opName: string,
  variables: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO outbox (id, op_name, variables_json, status, attempts, next_attempt_at, last_error, created_at)
     VALUES (?, ?, ?, 'pending', 0, 0, NULL, ?)`,
    id,
    opName,
    JSON.stringify(variables),
    Date.now(),
  );
  notifyChange();
  // Connectivity may have returned between the failed send and now.
  void drainOutbox();
}

export async function listOutbox(opName?: string): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = opName
    ? await db.getAllAsync<DbRow>(
        'SELECT * FROM outbox WHERE op_name = ? ORDER BY created_at ASC',
        opName,
      )
    : await db.getAllAsync<DbRow>('SELECT * FROM outbox ORDER BY created_at ASC');
  return rows.map(toRow);
}

export async function deleteOutboxRow(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
  notifyChange();
}

/** Manual "try again": clears failure state and drains immediately. */
export async function retryOutboxRow(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'pending', next_attempt_at = 0, last_error = NULL WHERE id = ?`,
    id,
  );
  notifyChange();
  void drainOutbox();
}

/** Logout hygiene: a signed-out device must not hold another rider's rides. */
export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox');
  notifyChange();
}

// ---------------------------------------------------------------------------
// Drain loop
// ---------------------------------------------------------------------------

let draining = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export async function drainOutbox(): Promise<void> {
  if (draining || !isOnline()) return;
  draining = true;
  let anySuccess = false;
  try {
    const db = await getDb();
    const due = await db.getAllAsync<DbRow>(
      `SELECT * FROM outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at ASC`,
      Date.now(),
    );

    for (const raw of due) {
      if (!isOnline()) break;
      const executor = executors[raw.op_name];
      if (!executor) {
        // A row from a build that knew an op this build does not. Park it
        // rather than delete: an update that restores the executor recovers it.
        await db.runAsync(
          `UPDATE outbox SET status = 'failed', last_error = ? WHERE id = ?`,
          `No executor for ${raw.op_name}`,
          raw.id,
        );
        notifyChange();
        continue;
      }

      try {
        await executor(JSON.parse(raw.variables_json) as Record<string, unknown>);
        await db.runAsync('DELETE FROM outbox WHERE id = ?', raw.id);
        anySuccess = true;
        notifyChange();
      } catch (error) {
        const verdict = classifyOutboxError(error);
        if (verdict.kind === 'terminal') {
          await db.runAsync(
            `UPDATE outbox SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?`,
            verdict.message,
            raw.id,
          );
          notifyChange();
          continue;
        }
        const delayMs = verdict.retryAfterMs ?? computeBackoffMs(raw.attempts);
        await db.runAsync(
          `UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?`,
          Date.now() + delayMs,
          verdict.message,
          raw.id,
        );
        notifyChange();
        // A rate limit applies to the whole account, and a transport failure
        // means we are offline again: either way the rest of the queue would
        // hit the same wall this pass.
        if (verdict.retryAfterMs !== undefined || !isOnline()) break;
      }
    }
  } finally {
    draining = false;
  }

  if (anySuccess) onDrainSuccess?.();
  await scheduleNextDrain();
}

/**
 * While the app is running, wake up for the earliest backoff deadline instead
 * of waiting for the next foreground/connectivity trigger. Cleared and
 * re-armed after every drain pass; harmless if the app is backgrounded (the
 * timer simply fires on resume or never).
 */
async function scheduleNextDrain(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  const db = await getDb();
  const next = await db.getFirstAsync<{ next_attempt_at: number }>(
    `SELECT next_attempt_at FROM outbox WHERE status = 'pending' ORDER BY next_attempt_at ASC LIMIT 1`,
  );
  if (!next) return;
  const waitMs = Math.max(1_000, next.next_attempt_at - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void drainOutbox();
  }, waitMs);
}
