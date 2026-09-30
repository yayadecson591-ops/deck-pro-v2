import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKEN_SECRET = String(process.env.BOOKMAKER_TOKEN_ENCRYPTION_KEY || '').trim();
const DATA_DIR = process.env.DATA_DIR || './data';
const FILE_STORE_PATH = path.join(DATA_DIR, 'deck-pro-store.json');
let fileStore = null;

function key() {
  if (!/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) {
    throw Object.assign(new Error('BOOKMAKER_TOKEN_ENCRYPTION_KEY must be 64 hex characters'), { code: 'TOKEN_KEY_NOT_CONFIGURED', status: 503 });
  }
  return Buffer.from(TOKEN_SECRET, 'hex');
}
function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
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
function requireDb() {
  if (!/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) {
    throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { code: 'DATABASE_NOT_CONFIGURED', status: 503 });
  }
  loadFileStore();
}
export function dbStatus() {
  const canUseFile = /^[a-f0-9]{64}$/i.test(TOKEN_SECRET);
  const hasUrl = ['DATABASE_URL','POSTGRES_URL','POSTGRES_CONNECTION_STRING','RENDER_DATABASE_URL','DB_URL'].some(k => /^postgres(?:ql)?:\/\//i.test(String(process.env[k]||'').trim()));
  return {
    configured: canUseFile,
    mode: canUseFile ? 'file-encrypted' : 'none',
    tokenVaultConfigured: canUseFile,
    databaseUrlPresent: hasUrl,
    missing: canUseFile ? [] : ['BOOKMAKER_TOKEN_ENCRYPTION_KEY for file store, or DATABASE_URL for Postgres'],
  };
}
export async function closeDb() {}
export async function migrate() { loadFileStore(); }
export async function createUser(username, code) {
  requireDb();
  if (!/^\d{4}$/.test(String(code))) throw Object.assign(new Error('CODE_MUST_BE_4_DIGITS'), { code: 'CODE_MUST_BE_4_DIGITS', status: 400 });
  const store = loadFileStore();
  const uname = String(username).trim().toLowerCase();
  if (store.users.some((u) => u.username === uname)) throw Object.assign(new Error('USERNAME_TAKEN'), { code: 'USERNAME_TAKEN', status: 409 });
  const row = { id: uuid(), username: uname, code_hash: hashCode(username, code), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.users.push(row);
  saveFileStore();
  return { id: row.id, username: row.username, created_at: row.created_at };
}
export async function ensureOwnerUser(ownerKey) {
  loadFileStore();
  const username = 'owner_' + crypto.createHash('sha256').update(String(ownerKey)).digest('hex').slice(0, 24);
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
  const store = loadFileStore();
  const uname = String(username).trim().toLowerCase();
  const user = store.users.find((u) => u.username === uname && u.code_hash === hashCode(username, code));
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  store.sessions.push({ id: uuid(), user_id: user.id, token_hash: hashSession(token), device_id: String(deviceId || '').slice(0, 160), expires_at: expires.toISOString(), created_at: new Date().toISOString() });
  saveFileStore();
  return { token, expiresAt: expires.toISOString(), user: { id: user.id, username: user.username } };
}
export async function getSession(token) {
  requireDb();
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
  const enc = encryptToken(token);
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const label = accountLabel || '';
  let row = store.connections.find((c) => c.user_id === userId && c.bookmaker_slug === slug && c.account_label === label);
  if (!row) {
    row = { id: uuid(), user_id: userId, bookmaker_slug: slug, access_channel: accessChannel, account_label: label, status: 'configured', auto_bet_enabled: false, last_sync_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    store.connections.push(row);
  }
  Object.assign(row, { access_channel: accessChannel, token_ciphertext: enc.ciphertext, token_iv: enc.iv, token_tag: enc.tag, status: 'configured', updated_at: new Date().toISOString() });
  saveFileStore();
  return { id: row.id, bookmaker_slug: row.bookmaker_slug, access_channel: row.access_channel, account_label: row.account_label, status: row.status, auto_bet_enabled: row.auto_bet_enabled, last_sync_at: row.last_sync_at, created_at: row.created_at, updated_at: row.updated_at };
}
export async function saveBookmakerCredentials(userId, { bookmakerSlug, accessChannel, credentials, accountLabel = '', syncSecret }) {
  requireDb();
  const enc = encryptCredentials(credentials);
  const secretHash = syncSecret ? hashSyncSecret(syncSecret) : null;
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const label = accountLabel || '';
  let row = store.connections.find((c) => c.user_id === userId && c.bookmaker_slug === slug && c.account_label === label);
  if (!row) {
    row = { id: uuid(), user_id: userId, bookmaker_slug: slug, access_channel: accessChannel, account_label: label, status: 'configured', auto_bet_enabled: false, last_sync_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    store.connections.push(row);
  }
  Object.assign(row, { access_channel: accessChannel, credentials_ciphertext: enc.ciphertext, credentials_iv: enc.iv, credentials_tag: enc.tag, status: 'configured', updated_at: new Date().toISOString() });
  if (secretHash) row.sync_secret_hash = secretHash;
  saveFileStore();
  return { id: row.id, bookmaker_slug: row.bookmaker_slug, access_channel: row.access_channel, account_label: row.account_label, status: row.status, auto_bet_enabled: row.auto_bet_enabled, last_sync_at: row.last_sync_at, created_at: row.created_at, updated_at: row.updated_at };
}
export async function listBookmakerConnections(userId) {
  requireDb();
  const store = loadFileStore();
  return store.connections.filter((c) => c.user_id === userId).map((c) => ({
    id: c.id, bookmaker_slug: c.bookmaker_slug, access_channel: c.access_channel, account_label: c.account_label,
    status: c.status, auto_bet_enabled: !!c.auto_bet_enabled, last_sync_at: c.last_sync_at, created_at: c.created_at, updated_at: c.updated_at,
  })).sort((a, b) => String(a.bookmaker_slug).localeCompare(String(b.bookmaker_slug)));
}
export async function getBookmakerConnection(userId, connectionId) {
  loadFileStore();
  const store = loadFileStore();
  const row = store.connections.find((c) => c.user_id === userId && c.id === connectionId);
  if (!row) return null;
  return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
}
export async function getBookmakerConnectionById(connectionId) {
  loadFileStore();
  const store = loadFileStore();
  const row = store.connections.find((c) => c.id === connectionId);
  if (!row) return null;
  return { ...row, credentials: decryptCredentials(row), token: decryptToken(row) };
}
export async function setBookmakerAutoBet(userId, connectionId, enabled) {
  loadFileStore();
  const store = loadFileStore();
  const row = store.connections.find((c) => c.user_id === userId && c.id === connectionId);
  if (!row) return null;
  row.auto_bet_enabled = Boolean(enabled);
  row.updated_at = new Date().toISOString();
  saveFileStore();
  return { id: row.id, bookmaker_slug: row.bookmaker_slug, account_label: row.account_label, status: row.status, auto_bet_enabled: row.auto_bet_enabled, updated_at: row.updated_at };
}
export async function deleteBookmakerConnection(userId, connectionId) {
  loadFileStore();
  const store = loadFileStore();
  const idx = store.connections.findIndex((c) => c.user_id === userId && c.id === connectionId);
  if (idx < 0) return null;
  const [row] = store.connections.splice(idx, 1);
  saveFileStore();
  return { id: row.id, bookmaker_slug: row.bookmaker_slug, account_label: row.account_label };
}
export async function getBookmakerToken(userId, bookmakerSlug) {
  loadFileStore();
  const store = loadFileStore();
  const slug = String(bookmakerSlug).toLowerCase();
  const rows = store.connections.filter((c) => c.user_id === userId && c.bookmaker_slug === slug);
  rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const row = rows[0];
  if (!row) return null;
  return { ...row, token: decryptToken(row) };
}
export async function recordConnectionEvent(userId, bookmakerSlug, eventType, success, metadata = {}) {
  loadFileStore();
  const store = loadFileStore();
  store.events.push({ id: store.events.length + 1, user_id: userId, bookmaker_slug: String(bookmakerSlug).toLowerCase(), event_type: eventType, success: Boolean(success), metadata, created_at: new Date().toISOString() });
  if (store.events.length > 5000) store.events = store.events.slice(-4000);
  saveFileStore();
}
if (/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) {
  try { loadFileStore(); console.log('Deck Pro: encrypted file store ready — link DATABASE_URL for Postgres durability.'); }
  catch (e) { console.warn('Deck Pro file store init failed:', e?.message || e); }
}
