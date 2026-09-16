import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const DATABASE_URL = String(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING ||
  process.env.RENDER_DATABASE_URL ||
  process.env.DB_URL ||
  ''
).trim();
const DATA_DIR = process.env.DATA_DIR || './data';
const FILE_PATH = path.join(DATA_DIR, 'deck-pro-history.json');

const pool = /^postgres(?:ql)?:\/\//i.test(DATABASE_URL)
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || 10),
    })
  : null;

let fileRows = null;

function loadFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) {
    fileRows = [];
    fs.writeFileSync(FILE_PATH, '[]');
    return fileRows;
  }
  try {
    fileRows = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    if (!Array.isArray(fileRows)) fileRows = [];
  } catch {
    fileRows = [];
  }
  return fileRows;
}

function saveFile() {
  if (!fileRows) return;
  const tmp = FILE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(fileRows));
  fs.renameSync(tmp, FILE_PATH);
}

export function historyStatus() {
  return { configured: true, persistent: Boolean(pool), mode: pool ? 'postgres' : 'file' };
}

export async function ensureHistoryStore() {
  if (pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS execution_history (
      id BIGSERIAL PRIMARY KEY,
      transaction_id TEXT,
      idempotency_key TEXT,
      user_id UUID,
      request_id TEXT,
      event_type TEXT NOT NULL,
      status TEXT,
      decision TEXT,
      decision_code TEXT,
      accepted_legs INTEGER NOT NULL DEFAULT 0,
      total_legs INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS execution_history_user_idx ON execution_history(user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS execution_history_idempotency_idx ON execution_history(idempotency_key,created_at DESC);
    CREATE INDEX IF NOT EXISTS execution_history_created_idx ON execution_history(created_at DESC);`);
    return true;
  }
  loadFile();
  return true;
}

export async function recordExecutionHistory(event = {}) {
  if (pool) {
    await pool.query(
      `INSERT INTO execution_history(transaction_id,idempotency_key,user_id,request_id,event_type,status,decision,decision_code,accepted_legs,total_legs,payload)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        event.transactionId || null,
        event.idempotencyKey || null,
        event.userId || null,
        event.requestId || null,
        event.eventType || 'execution_event',
        event.status || null,
        event.decision || null,
        event.decisionCode || null,
        Number(event.acceptedLegs || 0),
        Number(event.totalLegs || 0),
        JSON.stringify(event.payload || {}),
      ]
    );
    return true;
  }
  const rows = loadFile();
  rows.unshift({
    id: rows.length + 1,
    transaction_id: event.transactionId || null,
    idempotency_key: event.idempotencyKey || null,
    user_id: event.userId || null,
    request_id: event.requestId || null,
    event_type: event.eventType || 'execution_event',
    status: event.status || null,
    decision: event.decision || null,
    decision_code: event.decisionCode || null,
    accepted_legs: Number(event.acceptedLegs || 0),
    total_legs: Number(event.totalLegs || 0),
    payload: event.payload || {},
    created_at: new Date().toISOString(),
  });
  if (rows.length > 2000) rows.length = 2000;
  saveFile();
  return true;
}

export async function listExecutionHistory({ userId = null, limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  if (pool) {
    const r = userId
      ? await pool.query(
          `SELECT id,transaction_id,idempotency_key,request_id,event_type,status,decision,decision_code,accepted_legs,total_legs,payload,created_at
           FROM execution_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
          [userId, safeLimit]
        )
      : await pool.query(
          `SELECT id,transaction_id,idempotency_key,request_id,event_type,status,decision,decision_code,accepted_legs,total_legs,payload,created_at
           FROM execution_history ORDER BY created_at DESC LIMIT $1`,
          [safeLimit]
        );
    return r.rows;
  }
  const rows = loadFile();
  const filtered = userId ? rows.filter((r) => r.user_id === userId) : rows;
  return filtered.slice(0, safeLimit);
}

export async function closeHistoryStore() {
  if (pool) await pool.end();
}
