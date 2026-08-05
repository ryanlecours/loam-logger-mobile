import * as SQLite from 'expo-sqlite';

// Single app-wide SQLite handle. This database backs everything that must
// survive a cold start without connectivity: the mutation outbox and (via
// expo-sqlite/kv-store, which uses its own database) the persisted Apollo
// cache. Auth tokens stay in SecureStore; nothing security-sensitive lives
// here.
const DB_NAME = 'loamlogger.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Versioned migrations via PRAGMA user_version. Append a new entry to run
// schema changes on devices that already have the database; never edit an
// entry that has shipped.
const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY NOT NULL,
    op_name TEXT NOT NULL,
    variables_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL
  );`,
  // GPS ride recording. The session row carries the running totals; points
  // append in batches during the ride. Everything here must survive a crash
  // or force-quit mid-ride, which is the reason this lives in SQLite rather
  // than component state. Points keep raw GPS values (accuracy included) so
  // later phases can re-run smoothing server-side; t is seconds since
  // session start, matching the NormalizedStreams shape the API stores.
  `CREATE TABLE IF NOT EXISTS recording_session (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    active_ms INTEGER NOT NULL DEFAULT 0,
    distance_m REAL NOT NULL DEFAULT 0,
    elevation_gain_m REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recording_point (
    session_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    t INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    altitude REAL,
    accuracy REAL,
    speed REAL,
    PRIMARY KEY (session_id, seq)
  );`,
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.execAsync(MIGRATIONS[v]);
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL keeps a crash mid-write from corrupting the file, which is the
      // whole point of a durable outbox.
      await db.execAsync('PRAGMA journal_mode = WAL');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}
