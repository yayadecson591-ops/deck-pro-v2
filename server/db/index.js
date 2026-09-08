import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const TOKEN_SECRET = String(process.env.BOOKMAKER_TOKEN_ENCRYPTION_KEY || '').trim();

// Only create a database pool when Render provides a real PostgreSQL URL.
// This prevents a malformed value such as "base" from crashing the server at startup.
let pool = null;
try {
  if (/^postgres(?:ql)?:\/\//i.test(DATABASE_URL)) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || 10)
    });
  }
} catch (error) {
  console.warn('Deck Pro DB configuration ignored:', error?.message || error);
  pool = null;
}

function requireDb(){ if(!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'),{code:'DATABASE_NOT_CONFIGURED',status:503}); }
function key(){ if(!/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)) throw Object.assign(new Error('BOOKMAKER_TOKEN_ENCRYPTION_KEY must be 64 hex characters'),{code:'TOKEN_KEY_NOT_CONFIGURED',status:503}); return Buffer.from(TOKEN_SECRET,'hex'); }
function encryptToken(value){
  const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  return {ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
}
function decryptToken(row){
  if(!row?.token_ciphertext)return null;
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(row.token_iv,'base64'));
  decipher.setAuthTag(Buffer.from(row.token_tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(row.token_ciphertext,'base64')),decipher.final()]).toString('utf8');
}
function hashSession(token){return crypto.createHash('sha256').update(String(token)).digest('hex')}
function hashCode(username,code){return crypto.createHash('sha256').update(`${String(username).trim().toLowerCase()}:${String(code)}`).digest('hex')}

export function dbStatus(){return {configured:Boolean(pool),tokenVaultConfigured:/^[a-f0-9]{64}$/i.test(TOKEN_SECRET)}}
export async function closeDb(){if(pool)await pool.end()}
export async function migrate(){
  requireDb();
  const fs=await import('fs/promises');
  const path=await import('path');
  const schema=await fs.readFile(path.join(process.cwd(),'db','schema.sql'),'utf8');
  await pool.query(schema);
}
export async function createUser(username,code){
  requireDb(); if(!/^\d{4}$/.test(String(code))) throw Object.assign(new Error('CODE_MUST_BE_4_DIGITS'),{code:'CODE_MUST_BE_4_DIGITS',status:400});
  const r=await pool.query('INSERT INTO deck_users(username,code_hash) VALUES($1,$2) RETURNING id,username,created_at',[String(username).trim().toLowerCase(),hashCode(username,code)]); return r.rows[0];
}
export async function authenticateUser(username,code,deviceId){
  requireDb(); const u=await pool.query('SELECT id,username FROM deck_users WHERE username=$1 AND code_hash=$2',[String(username).trim().toLowerCase(),hashCode(username,code)]); if(!u.rowCount) return null;
  const raw=crypto.randomBytes(32).toString('base64url'); const ttl=Number(process.env.USER_SESSION_TTL_MS||2592000000); const expires=new Date(Date.now()+ttl);
  const s=await pool.query('INSERT INTO deck_sessions(user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,$4) RETURNING expires_at',[u.rows[0].id,hashSession(raw),String(deviceId||'unknown'),expires]);
  return {token:raw,expiresAt:s.rows[0].expires_at,user:{id:u.rows[0].id,username:u.rows[0].username}};
}
export async function getSession(raw){
  requireDb(); if(!raw)return null; const r=await pool.query('SELECT s.user_id,s.expires_at,u.username FROM deck_sessions s JOIN deck_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hashSession(raw)]); return r.rows[0]||null;
}
export async function saveBookmakerToken(userId,bookmakerSlug,channel,tokenValue,accountLabel=''){
  requireDb(); if(!tokenValue) throw Object.assign(new Error('BOOKMAKER_TOKEN_REQUIRED'),{code:'BOOKMAKER_TOKEN_REQUIRED',status:400}); const e=encryptToken(tokenValue);
  const r=await pool.query(`INSERT INTO bookmaker_connections(user_id,bookmaker_slug,access_channel,token_ciphertext,token_iv,token_tag,account_label,status) VALUES($1,$2,$3,$4,$5,$6,$7,'configured') ON CONFLICT(user_id,bookmaker_slug) DO UPDATE SET access_channel=EXCLUDED.access_channel,token_ciphertext=EXCLUDED.token_ciphertext,token_iv=EXCLUDED.token_iv,token_tag=EXCLUDED.token_tag,account_label=EXCLUDED.account_label,status='configured',updated_at=now() RETURNING id,bookmaker_slug,access_channel,account_label,status,updated_at`,[userId,String(bookmakerSlug).toLowerCase(),channel,e.ciphertext,e.iv,e.tag,String(accountLabel||'')]);
  return r.rows[0];
}
export async function listBookmakerConnections(userId){
  requireDb(); const r=await pool.query('SELECT bookmaker_slug,access_channel,account_label,status,created_at,updated_at FROM bookmaker_connections WHERE user_id=$1 ORDER BY bookmaker_slug',[userId]); return r.rows;
}
export async function getBookmakerToken(userId,bookmakerSlug){
  requireDb(); const r=await pool.query('SELECT token_ciphertext,token_iv,token_tag,access_channel,status FROM bookmaker_connections WHERE user_id=$1 AND bookmaker_slug=$2',[userId,String(bookmakerSlug).toLowerCase()]); if(!r.rowCount)return null; return {...r.rows[0],token:decryptToken(r.rows[0])};
}
export async function recordConnectionEvent(userId,bookmakerSlug,eventType,success,metadata={}){requireDb();await pool.query('INSERT INTO bookmaker_connection_events(user_id,bookmaker_slug,event_type,success,metadata) VALUES($1,$2,$3,$4,$5)',[userId,String(bookmakerSlug).toLowerCase(),eventType,Boolean(success),JSON.stringify(metadata)]);}
