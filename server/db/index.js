import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
function resolveDatabaseUrl(){
  const candidates=[
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_CONNECTION_STRING,
    process.env.RENDER_DATABASE_URL,
    process.env.DB_URL,
  ];
  for (const raw of candidates){
    const v=String(raw||'').trim();
    if (/^postgres(?:ql)?:\/\//i.test(v)) return v;
  }
  return '';
}
const DATABASE_URL = resolveDatabaseUrl();
const TOKEN_SECRET = String(process.env.BOOKMAKER_TOKEN_ENCRYPTION_KEY || '').trim();
let pool = null; let schemaPromise = null;
try {
  if (DATABASE_URL) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL==='false' ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX||10),
    });
  }
} catch(error){
  console.warn('Deck Pro DB configuration ignored:', error?.message||error);
  pool=null;
}
function requireDb(){
  if(!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'),{code:'DATABASE_NOT_CONFIGURED',status:503});
}
function key(){if(!/^[a-f0-9]{64}$/i.test(TOKEN_SECRET))throw Object.assign(new Error('BOOKMAKER_TOKEN_ENCRYPTION_KEY must be 64 hex characters'),{code:'TOKEN_KEY_NOT_CONFIGURED',status:503});return Buffer.from(TOKEN_SECRET,'hex')}
function encryptValue(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv),ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return{ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')}}
function decryptValue(ciphertext,iv,tag){if(!ciphertext||!iv||!tag)return null;const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64')),decipher.final()]).toString('utf8')}
function encryptToken(value){return encryptValue(value)} function decryptToken(row){return decryptValue(row?.token_ciphertext,row?.token_iv,row?.token_tag)} function encryptCredentials(value){return encryptValue(JSON.stringify(value||{}))} function decryptCredentials(row){const raw=decryptValue(row?.credentials_ciphertext,row?.credentials_iv,row?.credentials_tag);if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
function hashSession(token){return crypto.createHash('sha256').update(String(token)).digest('hex')} function hashCode(username,code){return crypto.createHash('sha256').update(`${String(username).trim().toLowerCase()}:${String(code)}`).digest('hex')} function hashSyncSecret(secret){return crypto.createHash('sha256').update(String(secret)).digest('hex')}
async function ensureSchema(){requireDb();if(!schemaPromise){schemaPromise=(async()=>{const fs=await import('fs/promises'),path=await import('path'),{fileURLToPath}=await import('url');const __dirname=path.dirname(fileURLToPath(import.meta.url));const sql=await fs.readFile(path.join(__dirname,'schema.sql'),'utf8');await pool.query(sql)})().catch(e=>{schemaPromise=null;throw e})}return schemaPromise}
export function dbStatus(){
  return{
    configured:Boolean(pool),
    tokenVaultConfigured:/^[a-f0-9]{64}$/i.test(TOKEN_SECRET),
    databaseUrlPresent:Boolean(DATABASE_URL),
    missing: pool ? [] : ['DATABASE_URL (or POSTGRES_URL) must point to Postgres'],
  };
}
export async function closeDb(){if(pool)await pool.end()}
export async function migrate(){await ensureSchema()}
export async function createUser(username,code){requireDb();if(!/^\d{4}$/.test(String(code)))throw Object.assign(new Error('CODE_MUST_BE_4_DIGITS'),{code:'CODE_MUST_BE_4_DIGITS',status:400});const r=await pool.query('INSERT INTO deck_users(username,code_hash) VALUES($1,$2) RETURNING id,username,created_at',[String(username).trim().toLowerCase(),hashCode(username,code)]);return r.rows[0]}
export async function ensureOwnerUser(ownerKey){await ensureSchema();const username='owner_'+crypto.createHash('sha256').update(String(ownerKey)).digest('hex').slice(0,24);const existing=await pool.query('SELECT id,username FROM deck_users WHERE username=$1',[username]);if(existing.rowCount)return existing.rows[0];const r=await pool.query('INSERT INTO deck_users(username,code_hash) VALUES($1,$2) ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING id,username',[username,hashCode(username,crypto.randomBytes(8).toString('hex'))]);return r.rows[0]}
export async function authenticateUser(username,code,deviceId){requireDb();await ensureSchema();const u=await pool.query('SELECT id,username,code_hash FROM deck_users WHERE username=$1',[String(username).trim().toLowerCase()]);if(!u.rowCount||u.rows[0].code_hash!==hashCode(username,code))return null;const token=crypto.randomBytes(32).toString('hex');const expires=new Date(Date.now()+30*24*3600*1000);await pool.query('INSERT INTO deck_sessions(user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,$4)',[u.rows[0].id,hashSession(token),String(deviceId||'').slice(0,160),expires]);return{token,expiresAt:expires.toISOString(),user:{id:u.rows[0].id,username:u.rows[0].username}}}
export async function getSession(token){requireDb();await ensureSchema();const r=await pool.query('SELECT s.user_id,s.expires_at,u.username FROM deck_sessions s JOIN deck_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hashSession(token)]);if(!r.rowCount)return null;return{user_id:r.rows[0].user_id,username:r.rows[0].username,expires_at:r.rows[0].expires_at}}
export async function saveBookmakerToken(userId,{bookmakerSlug,accessChannel,token,accountLabel=''}){requireDb();await ensureSchema();const enc=encryptToken(token);const r=await pool.query(`INSERT INTO bookmaker_connections(user_id,bookmaker_slug,access_channel,token_ciphertext,token_iv,token_tag,account_label,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,'configured',now()) ON CONFLICT (user_id,bookmaker_slug,account_label) DO UPDATE SET access_channel=EXCLUDED.access_channel,token_ciphertext=EXCLUDED.token_ciphertext,token_iv=EXCLUDED.token_iv,token_tag=EXCLUDED.token_tag,status='configured',updated_at=now() RETURNING id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at`,[userId,String(bookmakerSlug).toLowerCase(),accessChannel,enc.ciphertext,enc.iv,enc.tag,accountLabel||'']);return r.rows[0]}
export async function saveBookmakerCredentials(userId,{bookmakerSlug,accessChannel,credentials,accountLabel='',syncSecret}){requireDb();await ensureSchema();const enc=encryptCredentials(credentials);const secretHash=syncSecret?hashSyncSecret(syncSecret):null;const r=await pool.query(`INSERT INTO bookmaker_connections(user_id,bookmaker_slug,access_channel,credentials_ciphertext,credentials_iv,credentials_tag,sync_secret_hash,account_label,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'configured',now()) ON CONFLICT (user_id,bookmaker_slug,account_label) DO UPDATE SET access_channel=EXCLUDED.access_channel,credentials_ciphertext=EXCLUDED.credentials_ciphertext,credentials_iv=EXCLUDED.credentials_iv,credentials_tag=EXCLUDED.credentials_tag,sync_secret_hash=COALESCE(EXCLUDED.sync_secret_hash,bookmaker_connections.sync_secret_hash),status='configured',updated_at=now() RETURNING id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at`,[userId,String(bookmakerSlug).toLowerCase(),accessChannel,enc.ciphertext,enc.iv,enc.tag,secretHash,accountLabel||'']);return r.rows[0]}
export async function listBookmakerConnections(userId){requireDb();await ensureSchema();const r=await pool.query('SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,created_at,updated_at FROM bookmaker_connections WHERE user_id=$1 ORDER BY bookmaker_slug,account_label',[userId]);return r.rows}
export async function getBookmakerConnection(userId,connectionId){await ensureSchema();const r=await pool.query('SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,credentials_ciphertext,credentials_iv,credentials_tag,token_ciphertext,token_iv,token_tag,sync_secret_hash FROM bookmaker_connections WHERE user_id=$1 AND id=$2',[userId,connectionId]);if(!r.rowCount)return null;const row=r.rows[0];return{...row,credentials:decryptCredentials(row),token:decryptToken(row)}}
export async function getBookmakerConnectionById(connectionId){await ensureSchema();const r=await pool.query('SELECT id,bookmaker_slug,access_channel,account_label,status,auto_bet_enabled,last_sync_at,credentials_ciphertext,credentials_iv,credentials_tag,token_ciphertext,token_iv,token_tag,sync_secret_hash FROM bookmaker_connections WHERE id=$1',[connectionId]);if(!r.rowCount)return null;const row=r.rows[0];return{...row,credentials:decryptCredentials(row),token:decryptToken(row)}}
export async function setBookmakerAutoBet(userId,connectionId,enabled){await ensureSchema();const r=await pool.query('UPDATE bookmaker_connections SET auto_bet_enabled=$3,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id,bookmaker_slug,account_label,status,auto_bet_enabled,updated_at',[userId,connectionId,Boolean(enabled)]);return r.rows[0]||null}
export async function deleteBookmakerConnection(userId,connectionId){await ensureSchema();const r=await pool.query('DELETE FROM bookmaker_connections WHERE user_id=$1 AND id=$2 RETURNING id,bookmaker_slug,account_label',[userId,connectionId]);return r.rows[0]||null}
export async function getBookmakerToken(userId,bookmakerSlug){await ensureSchema();const r=await pool.query('SELECT token_ciphertext,token_iv,token_tag,access_channel,status FROM bookmaker_connections WHERE user_id=$1 AND bookmaker_slug=$2 ORDER BY updated_at DESC LIMIT 1',[userId,String(bookmakerSlug).toLowerCase()]);if(!r.rowCount)return null;return{...r.rows[0],token:decryptToken(r.rows[0])}}
export async function recordConnectionEvent(userId,bookmakerSlug,eventType,success,metadata={}){await ensureSchema();await pool.query('INSERT INTO bookmaker_connection_events(user_id,bookmaker_slug,event_type,success,metadata) VALUES($1,$2,$3,$4,$5)',[userId,String(bookmakerSlug).toLowerCase(),eventType,Boolean(success),JSON.stringify(metadata)])}
