import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_CONNECTION_STRING,
    process.env.RENDER_DATABASE_URL,
    process.env.DB_URL,
  ];
  for (const raw of candidates) {
    const v = String(raw || '').trim();
    if (/^postgres(?:ql)?:\/\//i.test(v)) return v;
  }
  return '';
}

const DATABASE_URL = resolveDatabaseUrl();
const TOKEN_SECRET = String(process.env.BOOKMAKER_TOKEN_ENCRYPTION_KEY || '').trim();
const DATA_DIR = process.env.DATA_DIR || './data';
const FILE_STORE_PATH = path.join(DATA_DIR, 'deck-pro-store.json');

let pool = null;
let schemaPromise = null;
let fileStore = null;

try {
  if (DATABASE_URL) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || 10),
    });
  }
} catch (error) {
  console.warn('Deck Pro DB configuration ignored:', error?.message || error);
  pool = null;
}

function requireDb() {
  if (!pool && !fileStoreReady()) {
    throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { code: 'DATABASE_NOT_CONFIGURED', status: 503 });
  }
}

function key() {
  if (!/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) {
    throw Object.assign(new Error('BOOKMAKER_TOKEN_ENCRYPTION_KEY must be 64 hex characters'), {
      code: 'TOKEN_KEY_NOT_CONFIGURED',
      status: 503,
    });
  }
  return Buffer.from(TOKEN_SECRET, 'hex');
}

function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptValue(ciphertext, iv, tag) {
  if (!ciphertext || !iv || !tag) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

function encryptToken(value) { return encryptValue(value); }
function decryptToken(row) { return decryptValue(row?.token_ciphertext, row?.token_iv, row?.token_tag); }
function encryptCredentials(value) { return encryptValue(JSON.stringify(value || {})); }
function decryptCredentials(row) {
  const raw = decryptValue(row?.credentials_ciphertext, row?.credentials_iv, row?.credentials_tag);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function hashSession(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function hashCode(username, code) {
  return crypto.createHash('sha256').update(`${String(username).trim().toLowerCase()}:${String(code)}`).digest('hex');
}
function hashSyncSecret(secret) { return crypto.createHash('sha256').update(String(secret)).digest('hex'); }

function uuid() { return crypto.randomUUID(); }

function fileStoreReady() {
  return Boolean(fileStore);
}

function loadFileStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_STORE_PATH)) {
    fileStore = { users: [], sessions: [], connections: [], events: [] };
    saveFileStore();
    return fileStore;
  }
  try {
    fileStore = JSON.parse(fs.readFileSync(FILE_STORE_PATH, 'utf8'));
    fileStore.users = fileStore.users || [];
    fileStore.sessions = fileStore.sessions || [];
    fileStore.connections = fileStore.connections || [];
    fileStore.events = fileStore.events || [];
  } catch {
    fileStore = { users: [], sessions: [], connections: [], events: [] };
    saveFileStore();
  }
  return fileStore;
}

function saveFileStore() {
  if (!fileStore) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE_STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(fileStore, null, 0));
  fs.renameSync(tmp, FILE_STORE_PATH);
}

function ensureFileBackend() {
  if (pool) return false;
  if (!fileStore) loadFileStore();
  return true;
}

async function ensureSchema() {
  if (pool) {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        const { fileURLToPath } = await import('url');
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const sql = await fs.promises.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(sql);
      })().catch((e) => { schemaPromise = null; throw e; });
    }
    return schemaPromise;
  }
  ensureFileBackend();
  return true;
}

export function dbStatus() {
  const canUseFile = /^[a-f0-9]{64}$/i.test(TOKEN_SECRET);
  return {
    configured: Boolean(pool) || canUseFile,
    mode: pool ? 'postgres' : (canUseFile ? 'file-encrypted' : 'none'),
    tokenVaultConfigured: canUseFile,
    databaseUrlPresent: Boolean(DATABASE_URL),
    missing: pool || canUseFile ? [] : ['DATABASE_URL (or POSTGRES_URL) must point to Postgres, or BOOKMAKER_TOKEN_ENCRYPTION_KEY for file store'],
  };
}

export async function closeDb() {
  if (pool) await pool.end();
}

export async function migrate() {
  await ensureSchema();
}

export async function createUser(username, code) {
  requireDb();
  await ensureSchema();
  if (!/^\d{4}$/.test(String(code))) {
    throw Object.assign(new Error('CODE_MUST_BE_4_DIGITS'), { code: 'CODE_MUST_BE_4_DIGITS', status: 400 });
  }
  if (pool) {
    const r = await pool.query(
      'INSERT INTO deck_users(username,code_hash) VALUES($1,$2) RETURNING id,username,created_at',
      [String(username).trim().toLowerCase(), hashCode(username, code)]
    );
    return r.rows[0];
  }
  const store = loadFileStore();
  const uname = String(username).trim().toLowerCase();
  if (store.users.some((u) => u.username === uname)) {
    throw Object.assign(new Error('USERNAME_TAKEN'), { code: 'USERNAME_TAKEN', status: 409 });
  }
  const row = { id: uuid(), username: uname, code_hash: hashCode(username, code), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.users.push(row);
  saveFileStore();
  return { id: row.id, username: row.username, created_at: row.created_at };
}

export async function ensureOwnerUser(ownerKey) {
  await ensureSchema();
  const username = 'owner_' + crypto.createHash('sha256').update(String(ownerKey)).digest('hex').slice(0, 24);
  if (pool) {
    const existing = await pool.query('SELECT id,username FROM deck_users WHERE username=$1', [username]);
    if (existing.rowCount) return existing.rows[0];
    const r = await pool.query(
      'INSERT INTO deck_users(username,code_hash) VALUES($1,$2) ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING id,username',
      [username, hashCode(username, crypto.randomBytes(8).toString('hex'))]
    );
    return r.rows[0];
  }
  const store = loadFileStore();
  let user = store.users.find((u) => u.username === username);
  if (user) return { id: user.id, username: user.username };
  user = { id: uuid(), username, code_hash: hashCode(username, crypto.randomBytes(8).toString('hex')), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.users.push(user);
  saveFileStore();
  return { id: user.id, username: user.username };
}

export async function authenticateUser(username, code, deviceId) {
  requireDb();
  await ensureSchema();
  if (pool) {
    const u = await pool.query('SELECT id,username,code_hash FROM deck_users WHERE username=$1', [String(username).trim().toLowerCase()]);
    if (!u.rowCount || u.rows[0].code_hash !== hashCode(username, code)) return null;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await pool.query(
      'INSERT INTO deck_sessions(user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,$4)',
      [u.rows[0].id, hashSession(token), String(deviceId || '').slice(0, 160), expires]
    );
    return { token, expiresAt: expires.toISOString(), user: { id: u.rows[0].id, username: u.rows[0].username } };
  }
  const store = loadFileStore();
  const uname = String(username).trim().toLowerCase();
  const user = store.users.find((u) => u.username === uname && u.code_hash === hashCode(username, code));
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  store.sessions.push({
    id: uuid(),
    user_id: user.id,
    token_hash: hashSession(token),
    device_id: String(deviceId || '').slice(0, 160),
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  });
  saveFileStore();
  return { token, expiresAt: expires.toISOString(), user: { id: user.id, username: user.username } };
}

export async function getSession(token) {
  requireDb();
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'SELECT s.user_id,s.expires_at,u.username FROM deck_sessions s JOIN deck_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [hashSession(token)]
    );
    if (!r.rowCount) return null;
    return { user_id: r.rows[0].user_id, username: r.rows[0].username, expires_at: r.rows[0].expires_at };
  }
  const store = loadFileStore();
  const th = hashSession(token);
  const now = Date.now();
  const s = store.sessions.find((x) => x.token_hash === th && new Date(x.expires_at).getTime() > now);
  if (!s) return null;
  const user = store.users.find((u) => u.id === s.user_id);
  if (!user) return null;
  return { user_id: s.user_id, username: user.username, expires_at: s.expires_at };
}

export async function saveBookmakerToken(userId, { bookmakerSlug, accessChannel, token, accountLabel = '' }) {
  requireDb();
  await ensureSchema();
  const enc = encryptToken(token);
  if (pool) {
    const r = await pool.query(
      `INSERT INTO bookmaker_connections(user_id,bookmaker_slug,access_channel,token_ciphertext,token_iv,token_tag,account_label,status,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,'configured',now())
       ON CONFLICT (user_id,bookmaker_slug,account_label) DO UPDATE SET
         access_channel=EXCLUDED.access_channel,token_ciphertext=EXCLUDED.token_ciphertext,token_iv=EXCLUDED.token_iv,token_tag=EXCLUDED.token_tag,status='configured',updated_at=now()
       RETURNING id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at`,
      [userId, String(bookmakerSlug).toLowerCase(), accessChannel, enc.ciphertext, enc.iv, enc.tag, accountLabel || '']
    );
    return r.rows[0];
  }
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const label = accountLabel || '';
  let row = store.connections.find((c) => c.user_id === userId && c.bookmaker_slug === slug && c.account_label === label);
  if (!row) {
    row = {
      id: uuid(),
      user_id: userId,
      bookmaker_slug: slug,
      access_channel: accessChannel,
      account_label: label,
      status: 'configured',
      auto_bet_enabled: false,
      last_sync_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.connections.push(row);
  }
  row.access_channel = accessChannel;
  row.token_ciphertext = enc.ciphertext;
  row.token_iv = enc.iv;
  row.token_tag = enc.tag;
  row.status = 'configured';
  row.updated_at = new Date().toISOString();
  saveFileStore();
  return {
    id: row.id,
    bookmaker_slug: row.bookmaker_slug,
    access_channel: row.access_channel,
    account_label: row.account_label,
    status: row.status,
    auto_bet_enabled: row.auto_bet_enabled,
    last_sync_at: row.last_sync_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function saveBookmakerCredentials(userId, { bookmakerSlug, accessChannel, credentials, accountLabel = '', syncSecret }) {
  requireDb();
  await ensureSchema();
  const enc = encryptCredentials(credentials);
  const secretHash = syncSecret ? hashSyncSecret(syncSecret) : null;
  if (pool) {
    const r = await pool.query(
      `INSERT INTO bookmaker_connections(user_id,bookmaker_slug,access_channel,credentials_ciphertext,credentials_iv,credentials_tag,sync_secret_hash,account_label,status,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,'configured',now())
       ON CONFLICT (user_id,bookmaker_slug,account_label) DO UPDATE SET
         access_channel=EXCLUDED.access_channel,credentials_ciphertext=EXCLUDED.credentials_ciphertext,credentials_iv=EXCLUDED.credentials_iv,credentials_tag=EXCLUDED.credentials_tag,
         sync_secret_hash=COALESCE(EXCLUDED.sync_secret_hash,bookmaker_connections.sync_secret_hash),status='configured',updated_at=now()
       RETURNING id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at`,
      [userId, String(bookmakerSlug).toLowerCase(), accessChannel, enc.ciphertext, enc.iv, enc.tag, secretHash, accountLabel || '']
    );
    return r.rows[0];
  }
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const label = accountLabel || '';
  let row = store.connections.find((c) => c.user_id === userId && c.bookmaker_slug === slug && c.account_label === label);
  if (!row) {
    row = {
      id: uuid(),
      user_id: userId,
      bookmaker_slug: slug,
      access_channel: accessChannel,
      account_label: label,
      status: 'configured',
      auto_bet_enabled: false,
      last_sync_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.connections.push(row);
  }
  row.access_channel = accessChannel;
  row.credentials_ciphertext = enc.ciphertext;
  row.credentials_iv = enc.iv;
  row.credentials_tag = enc.tag;
  if (secretHash) row.sync_secret_hash = secretHash;
  row.status = 'configured';
  row.updated_at = new Date().toISOString();
  saveFileStore();
  return {
    id: row.id,
    bookmaker_slug: row.bookmaker_slug,
    access_channel: row.access_channel,
    account_label: row.account_label,
    status: row.status,
    auto_bet_enabled: row.auto_bet_enabled,
    last_sync_at: row.last_sync_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listBookmakerConnections(userId) {
  requireDb();
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at FROM bookmaker_connections WHERE user_id=$1 ORDER BY bookmaker_slug,account_label',
      [userId]
    );
    return r.rows;
  }
  const store = loadFileStore();
  return store.connections
    .filter((c) => c.user_id === userId)
    .map((c) => ({
      id: c.id,
      bookmaker_slug: c.bookmaker_slug,
      access_channel: c.access_channel,
      account_label: c.account_label,
      status: c.status,
      auto_bet_enabled: !!c.auto_bet_enabled,
      last_sync_at: c.last_sync_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }))
    .sort((a, b) => String(a.bookmaker_slug).localeCompare(String(b.bookmaker_slug)));
}

export async function getBookmakerConnection(userId, connectionId) {
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,credentials_ciphertext,credentials_iv,credentials_tag,token_ciphertext,token_iv,token_tag,sync_secret_hash FROM bookmaker_connections WHERE user_id=$1 AND id=$2',
      [userId, connectionId]
    );
    if (!r.rowCount) return null;
    const row = r.rows[0];
    return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
  }
  const store = loadFileStore();
  const row = store.connections.find((c) => c.user_id === userId && c.id === connectionId);
  if (!row) return null;
  return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
}

export async function getBookmakerConnectionById(connectionId) {
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,credentials_ciphertext,credentials_iv,credentials_tag,token_ciphertext,token_iv,token_tag,sync_secret_hash FROM bookmaker_connections WHERE id=$1',
      [connectionId]
    );
    if (!r.rowCount) return null;
    const row = r.rows[0];
    return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
  }
  const store = loadFileStore();
  const row = store.connections.find((c) => c.id === connectionId);
  if (!row) return null;
  return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
}

export async function setBookmakerAutoBet(userId, connectionId, enabled) {
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'UPDATE bookmaker_connections SET auto_bet_enabled=$3,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id,bookmaker_slug,account_label,status,auto_bet_enabled,updated_at',
      [userId, connectionId, Boolean(enabled)]
    );
    return r.rows[0] || null;
  }
  const store = loadFileStore();
  const row = store.connections.find((c) => c.user_id === userId && c.id === connectionId);
  if (!row) return null;
  row.auto_bet_enabled = Boolean(enabled);
  row.updated_at = new Date().toISOString();
  saveFileStore();
  return {
    id: row.id,
    bookmaker_slug: row.bookmaker_slug,
    account_label: row.account_label,
    status: row.status,
    auto_bet_enabled: row.auto_bet_enabled,
    updated_at: row.updated_at,
  };
}

export async function deleteBookmakerConnection(userId, connectionId) {
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'DELETE FROM bookmaker_connections WHERE user_id=$1 AND id=$2 RETURNING id,bookmaker_slug,account_label',
      [userId, connectionId]
    );
    return r.rows[0] || null;
  }
  const store = loadFileStore();
  const idx = store.connections.findIndex((c) => c.user_id === userId && c.id === connectionId);
  if (idx < 0) return null;
  const [row] = store.connections.splice(idx, 1);
  saveFileStore();
  return { id: row.id, bookmaker_slug: row.bookmaker_slug, account_label: row.account_label };
}

export async function getBookmakerToken(userId, bookmakerSlug) {
  await ensureSchema();
  if (pool) {
    const r = await pool.query(
      'SELECT token_ciphertext,token_iv,token_tag,access_channel,status FROM bookmaker_connections WHERE user_id=$1 AND bookmaker_slug=$2 ORDER BY updated_at DESC LIMIT 1',
      [userId, String(bookmakerSlug).toLowerCase()]
    );
    if (!r.rowCount) return null;
    return { ...r.rows[0], token: decryptToken(r.rows[0]) };
  }
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const rows = store.connections.filter((c) => c.user_id === userId && c.bookmaker_slug === slug);
  rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const row = rows[0];
  if (!row) return null;
  return {
    token_ciphertext: row.token_ciphertext,
    token_iv: row.token_iv,
    token_tag: row.token_tag,
    access_channel: row.access_channel,
    status: row.status,
    token: decryptToken(row),
  };
}

export async function recordConnectionEvent(userId, bookmakerSlug, eventType, success, metadata = {}) {
  await ensureSchema();
  if (pool) {
    await pool.query(
      'INSERT INTO bookmaker_connection_events(user_id,bookmaker_slug,event_type,success,metadata) VALUES($1,$2,$3,$4,$5)',
      [userId, String(bookmakerSlug).toLowerCase(), eventType, Boolean(success), JSON.stringify(metadata)]
    );
    return;
  }
  const store = loadFileStore();
  store.events.push({
    id: store.events.length + 1,
    user_id: userId,
    bookmaker_slug: String(bookmakerSlug).toLowerCase(),
    event_type: eventType,
    success: Boolean(success),
    metadata,
    created_at: new Date().toISOString(),
  });
  if (store.events.length > 5000) store.events = store.events.slice(-4000);
  saveFileStore();
}

if (!pool && /^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) {
  try {
    loadFileStore();
    console.log('Deck Pro: using encrypted file store (DATA_DIR) — link DATABASE_URL for Postgres durability.');
  } catch (e) {
    console.warn('Deck Pro file store init failed:', e?.message || e);
  }
}
